import React from 'react';

/**
 * Friendly error alert component.
 */
export default function ErrorMessage({ error, onDismiss, onRetry }) {
  if (!error) return null;

  const isString = typeof error === 'string';
  const message = isString ? error : error?.message || 'An unexpected error occurred.';
  const status = !isString ? error?.status : null;

  const isConfigError = status === 422 || message.toLowerCase().includes('api key');
  const isNetworkError = status === 0 || message.toLowerCase().includes('connect') || message.toLowerCase().includes('backend');
  const isRateLimit = status === 429 || message.toLowerCase().includes('rate limit');

  return (
    <div className="error-alert" role="alert">
      <div className="error-alert-content">
        <div className="error-icon-box" aria-hidden="true">
          {isConfigError ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="alert-icon">
              <path d="M21 2l-2 2m-1-1l2 2" />
              <path d="M11 2a9 9 0 0 0-9 9 9 9 0 0 0 9 9 9 9 0 0 0 9-9" />
              <path d="M12 7v5l3 3" />
            </svg>
          ) : isNetworkError ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="alert-icon">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="alert-icon">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </div>

        <div className="error-text">
          <h4 className="error-heading">
            {isConfigError
              ? 'Gemini API Key Required'
              : isNetworkError
              ? 'Backend Server Not Reachable'
              : isRateLimit
              ? 'Gemma 4 Rate Limit Reached'
              : 'Analysis Error'}
          </h4>
          <p className="error-message-body">{message}</p>

          {isConfigError && (
            <div className="error-hint-box">
              <p className="hint-title">How to fix this:</p>
              <ol className="hint-steps">
                <li>Open <code>backend/.env</code> in your editor.</li>
                <li>Set <code>GEMINI_API_KEY=your_key_here</code> (get one at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>).</li>
                <li>Restart the Flask backend (<code>python run.py</code>).</li>
              </ol>
            </div>
          )}

          {isNetworkError && (
            <div className="error-hint-box">
              <p className="hint-title">Troubleshooting connection:</p>
              <p className="hint-desc">
                Ensure the Flask backend is running on <code>http://127.0.0.1:5000</code>.
                In a terminal, run: <code>cd backend &amp;&amp; python run.py</code>.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="error-actions">
        {onRetry && (
          <button type="button" className="btn btn-sm btn-secondary" onClick={onRetry}>
            Try Again
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={onDismiss}
            aria-label="Dismiss error notification"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
