"""
app/__init__.py – Flask application factory.

Using the app factory pattern keeps the app modular and easy to test.
"""

import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from backend/.env (if it exists)
load_dotenv()


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # ── Configuration ──────────────────────────────────────────────────────────
    app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")
    app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH", 10 * 1024 * 1024))
    app.config["UPLOAD_FOLDER"] = os.path.join(
        os.path.dirname(__file__), "..", os.getenv("UPLOAD_FOLDER", "uploads")
    )

    # Ensure the uploads directory exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # ── CORS ───────────────────────────────────────────────────────────────────
    # Allow requests from the React dev server (localhost:5173 is Vite's default)
    CORS(app, origins=["http://localhost:5173"])

    # ── Register Blueprints (route groups) ────────────────────────────────────
    from app.routes.analyze import analyze_bp
    app.register_blueprint(analyze_bp, url_prefix="/api")

    return app
