/**
 * src/services/api.js – API client for ErrorSnap AI.
 *
 * Communicates with the Flask backend:
 * - POST /api/analyze-error: Uploads error screenshot and triggers Gemma 4 analysis
 * - GET  /api/health: Verifies backend connectivity and Gemma 4 model status
 *
 * Configurable via Vite environment variable VITE_API_BASE_URL.
 * If unset, defaults to "" so Vite's dev server proxy (/api -> http://localhost:5000) handles it.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

/**
 * Custom error class with HTTP status code and user-friendly guidance.
 */
export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Check backend health and model readiness.
 *
 * @returns {Promise<{ status: string, service: string, model: string }>}
 */
export async function checkBackendHealth() {
  const url = `${API_BASE_URL}/api/health`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new ApiError(
        `Backend health check failed (${response.status} ${response.statusText})`,
        response.status
      );
    }

    return await response.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'Cannot connect to ErrorSnap backend. Please make sure the Flask server is running on http://127.0.0.1:5000.',
      0,
      err.message
    );
  }
}

/**
 * Send error text, screenshot, or combined payload to Flask /api/analyze-error.
 *
 * @param {Object} options
 * @param {string} [options.text] - Pasted error message or code
 * @param {File|null} [options.file] - Screenshot image file (PNG, JPG, JPEG, WEBP)
 * @param {'beginner' | 'fix'} [options.mode] - Analysis mode
 * @returns {Promise<Object>} Backend response with summary, explanation, steps, and fix
 */
export async function analyzeError({ text = '', file = null, mode = 'beginner' }) {
  const trimmedText = (text || '').trim();

  if (!trimmedText && !file) {
    throw new ApiError('Please enter an error message, paste code, or attach a screenshot.', 400);
  }

  if (trimmedText.length > 50000) {
    throw new ApiError('Pasted text is too long (maximum 50,000 characters).', 400);
  }

  if (file) {
    // Validate file type on client side for fast feedback
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['png', 'jpg', 'jpeg', 'webp'];

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      throw new ApiError(
        'Unsupported file format. Please upload a PNG, JPG, JPEG, or WEBP screenshot.',
        400
      );
    }

    // 10 MB limit check
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      throw new ApiError(
        `File size (${sizeMb} MB) exceeds the 10 MB limit. Please resize or crop the screenshot.`,
        413
      );
    }
  }

  const formData = new FormData();
  if (trimmedText) {
    formData.append('error_text', trimmedText);
  }
  if (file) {
    formData.append('screenshot', file);
  }
  formData.append('mode', mode);

  const url = `${API_BASE_URL}/api/analyze-error`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text || response.statusText };
      }
    }

    if (!response.ok) {
      const errorMessage = data?.error || `Request failed with status ${response.status}`;

      if (response.status === 422) {
        throw new ApiError(
          errorMessage ||
            'Gemini API key is not configured in backend/.env. Please set GEMINI_API_KEY to enable Gemma 4 analysis.',
          422,
          data
        );
      }

      if (response.status === 429) {
        throw new ApiError(
          'Gemma 4 rate limit reached. Please wait a moment before trying again.',
          429,
          data
        );
      }

      if (response.status === 413) {
        throw new ApiError(
          'Screenshot is too large for the backend (max 10 MB).',
          413,
          data
        );
      }

      throw new ApiError(errorMessage, response.status, data);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    // Fetch network errors (e.g. backend down or CORS failure)
    throw new ApiError(
      'Unable to reach the ErrorSnap backend. Ensure Flask is running on http://127.0.0.1:5000.',
      0,
      err.message
    );
  }
}

/**
 * Backward compatibility helper for screenshot-only analysis.
 *
 * @param {File} file - Screenshot image file
 * @param {'beginner' | 'fix'} mode - Analysis mode
 * @returns {Promise<Object>}
 */
export async function analyzeScreenshot(file, mode = 'beginner') {
  return analyzeError({ file, mode });
}
