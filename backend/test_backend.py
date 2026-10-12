"""
backend/test_backend.py – Automated Backend Test Suite for ErrorSnap AI.

Tests all requirements specified in Step 7:
1. GET  /api/health (Liveness, service name, and exact Gemma 4 model ID)
2. POST /api/analyze-error (Missing screenshot file)
3. POST /api/analyze-error (Unsupported file type, e.g. .txt)
4. POST /api/analyze-error (Invalid mode parameter)
5. POST /api/analyze-error (Oversized image > 10MB)
6. POST /api/analyze-error (Real screenshot in beginner mode)
7. POST /api/analyze-error (Real screenshot in fix mode)
"""

import io
import os
import sys
from PIL import Image, ImageDraw

# Add backend directory to sys.path so app imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.services import gemma_service


def create_sample_screenshot() -> io.BytesIO:
    """Generate an in-memory sample screenshot of a Python IndexError traceback."""
    img = Image.new("RGB", (700, 260), color=(24, 28, 38))
    draw = ImageDraw.Draw(img)

    lines = [
        ("Traceback (most recent call last):", (210, 215, 225)),
        ('  File "server.py", line 42, in get_item', (180, 190, 205)),
        ('    selected = items[index]', (180, 190, 205)),
        ('IndexError: list index out of range', (240, 80, 80)),
        ("", (200, 200, 200)),
        ("FATAL: Failed processing batch item #7", (250, 180, 50)),
    ]

    y = 20
    for text, color in lines:
        draw.text((24, y), text, fill=color)
        y += 36

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def run_tests():
    app = create_app()
    app.config["TESTING"] = True
    client = app.test_client()

    results = []

    print("=" * 65)
    print("ErrorSnap AI — Backend Test Suite (Step 7)")
    print("=" * 65)

    # ── Test 1: GET /api/health ───────────────────────────────────────────────
    print("\n[Test 1] Health Endpoint (GET /api/health)")
    res = client.get("/api/health")
    data = res.get_json()
    if res.status_code == 200 and data.get("status") == "ok":
        model_id = data.get("model")
        print(f"  PASS: Status code 200, status='ok', model='{model_id}'")
        if model_id == "gemma-4-26b-a4b-it":
            print(f"  PASS: Exact model ID matches 'gemma-4-26b-a4b-it'")
            results.append(("Health Endpoint & Gemma 4 Model ID", True))
        else:
            print(f"  FAIL: Expected model 'gemma-4-26b-a4b-it', got '{model_id}'")
            results.append(("Health Endpoint & Gemma 4 Model ID", False))
    else:
        print(f"  FAIL: Health check returned {res.status_code}: {data}")
        results.append(("Health Endpoint & Gemma 4 Model ID", False))

    # ── Test 2: Missing Input (Neither Text nor Screenshot) ───────────────────
    print("\n[Test 2] Missing Input (Neither Text nor Screenshot)")
    res = client.post("/api/analyze-error", data={"mode": "beginner"})
    data = res.get_json()
    if res.status_code == 400 and ("screenshot" in data.get("error", "").lower() or "provide" in data.get("error", "").lower()):
        print(f"  PASS: Status 400 returned with message: '{data.get('error')}'")
        results.append(("[LOCAL VALIDATION] Missing Input Rejection", True))
    else:
        print(f"  FAIL: Expected 400, got {res.status_code}: {data}")
        results.append(("[LOCAL VALIDATION] Missing Input Rejection", False))

    # ── Test 3: Unsupported File Type ─────────────────────────────────────────
    print("\n[Test 3] Unsupported File Type (POST /api/analyze-error with .txt)")
    fake_txt = (io.BytesIO(b"Traceback: NameError"), "error.txt")
    res = client.post(
        "/api/analyze-error",
        data={"screenshot": fake_txt, "mode": "beginner"},
        content_type="multipart/form-data",
    )
    data = res.get_json()
    if res.status_code == 400 and "not allowed" in data.get("error", "").lower():
        print(f"  PASS: Status 400 rejected .txt: '{data.get('error')}'")
        results.append(("[LOCAL VALIDATION] Unsupported File Type Rejection", True))
    else:
        print(f"  FAIL: Expected 400, got {res.status_code}: {data}")
        results.append(("[LOCAL VALIDATION] Unsupported File Type Rejection", False))

    # ── Test 4: Invalid Mode Parameter ────────────────────────────────────────
    print("\n[Test 4] Invalid Mode Parameter (POST /api/analyze-error with mode='invalid')")
    sample_img = create_sample_screenshot()
    res = client.post(
        "/api/analyze-error",
        data={"screenshot": (sample_img, "error.png"), "mode": "invalid_mode"},
        content_type="multipart/form-data",
    )
    data = res.get_json()
    if res.status_code == 400 and "invalid mode" in data.get("error", "").lower():
        print(f"  PASS: Status 400 rejected invalid mode: '{data.get('error')}'")
        results.append(("[LOCAL VALIDATION] Invalid Mode Rejection", True))
    else:
        print(f"  FAIL: Expected 400, got {res.status_code}: {data}")
        results.append(("[LOCAL VALIDATION] Invalid Mode Rejection", False))

    # ── Test 5: Oversized Image (>10 MB) ──────────────────────────────────────
    print("\n[Test 5] Oversized Image (>10 MB)")
    oversized_data = b"\x00" * (10 * 1024 * 1024 + 1024)
    oversized_buf = io.BytesIO(oversized_data)
    res = client.post(
        "/api/analyze-error",
        data={"screenshot": (oversized_buf, "huge.png"), "mode": "beginner"},
        content_type="multipart/form-data",
    )
    data = res.get_json()
    if res.status_code in (400, 413):
        print(f"  PASS: Oversized payload rejected with status {res.status_code}: '{data.get('error') if data else 'Payload Too Large'}'")
        results.append(("[LOCAL VALIDATION] Oversized Image Rejection", True))
    else:
        print(f"  FAIL: Expected 400 or 413, got {res.status_code}: {data}")
        results.append(("[LOCAL VALIDATION] Oversized Image Rejection", False))

    # ── Test 6: Oversized Text (>50,000 characters) ───────────────────────────
    print("\n[Test 6] Oversized Text (>50,000 chars)")
    huge_text = "A" * 50001
    res = client.post(
        "/api/analyze-error",
        data={"error_text": huge_text, "mode": "beginner"},
    )
    data = res.get_json()
    if res.status_code == 400 and "too long" in data.get("error", "").lower():
        print(f"  PASS: Status 400 rejected oversized text: '{data.get('error')}'")
        results.append(("[LOCAL VALIDATION] Oversized Text Rejection", True))
    else:
        print(f"  FAIL: Expected 400, got {res.status_code}: {data}")
        results.append(("[LOCAL VALIDATION] Oversized Text Rejection", False))

    # ── Test 7: Real Gemma 4 API – Screenshot Analysis (Beginner Mode) ────────
    print("\n[Test 7] [REAL GEMMA 4 API] Screenshot-Only Analysis (mode='beginner')")
    sample_img = create_sample_screenshot()
    res = client.post(
        "/api/analyze-error",
        data={"screenshot": (sample_img, "test_index_error.png"), "mode": "beginner"},
        content_type="multipart/form-data",
    )
    data = res.get_json() or {}

    if res.status_code == 200:
        print("  PASS: Status 200 OK from Gemma 4 API")
        has_summary = bool(data.get("error_summary"))
        has_explanation = bool(data.get("beginner_explanation"))
        has_cause = bool(data.get("likely_cause"))
        steps = data.get("troubleshooting_steps", [])
        has_3_steps = isinstance(steps, list) and len(steps) == 3

        print(f"    - Error Summary: {'[OK]' if has_summary else '[X]'} ({data.get('error_summary')})")
        print(f"    - Beginner Explanation: {'[OK]' if has_explanation else '[X]'}")
        print(f"    - Likely Cause: {'[OK]' if has_cause else '[X]'}")
        print(f"    - Exactly 3 Steps: {'[OK]' if has_3_steps else '[X]'} (count: {len(steps)})")

        passed = has_summary and has_explanation and has_cause and has_3_steps
        results.append(("[REAL GEMMA 4 API] Image-Only Analysis (Beginner Mode)", passed))
    elif res.status_code == 422:
        print(f"  NOTICE: Status 422 (API Key Missing / Placeholder): '{data.get('error')}'")
        results.append(("[REAL GEMMA 4 API] Image-Only Analysis (Beginner Mode)", False))
    else:
        print(f"  FAIL: Status {res.status_code}: {data.get('error')}")
        results.append(("[REAL GEMMA 4 API] Image-Only Analysis (Beginner Mode)", False))

    # ── Test 8: Real Gemma 4 API – Text-Only Analysis (Beginner Mode) ──────────
    print("\n[Test 8] [REAL GEMMA 4 API] Text-Only Analysis (mode='beginner')")
    sample_error_text = "ZeroDivisionError: division by zero in calculate_average(total=100, count=0) at line 14"
    res = client.post(
        "/api/analyze-error",
        data={"error_text": sample_error_text, "mode": "beginner"},
    )
    data = res.get_json() or {}

    if res.status_code == 200:
        print("  PASS: Status 200 OK from Gemma 4 API for text-only input")
        has_summary = bool(data.get("error_summary"))
        has_explanation = bool(data.get("beginner_explanation"))
        has_cause = bool(data.get("likely_cause"))
        steps = data.get("troubleshooting_steps", [])
        has_3_steps = isinstance(steps, list) and len(steps) == 3

        print(f"    - Error Summary: {'[OK]' if has_summary else '[X]'} ({data.get('error_summary')})")
        print(f"    - Beginner Explanation: {'[OK]' if has_explanation else '[X]'}")
        print(f"    - Likely Cause: {'[OK]' if has_cause else '[X]'}")
        print(f"    - Exactly 3 Steps: {'[OK]' if has_3_steps else '[X]'} (count: {len(steps)})")

        passed = has_summary and has_explanation and has_cause and has_3_steps
        results.append(("[REAL GEMMA 4 API] Text-Only Analysis (Beginner Mode)", passed))
    elif res.status_code == 422:
        print(f"  NOTICE: Status 422 (API Key Missing / Placeholder): '{data.get('error')}'")
        results.append(("[REAL GEMMA 4 API] Text-Only Analysis (Beginner Mode)", False))
    else:
        print(f"  FAIL: Status {res.status_code}: {data.get('error')}")
        results.append(("[REAL GEMMA 4 API] Text-Only Analysis (Beginner Mode)", False))

    # ── Test 9: Real Gemma 4 API – Combined Text + Image (Fix Mode) ───────────
    print("\n[Test 9] [REAL GEMMA 4 API] Combined Text + Image Analysis (mode='fix')")
    sample_img = create_sample_screenshot()
    combined_text = "Error occurs whenever index is out of bounds in get_item(items, index)"
    res = client.post(
        "/api/analyze-error",
        data={
            "screenshot": (sample_img, "test_combined.png"),
            "error_text": combined_text,
            "mode": "fix",
        },
        content_type="multipart/form-data",
    )
    data = res.get_json() or {}

    if res.status_code == 200:
        print("  PASS: Status 200 OK from Gemma 4 API for combined text+image input")
        has_summary = bool(data.get("error_summary"))
        has_explanation = bool(data.get("beginner_explanation"))
        has_cause = bool(data.get("likely_cause"))
        steps = data.get("troubleshooting_steps", [])
        has_3_steps = isinstance(steps, list) and len(steps) == 3
        has_fix = bool(data.get("suggested_fix"))
        has_verification = bool(data.get("verification_steps"))

        print(f"    - Error Summary: {'[OK]' if has_summary else '[X]'}")
        print(f"    - Suggested Fix: {'[OK]' if has_fix else '[X]'}")
        print(f"    - Verification Steps: {'[OK]' if has_verification else '[X]'}")

        passed = has_summary and has_3_steps and has_fix and has_verification
        results.append(("[REAL GEMMA 4 API] Combined Text+Image Analysis (Fix Mode)", passed))
    elif res.status_code == 422:
        print(f"  NOTICE: Status 422 (API Key Missing / Placeholder): '{data.get('error')}'")
        results.append(("[REAL GEMMA 4 API] Combined Text+Image Analysis (Fix Mode)", False))
    else:
        print(f"  FAIL: Status {res.status_code}: {data.get('error')}")
        results.append(("[REAL GEMMA 4 API] Combined Text+Image Analysis (Fix Mode)", False))

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 65)
    print("Test Summary:")
    passed_count = sum(1 for _, p in results if p)
    for name, p in results:
        print(f"  [{'PASS' if p else 'FAIL'}] {name}")
    print(f"\nTotal: {passed_count}/{len(results)} tests passed.")
    print("=" * 65)
    return passed_count == len(results)


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
