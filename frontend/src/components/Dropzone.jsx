import React, { useRef, useState } from 'react';

const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Format bytes into human-readable string (KB, MB).
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Screenshot upload component with drag-and-drop, file picker, and image preview.
 */
export default function Dropzone({
  file,
  previewUrl,
  onFileSelect,
  onRemove,
  disabled = false,
  onError,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const validateAndHandle = (candidateFile) => {
    if (!candidateFile) return;

    const ext = candidateFile.name.split('.').pop()?.toLowerCase();
    const isMimeOk = ALLOWED_MIME.includes(candidateFile.type);
    const isExtOk = ALLOWED_EXTENSIONS.includes(ext);

    if (!isMimeOk && !isExtOk) {
      if (onError) {
        onError('Unsupported file type. Please upload a PNG, JPG, JPEG, or WEBP image.');
      }
      return;
    }

    if (candidateFile.size > 10 * 1024 * 1024) {
      if (onError) {
        onError('File is too large. Screenshots must be 10 MB or smaller.');
      }
      return;
    }

    onFileSelect(candidateFile);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if leaving the dropzone container itself
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandle(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandle(e.target.files[0]);
    }
  };

  const handleClickUpload = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClickUpload();
    }
  };

  return (
    <div className="dropzone-section">
      <input
        ref={inputRef}
        type="file"
        id="screenshot-input"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={handleInputChange}
        disabled={disabled}
      />

      {!file ? (
        <div
          className={`dropzone ${isDragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClickUpload}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
          role="button"
          aria-label="Upload error screenshot. Drag and drop an image or press Enter to browse files."
        >
          <div className="dropzone-icon-wrapper" aria-hidden="true">
            <svg
              className="dropzone-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>

          <div className="dropzone-text">
            <p className="dropzone-title">
              <span className="dropzone-highlight">Drop error screenshot here</span> or browse
            </p>
            <p className="dropzone-subtitle">
              Supports PNG, JPG, JPEG, and WEBP (up to 10 MB)
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary dropzone-browse-btn"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              handleClickUpload();
            }}
          >
            Select Image
          </button>
        </div>
      ) : (
        <div className="preview-card" aria-label="Selected error screenshot preview">
          <div className="preview-image-container">
            <img
              src={previewUrl}
              alt="Screenshot preview for error analysis"
              className="preview-image"
            />
            <div className="preview-image-overlay" aria-hidden="true">
              <span className="preview-badge">Ready for analysis</span>
            </div>
          </div>

          <div className="preview-meta">
            <div className="preview-info">
              <span className="preview-filename" title={file.name}>
                {file.name}
              </span>
              <span className="preview-filesize">{formatFileSize(file.size)}</span>
            </div>

            <div className="preview-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleClickUpload}
                disabled={disabled}
                aria-label="Replace current image with a new screenshot"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="btn-icon"
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
                className="btn btn-ghost btn-sm btn-danger-ghost"
                onClick={onRemove}
                disabled={disabled}
                aria-label="Remove uploaded screenshot"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="btn-icon"
                  aria-hidden="true"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
