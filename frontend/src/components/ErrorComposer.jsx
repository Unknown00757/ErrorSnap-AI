import React, { useRef, useState, useEffect } from 'react';

const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Unified ChatGPT-style error input composer.
 *
 * Supports:
 * - Direct multiline code and error message typing or pasting (Ctrl+V)
 * - Clipboard image paste (PrtScn / Snipping Tool / copied image)
 * - Drag-and-drop image screenshots onto composer
 * - File attachment button (paperclip) for PNG, JPG, JPEG, WEBP (<=10 MB)
 * - Inline thumbnail preview chip with Replace and Remove controls
 * - Bottom-right send/analyze action button
 * - Keyboard shortcut submission via Ctrl+Enter / Cmd+Enter
 */
export default function ErrorComposer({
  text,
  onTextChange,
  file,
  previewUrl,
  onFileSelect,
  onRemoveFile,
  mode = 'beginner',
  onSubmit,
  isLoading = false,
  isLoadingFix = false,
  disabled = false,
  onError,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const isBusy = isLoading || isLoadingFix || disabled;
  const hasContent = Boolean((text && text.trim()) || file);

  // Auto-resize textarea height as content grows up to max
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(Math.max(scrollHeight, 120), 320)}px`;
    }
  }, [text]);

  const validateAndAttachFile = (candidateFile) => {
    if (!candidateFile) return;

    const ext = candidateFile.name?.split('.').pop()?.toLowerCase();
    const isMimeOk = ALLOWED_MIME.includes(candidateFile.type);
    const isExtOk = ALLOWED_EXTENSIONS.includes(ext);

    if (!isMimeOk && !isExtOk) {
      if (onError) {
        onError('Unsupported file format. Please attach a PNG, JPG, JPEG, or WEBP image.');
      }
      return;
    }

    if (candidateFile.size > MAX_FILE_BYTES) {
      if (onError) {
        onError('File is too large. Screenshot attachments must be 10 MB or smaller.');
      }
      return;
    }

    onFileSelect(candidateFile);
  };

  // Clipboard paste: handles both text and pasted screenshot images
  const handlePaste = (e) => {
    if (isBusy) return;

    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;

    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.type.startsWith('image/')) {
        const pastedBlob = item.getAsFile();
        if (pastedBlob) {
          // If unnamed, name it with timestamp
          const namedFile = pastedBlob.name
            ? pastedBlob
            : new File([pastedBlob], `pasted-screenshot-${Date.now()}.png`, {
                type: pastedBlob.type || 'image/png',
              });
          validateAndAttachFile(namedFile);
          e.preventDefault();
          return;
        }
      }
    }
    // Normal text pasting proceeds natively into the textarea
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isBusy) setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isBusy && !isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isBusy) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAttachFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAttachFile(e.target.files[0]);
    }
  };

  const handleTriggerAttach = () => {
    if (!isBusy && fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter submits
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (hasContent && !isBusy) {
        onSubmit();
      }
    }
  };

  return (
    <div className="error-composer-section">
      <input
        ref={fileInputRef}
        type="file"
        id="composer-file-input"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
        disabled={isBusy}
      />

      <div
        className={`error-composer-card ${isDragging ? 'is-dragging' : ''} ${
          isBusy ? 'is-busy' : ''
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Multiline Text Box */}
        <div className="composer-input-area">
          <textarea
            ref={textareaRef}
            id="error-text-input"
            className="composer-textarea"
            placeholder="Paste your error message or code here..."
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            disabled={isBusy}
            rows={4}
            maxLength={50000}
            aria-label="Error message or code input"
          />
        </div>

        {/* Thumbnail Attachment Preview Chip */}
        {file && previewUrl && (
          <div className="attachment-chip" aria-label="Attached screenshot preview">
            <div className="attachment-thumb-wrap">
              <img
                src={previewUrl}
                alt="Screenshot thumbnail"
                className="attachment-thumb-img"
              />
            </div>

            <div className="attachment-meta">
              <span className="attachment-filename" title={file.name}>
                {file.name}
              </span>
              <span className="attachment-size">{formatFileSize(file.size)}</span>
            </div>

            <div className="attachment-actions">
              <button
                type="button"
                className="attachment-btn"
                onClick={handleTriggerAttach}
                disabled={isBusy}
                title="Replace screenshot"
                aria-label="Replace screenshot"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="attachment-btn-icon"
                  aria-hidden="true"
                >
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                Replace
              </button>

              <button
                type="button"
                className="attachment-btn attachment-btn-danger"
                onClick={onRemoveFile}
                disabled={isBusy}
                title="Remove attachment"
                aria-label="Remove attached screenshot"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="attachment-btn-icon"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Composer Bottom Toolbar */}
        <div className="composer-toolbar">
          <div className="toolbar-left">
            <button
              type="button"
              className={`composer-tool-btn ${file ? 'has-attachment' : ''}`}
              onClick={handleTriggerAttach}
              disabled={isBusy}
              title={file ? 'Replace screenshot' : 'Attach screenshot (PNG, JPG, WEBP <= 10MB)'}
              aria-label="Attach error screenshot image"
            >
              {/* Paperclip Icon */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="tool-btn-icon"
                aria-hidden="true"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span>{file ? 'Change Image' : 'Attach Screenshot'}</span>
            </button>
          </div>

          <div className="toolbar-right">
            {text && text.length > 0 && (
              <span className="composer-char-count">
                {text.length.toLocaleString()} / 50,000
              </span>
            )}

            <button
              type="button"
              className={`btn btn-primary composer-send-btn ${isBusy ? 'is-loading' : ''}`}
              onClick={onSubmit}
              disabled={!hasContent || isBusy}
              aria-label="Submit error for Gemma 4 analysis"
            >
              {isLoading || isLoadingFix ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="send-icon"
                    aria-hidden="true"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  {mode === 'fix' ? 'Show Fix' : 'Explain Error'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Helper Tagline & Keyboard Shortcut Hint */}
      <div className="composer-hint-row">
        <p className="composer-hint-text">
          Paste code, describe the error, or attach a screenshot.
        </p>
        <span className="composer-shortcut-badge">Ctrl + Enter to send</span>
      </div>
    </div>
  );
}
