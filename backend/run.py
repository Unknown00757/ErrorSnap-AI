"""
run.py – Entry point for the ErrorSnap AI Flask backend.

Usage:
    python run.py

The Flask development server will start on http://localhost:5000
"""

from app import create_app

app = create_app()

if __name__ == "__main__":
    # debug=True enables auto-reload on code changes (development only)
    app.run(debug=True, host="0.0.0.0", port=5000)
