import React from 'react';

/**
 * Header component for ErrorSnap AI.
 * Displays application logo, name, tagline, and backend status pill.
 */
export default function Header({ backendStatus = 'checking', backendModel = 'gemma-4-26b-a4b-it' }) {
  return (
    <header className="app-header" role="banner">
      <div className="header-brand">
        <div className="brand-logo" aria-hidden="true">
          <svg
            className="logo-icon"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="32" height="32" rx="8" fill="url(#brandGrad)" />
            {/* Viewfinder brackets */}
            <path
              d="M7 11V8C7 7.44772 7.44772 7 8 7H11"
              stroke="#F8FAFC"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M25 11V8C25 7.44772 24.5523 7 24 7H21"
              stroke="#F8FAFC"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M7 21V24C7 24.5523 7.44772 25 8 25H11"
              stroke="#F8FAFC"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M25 21V24C25 24.5523 24.5523 25 24 25H21"
              stroke="#F8FAFC"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Lightning bolt / bug snap icon */}
            <path
              d="M17 10L12 17H16L15 22L20 15H16L17 10Z"
              fill="#FDE047"
              stroke="#EAB308"
              strokeWidth="0.75"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="brandGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1" />
                <stop offset="1" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="brand-text">
          <div className="brand-name-row">
            <h1 className="brand-name">ErrorSnap AI</h1>
            <span className="badge-ai" title={`Powered by Google ${backendModel}`}>
              Gemma 4
            </span>
          </div>
          <p className="brand-tagline">Understand errors. Fix them faster.</p>
        </div>
      </div>

      <div className="header-status" aria-label="Backend system status">
        <span
          className={`status-indicator status-${backendStatus}`}
          title={
            backendStatus === 'online'
              ? `Backend active (${backendModel})`
              : backendStatus === 'offline'
              ? 'Backend offline (http://localhost:5000)'
              : 'Checking backend...'
          }
        >
          <span className="status-dot" aria-hidden="true"></span>
          <span className="status-label">
            {backendStatus === 'online' && 'Flask API Connected'}
            {backendStatus === 'offline' && 'Backend Offline'}
            {backendStatus === 'checking' && 'Connecting...'}
          </span>
        </span>
      </div>
    </header>
  );
}
