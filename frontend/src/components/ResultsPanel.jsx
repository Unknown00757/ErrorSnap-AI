import React, { useState } from 'react';

/**
 * Helper to split text containing markdown code blocks (```lang ... ```)
 * into text parts and code blocks.
 */
function parseCodeBlocks(text) {
  if (!text) return [];

  const codeRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index).trim(),
      });
    }

    parts.push({
      type: 'code',
      lang: match[1] || 'code',
      content: match[2].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) {
      parts.push({ type: 'text', content: remaining });
    }
  }

  // If no markdown blocks were found, check if the whole string looks like code
  if (parts.length === 0 && text.trim().length > 0) {
    parts.push({ type: 'text', content: text.trim() });
  }

  return parts;
}

/**
 * Interactive Code Snippet with Copy button.
 */
function CodeBlock({ code, lang = 'code' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-snippet-box">
      <div className="code-snippet-header">
        <span className="code-lang-tag">{lang}</span>
        <button
          type="button"
          className="btn-copy-code"
          onClick={handleCopy}
          aria-label={`Copy ${lang} code snippet`}
        >
          {copied ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="copy-icon">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="copy-icon">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy Code
            </>
          )}
        </button>
      </div>
      <pre className="code-snippet-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Display backend analysis results.
 */
export default function ResultsPanel({
  result,
  onSwitchToFix,
  onReset,
  currentMode,
  isLoadingFix = false,
}) {
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedStep, setCopiedStep] = useState(null);

  if (!result) return null;

  const {
    error_summary,
    beginner_explanation,
    likely_cause,
    troubleshooting_steps = [],
    suggested_fix,
    verification_steps,
    mode = currentMode,
  } = result;

  const isFixMode = mode === 'fix' || !!suggested_fix;

  const handleCopyAll = () => {
    let report = `=== ErrorSnap AI Analysis ===\n\n`;
    report += `Summary: ${error_summary || 'N/A'}\n\n`;
    report += `Beginner Explanation:\n${beginner_explanation || 'N/A'}\n\n`;
    report += `Likely Cause:\n${likely_cause || 'N/A'}\n\n`;
    report += `Troubleshooting Steps:\n`;
    troubleshooting_steps.forEach((step, idx) => {
      report += `${idx + 1}. ${step}\n`;
    });
    if (suggested_fix) {
      report += `\nSuggested Fix:\n${suggested_fix}\n`;
    }
    if (verification_steps) {
      report += `\nVerification Steps:\n${verification_steps}\n`;
    }

    navigator.clipboard.writeText(report);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  const handleCopySingleStep = (stepText, idx) => {
    navigator.clipboard.writeText(stepText);
    setCopiedStep(idx);
    setTimeout(() => setCopiedStep(null), 1800);
  };

  const fixParts = suggested_fix ? parseCodeBlocks(suggested_fix) : [];

  return (
    <div className="results-panel" role="region" aria-label="Error analysis results">
      {/* Results Header / Actions */}
      <div className="results-top-bar">
        <div className="results-mode-badge-wrap">
          <span className={`results-mode-badge mode-badge-${mode}`}>
            {isFixMode ? 'Show Me the Fix Mode' : 'Beginner Friendly Mode'}
          </span>
          <span className="results-timestamp">Gemma 4 Verified</span>
        </div>

        <div className="results-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleCopyAll}
            aria-label="Copy entire analysis report to clipboard"
          >
            {copiedFull ? '✓ Copied Report' : 'Copy Full Report'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onReset}
            aria-label="Analyze another error screenshot"
          >
            Analyze Another
          </button>
        </div>
      </div>

      {/* 1. Error Summary */}
      <section className="result-card error-summary-card">
        <div className="card-header">
          <div className="card-icon-pill icon-error" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="card-title">Error Summary</h2>
        </div>
        <p className="summary-text">{error_summary || 'No summary available.'}</p>
      </section>

      {/* 2. Beginner Explanation */}
      <section className="result-card explanation-card">
        <div className="card-header">
          <div className="card-icon-pill icon-idea" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
              <path d="M9 21h6" />
            </svg>
          </div>
          <h2 className="card-title">What Happened (Plain English)</h2>
        </div>
        <p className="explanation-text">
          {beginner_explanation || 'No explanation generated.'}
        </p>
      </section>

      {/* 3. Likely Cause */}
      <section className="result-card cause-card">
        <div className="card-header">
          <div className="card-icon-pill icon-cause" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h2 className="card-title">Likely Cause</h2>
        </div>
        <p className="cause-text">{likely_cause || 'Cause not specified.'}</p>
      </section>

      {/* 4. Troubleshooting Steps */}
      <section className="result-card steps-card">
        <div className="card-header">
          <div className="card-icon-pill icon-steps" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <h2 className="card-title">Troubleshooting Steps</h2>
        </div>

        <ol className="steps-list">
          {troubleshooting_steps.map((step, idx) => (
            <li key={idx} className="step-item">
              <span className="step-number" aria-hidden="true">
                {idx + 1}
              </span>
              <div className="step-content">
                <p className="step-text">{step}</p>
              </div>
              <button
                type="button"
                className="btn-copy-step"
                onClick={() => handleCopySingleStep(step, idx)}
                title="Copy step"
                aria-label={`Copy step ${idx + 1}`}
              >
                {copiedStep === idx ? '✓ Copied' : 'Copy'}
              </button>
            </li>
          ))}
        </ol>
      </section>

      {/* 5. Suggested Fix & Corrected Code (if available) */}
      {isFixMode && suggested_fix && (
        <section className="result-card fix-card" id="suggested-fix-section">
          <div className="card-header">
            <div className="card-icon-pill icon-fix" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
                <line x1="14" y1="4" x2="10" y2="20" />
              </svg>
            </div>
            <h2 className="card-title">Suggested Fix &amp; Corrected Code</h2>
          </div>

          <div className="fix-content">
            {fixParts.map((part, idx) => {
              if (part.type === 'code') {
                return <CodeBlock key={idx} code={part.content} lang={part.lang} />;
              }
              return (
                <p key={idx} className="fix-text">
                  {part.content}
                </p>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. Verification Steps (if available) */}
      {isFixMode && verification_steps && (
        <section className="result-card verification-card">
          <div className="card-header">
            <div className="card-icon-pill icon-verify" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="card-title">Verification Steps</h2>
          </div>
          <p className="verification-text">{verification_steps}</p>
        </section>
      )}

      {/* Switch to Fix mode banner if in beginner mode */}
      {!isFixMode && onSwitchToFix && (
        <div className="switch-to-fix-banner">
          <div className="switch-banner-text">
            <h4>Need the exact code or config fix?</h4>
            <p>Switch to "Show Me the Fix" mode to get corrected code and verification steps.</p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSwitchToFix}
            disabled={isLoadingFix}
          >
            {isLoadingFix ? 'Loading Fix...' : 'Show Me the Fix →'}
          </button>
        </div>
      )}
    </div>
  );
}
