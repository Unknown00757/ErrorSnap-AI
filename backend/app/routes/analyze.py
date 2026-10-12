"""
app/routes/analyze.py – API endpoints for screenshot analysis.

Endpoints:
    GET  /api/health             – Liveness check
    POST /api/analyze-error      – PRIMARY: upload screenshot, choose mode, get AI analysis
    POST /api/analyze            – Legacy endpoint (kept for frontend compatibility)
    POST /api/analyze/fix        – Legacy endpoint (kept for frontend compatibility)
"""

import os
import logging
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app.services import gemma_service

logger = logging.getLogger(__name__)

# Blueprint groups all /api routes together
analyze_bp = Blueprint("analyze", __name__)

# Allowed image formats for uploads
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}

# Max upload size guard (belt-and-suspenders on top of Flask's MAX_CONTENT_LENGTH)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


# ── Helpers ───────────────────────────────────────────────────────────────────

def allowed_file(filename: str) -> bool:
    """Return True if the file extension is in the allowed set."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_uploaded_file(file) -> tuple[str, str]:
    """
    Validate and save an uploaded file to the uploads folder.
    Returns (absolute_path, filename).
    Raises ValueError with a user-friendly message on bad input.
    """
    if not file or file.filename == "":
        raise ValueError("No file selected. Please choose an image to upload.")

    if not allowed_file(file.filename):
        raise ValueError(
            f"File type not allowed. Please upload one of: "
            f"{', '.join(sorted(ALLOWED_EXTENSIONS)).upper()}"
        )

    filename = secure_filename(file.filename)
    upload_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    file.save(upload_path)

    # Double-check size after saving
    if os.path.getsize(upload_path) > MAX_UPLOAD_BYTES:
        os.remove(upload_path)
        raise ValueError("File is too large. Maximum size is 10 MB.")

    return upload_path, filename


def make_error(message: str, status: int = 400):
    """Return a JSON error response."""
    return jsonify({"error": message}), status


# ── GET /api/health ───────────────────────────────────────────────────────────

@analyze_bp.route("/health", methods=["GET"])
def health_check():
    """
    Liveness check — confirms the Flask server is running.

    Returns:
        { "status": "ok", "service": "ErrorSnap AI backend", "model": "gemma-4-4b-it" }
    """
    return jsonify({
        "status": "ok",
        "service": "ErrorSnap AI backend",
        "model": gemma_service.GEMMA_MODEL,
    }), 200


# ── POST /api/analyze-error ───────────────────────────────────────────────────

@analyze_bp.route("/analyze-error", methods=["POST"])
def analyze_error():
    """
    PRIMARY endpoint — upload a screenshot and receive a Gemma 4 AI analysis.

    Request: multipart/form-data
        screenshot  (file)    – The error screenshot image
        mode        (string)  – "beginner" (default) or "fix"

    Beginner mode returns:
    {
        "mode": "beginner",
        "error_summary": "...",
        "beginner_explanation": "...",
        "likely_cause": "...",
        "troubleshooting_steps": ["...", "...", "..."]
    }

    Fix mode additionally includes:
    {
        ...all beginner fields...,
        "suggested_fix": "...",
        "verification_steps": "..."
    }

    Error responses:
        400 – missing/invalid file or bad mode
        413 – file too large
        422 – API key not configured
        429 – rate limit hit
        500 – unexpected server error
    """
    # ── Validate mode parameter ───────────────────────────────────────────────
    mode = request.form.get("mode", "beginner").strip().lower()
    if mode not in ("beginner", "fix"):
        return make_error("Invalid mode. Use 'beginner' or 'fix'.", 400)

    # ── Read optional error text ──────────────────────────────────────────────
    error_text = request.form.get("error_text", "").strip()
    if len(error_text) > 50000:
        return make_error("Text is too long. Maximum allowed length is 50,000 characters.", 400)

    # ── Check for optional screenshot file ────────────────────────────────────
    screenshot_file = request.files.get("screenshot")
    if screenshot_file and screenshot_file.filename == "":
        screenshot_file = None

    # Reject if neither text nor an image was provided
    if not error_text and not screenshot_file:
        return make_error(
            "Please provide an error message, pasted code, or an error screenshot.",
            400,
        )

    upload_path = None
    filename = None
    if screenshot_file:
        try:
            upload_path, filename = save_uploaded_file(screenshot_file)
        except ValueError as e:
            return make_error(str(e), 400)

    # ── Call Gemma 4 ──────────────────────────────────────────────────────────
    try:
        result = gemma_service.analyze_error(
            image_path=upload_path,
            error_text=error_text or None,
            mode=mode,
        )
        if filename:
            result["filename"] = filename  # Return filename so frontend can reference it
        return jsonify(result), 200

    except EnvironmentError as e:
        # API key not configured
        logger.error("API key not configured: %s", e)
        return make_error(str(e), 422)

    except ValueError as e:
        # Bad image or unparseable response
        logger.warning("Value error during analysis: %s", e)
        return make_error(str(e), 400)

    except RuntimeError as e:
        error_str = str(e)
        if "rate limit" in error_str.lower() or "quota" in error_str.lower():
            return make_error(error_str, 429)
        logger.error("Runtime error during Gemma 4 call: %s", e)
        return make_error(error_str, 500)

    except Exception as e:
        logger.exception("Unexpected error in analyze_error endpoint")
        return make_error(
            "An unexpected error occurred. Please try again.", 500
        )


# ── POST /api/analyze (legacy — kept for frontend compatibility) ──────────────

@analyze_bp.route("/analyze", methods=["POST"])
def analyze_screenshot():
    """
    Legacy endpoint — proxies to /api/analyze-error in beginner mode.
    Kept so the existing React frontend continues to work without changes.
    """
    if "screenshot" not in request.files:
        return make_error("No screenshot file provided.", 400)

    try:
        upload_path, filename = save_uploaded_file(request.files["screenshot"])
    except ValueError as e:
        return make_error(str(e), 400)

    try:
        result = gemma_service.analyze_error(upload_path, mode="beginner")
        # Map to the shape the existing frontend expects
        return jsonify({
            "explanation": result.get("beginner_explanation", ""),
            "steps": result.get("troubleshooting_steps", []),
            "error_summary": result.get("error_summary", ""),
            "likely_cause": result.get("likely_cause", ""),
            "filename": filename,
        }), 200

    except EnvironmentError as e:
        return make_error(str(e), 422)
    except (ValueError, RuntimeError) as e:
        return make_error(str(e), 500)
    except Exception:
        logger.exception("Unexpected error in legacy analyze endpoint")
        return make_error("An unexpected error occurred.", 500)


# ── POST /api/analyze/fix (legacy — kept for frontend compatibility) ──────────

@analyze_bp.route("/analyze/fix", methods=["POST"])
def get_fix():
    """
    Legacy endpoint — re-analyzes a previously uploaded screenshot in fix mode.
    Kept so the existing React frontend continues to work without changes.
    """
    data = request.get_json()

    if not data or "filename" not in data:
        return make_error("Missing 'filename' in request body.", 400)

    filename = secure_filename(data["filename"])
    upload_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)

    if not os.path.exists(upload_path):
        return make_error("Screenshot not found. Please upload again.", 404)

    try:
        result = gemma_service.analyze_error(upload_path, mode="fix")
        return jsonify({
            "fix": result.get("suggested_fix", ""),
            "verification_steps": result.get("verification_steps", ""),
        }), 200

    except EnvironmentError as e:
        return make_error(str(e), 422)
    except (ValueError, RuntimeError) as e:
        return make_error(str(e), 500)
    except Exception:
        logger.exception("Unexpected error in legacy fix endpoint")
        return make_error("An unexpected error occurred.", 500)
