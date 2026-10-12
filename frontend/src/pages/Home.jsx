import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import ErrorComposer from '../components/ErrorComposer';
import ModeSelector from '../components/ModeSelector';
import LoadingState from '../components/LoadingState';
import ResultsPanel from '../components/ResultsPanel';
import ErrorMessage from '../components/ErrorMessage';
import { analyzeError, checkBackendHealth, ApiError } from '../services/api';

/**
 * Home page for ErrorSnap AI.
 * Coordinates error text/code input, screenshot attachments, analysis modes,
 * backend submission, and results presentation.
 */
export default function Home() {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mode, setMode] = useState('beginner'); // 'beginner' | 'fix'

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFix, setIsLoadingFix] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
  const [backendModel, setBackendModel] = useState('gemma-4-26b-a4b-it');

  // Verify backend connectivity on initial mount
  useEffect(() => {
    let isMounted = true;

    async function probeBackend() {
      try {
        const data = await checkBackendHealth();
        if (isMounted) {
          setBackendStatus('online');
          if (data.model) setBackendModel(data.model);
        }
      } catch {
        if (isMounted) {
          setBackendStatus('offline');
        }
      }
    }

    probeBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = useCallback((selectedFile) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setError(null);
    setResult(null); // Clear previous results when new file is selected
  }, [previewUrl]);

  const handleRemoveFile = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setResult(null);
  }, [previewUrl]);

  const handleAnalyze = async (overrideMode = null) => {
    const activeMode = overrideMode || mode;
    const cleanText = (text || '').trim();

    if (!cleanText && !file) {
      setError('Please paste code, enter an error message, or attach a screenshot.');
      return;
    }

    setError(null);
    if (overrideMode === 'fix') {
      setIsLoadingFix(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await analyzeError({ text: cleanText, file, mode: activeMode });
      setResult(data);
      if (overrideMode) {
        setMode(overrideMode);
      }
      // Re-confirm backend is online
      setBackendStatus('online');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err);
      } else {
        setError(err?.message || 'Failed to analyze error.');
      }
      if (err.status === 0) {
        setBackendStatus('offline');
      }
    } finally {
      setIsLoading(false);
      setIsLoadingFix(false);
    }
  };

  const handleSwitchToFix = () => {
    handleAnalyze('fix');
  };

  const handleReset = () => {
    handleRemoveFile();
    setText('');
    setError(null);
    setResult(null);
  };

  const hasInput = Boolean((text && text.trim()) || file);

  return (
    <div className="app-container">
      <Header backendStatus={backendStatus} backendModel={backendModel} />

      <main className="main-content" id="main">
        {/* Top Notification / Error Alert */}
        {error && (
          <div className="alert-wrapper">
            <ErrorMessage
              error={error}
              onDismiss={() => setError(null)}
              onRetry={() => handleAnalyze()}
            />
          </div>
        )}

        <div className="layout-grid">
          {/* Left Column: Upload & Options */}
          <section className="input-column" aria-label="Error input and analysis settings">
            <div className="panel-card upload-panel">
              <div className="panel-header">
                <span className="step-badge">1</span>
                <div>
                  <h2 className="panel-title">Describe or Paste Your Error</h2>
                  <p className="panel-subtitle">
                    Paste terminal traceback, code, or attach an error screenshot
                  </p>
                </div>
              </div>

              <ErrorComposer
                text={text}
                onTextChange={(val) => {
                  setText(val);
                  if (error) setError(null);
                }}
                file={file}
                previewUrl={previewUrl}
                onFileSelect={handleFileSelect}
                onRemoveFile={handleRemoveFile}
                mode={mode}
                onSubmit={() => handleAnalyze()}
                isLoading={isLoading}
                isLoadingFix={isLoadingFix}
                onError={(msg) => setError(msg)}
              />
            </div>

            <div className="panel-card options-panel">
              <div className="panel-header">
                <span className="step-badge">2</span>
                <div>
                  <h2 className="panel-title">Select Analysis Depth</h2>
                  <p className="panel-subtitle">Choose how you want Gemma 4 to assist</p>
                </div>
              </div>

              <ModeSelector
                mode={mode}
                onSelectMode={(newMode) => setMode(newMode)}
                disabled={isLoading || isLoadingFix}
              />

              <div className="cta-container">
                <button
                  type="button"
                  className={`btn btn-primary btn-large btn-glow ${
                    isLoading ? 'is-loading' : ''
                  }`}
                  onClick={() => handleAnalyze()}
                  disabled={!hasInput || isLoading || isLoadingFix}
                  aria-label="Analyze error with Gemma 4"
                >
                  {isLoading ? (
                    <>
                      <span className="button-spinner" aria-hidden="true" />
                      Analyzing with Gemma 4...
                    </>
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="btn-icon-sparkle"
                        aria-hidden="true"
                      >
                        <path d="M12 2l2.4 7.2L21.6 12l-7.2 2.4L12 21.6l-2.4-7.2L2.4 12l7.2-2.4L12 2z" />
                      </svg>
                      {mode === 'fix' ? 'Analyze & Show Fix' : 'Explain Error in Plain English'}
                    </>
                  )}
                </button>

                {!hasInput && (
                  <p className="cta-hint">Enter code/error or attach a screenshot above to enable analysis</p>
                )}
              </div>
            </div>
          </section>

          {/* Right Column: Results & Insights */}
          <section
            className="output-column"
            aria-label="Analysis results and recommendations"
          >
            {isLoading ? (
              <LoadingState mode={mode} />
            ) : result ? (
              <ResultsPanel
                result={result}
                currentMode={mode}
                onSwitchToFix={handleSwitchToFix}
                onReset={handleReset}
                isLoadingFix={isLoadingFix}
              />
            ) : (
              <div className="empty-results-state">
                <div className="empty-illustration" aria-hidden="true">
                  <svg viewBox="0 0 80 80" fill="none" className="empty-svg">
                    <circle cx="40" cy="40" r="38" stroke="#1E293B" strokeWidth="2" />
                    <rect
                      x="22"
                      y="24"
                      width="36"
                      height="32"
                      rx="4"
                      stroke="#475569"
                      strokeWidth="2"
                    />
                    <line x1="28" y1="32" x2="44" y2="32" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
                    <line x1="28" y1="40" x2="52" y2="40" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
                    <line x1="28" y1="48" x2="38" y2="48" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="empty-title">Awaiting Screenshot</h3>
                <p className="empty-desc">
                  Upload an error image and click analyze. Gemma 4 will decode the
                  root cause, break it down in plain English, and provide step-by-step
                  remediation.
                </p>
                <div className="empty-features-list">
                  <div className="empty-feature-item">
                    <span className="feature-dot">✓</span>
                    <span>Stack traces &amp; console logs</span>
                  </div>
                  <div className="empty-feature-item">
                    <span className="feature-dot">✓</span>
                    <span>Syntax errors &amp; exceptions</span>
                  </div>
                  <div className="empty-feature-item">
                    <span className="feature-dot">✓</span>
                    <span>Build, Docker &amp; CI/CD failures</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <p className="footer-text">
          ErrorSnap AI • Powered by Google Gemma 4 on the Gemini API • Free Developer Edition
        </p>
      </footer>
    </div>
  );
}
