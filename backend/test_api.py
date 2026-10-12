"""
test_api.py – Test script for the ErrorSnap AI backend.

Run from the backend/ folder with the venv active:
    venv\Scripts\python.exe test_api.py

Tests:
    1. GET  /api/health         – confirms server is running
    2. POST /api/analyze-error  – sends a test screenshot (beginner mode)
    3. POST /api/analyze-error  – sends a test screenshot (fix mode)
"""

import json
import os
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:5000"
TEST_IMAGE_PATH = "uploads/test_error.png"


# ── 1. Create a test screenshot ────────────────────────────────────────────────
def create_test_screenshot():
    """Generate a small PNG containing a Python KeyError traceback."""
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (800, 320), color=(30, 30, 30))
    draw = ImageDraw.Draw(img)

    lines = [
        ("Traceback (most recent call last):", (200, 200, 200)),
        ('  File "app.py", line 42, in <module>', (200, 200, 200)),
        ('    result = data["user"]["profile"]["age"]', (200, 200, 200)),
        ('KeyError: "profile"', (220, 80, 80)),
        ("", (200, 200, 200)),
        ("Process finished with exit code 1", (180, 180, 60)),
    ]

    y = 20
    for text, color in lines:
        draw.text((20, y), text, fill=color)
        y += 42

    os.makedirs("uploads", exist_ok=True)
    img.save(TEST_IMAGE_PATH)
    print(f"[CREATE] Test screenshot saved: {TEST_IMAGE_PATH} "
          f"({os.path.getsize(TEST_IMAGE_PATH)} bytes)")


# ── 2. Health check ────────────────────────────────────────────────────────────
def test_health():
    print("\n--- Test 1: GET /api/health ---")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/health") as r:
            data = json.loads(r.read())
            print(f"[PASS] Status: {data['status']}  Model: {data['model']}")
            return True
    except Exception as e:
        print(f"[FAIL] {e}")
        return False


# ── 3. Analyze endpoint ────────────────────────────────────────────────────────
def test_analyze(mode):
    print(f"\n--- Test 2: POST /api/analyze-error (mode={mode}) ---")

    with open(TEST_IMAGE_PATH, "rb") as f:
        image_data = f.read()

    boundary = "----ErrorSnapTestBoundary"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="mode"\r\n\r\n'
        f"{mode}\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="screenshot"; filename="test_error.png"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode() + image_data + f"\r\n--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        f"{BASE_URL}/api/analyze-error",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.loads(r.read())
            print("[PASS] Gemma 4 responded successfully!")
            print(json.dumps(data, indent=2))
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"[FAIL] HTTP {e.code}: {body}")
        return False
    except Exception as e:
        print(f"[FAIL] {e}")
        return False


# ── Main ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("ErrorSnap AI — Backend Integration Test")
    print("=" * 60)

    create_test_screenshot()

    results = []
    results.append(test_health())
    results.append(test_analyze("beginner"))
    results.append(test_analyze("fix"))

    print("\n" + "=" * 60)
    passed = sum(results)
    print(f"Results: {passed}/{len(results)} tests passed")
    if passed == len(results):
        print("All tests passed! Backend is working correctly.")
    else:
        print("Some tests failed. Check the output above.")
