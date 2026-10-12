import React, { useEffect, useState } from 'react';

const LOADING_MESSAGES = [
  'Uploading error screenshot...',
  'Extracting traceback and error messages...',
  'Gemma 4 is inspecting root causes...',
  'Translating technical error into plain English...',
  'Compiling targeted troubleshooting steps...',
];

/**
 * Loading state component shown during Gemma 4 analysis.
 */
export default function LoadingState({ mode = 'beginner' }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2400);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="loading-panel"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="scanner-container" aria-hidden="true">
        <div className="radar-glow" />
        <div className="scanner-line" />
        <div className="loading-spinner">
          <svg className="spinner-svg" viewBox="0 0 50 50">
            <circle
              className="spinner-path-bg"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              strokeWidth="4"
            />
            <circle
              className="spinner-path"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              strokeWidth="4"
            />
          </svg>
        </div>
      </div>

      <div className="loading-text-group">
        <h3 className="loading-title">
          {mode === 'fix' ? 'Diagnosing & Generating Code Fix...' : 'Analyzing Error Screenshot...'}
        </h3>
        <p className="loading-dynamic-msg">{LOADING_MESSAGES[messageIndex]}</p>
        <span className="loading-model-pill">Powered by Gemma 4 via Google Gemini API</span>
      </div>
    </div>
  );
}
