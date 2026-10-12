import React from 'react';

/**
 * Analysis mode selector component.
 * Allows choosing between beginner-friendly explanation and code-level fix.
 */
export default function ModeSelector({ mode, onSelectMode, disabled = false }) {
  const modes = [
    {
      id: 'beginner',
      title: "Explain Like I'm a Beginner",
      badge: 'Best for learning',
      description:
        'Plain-English explanation of what broke, likely cause, and 3 clear troubleshooting steps without confusing jargon.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mode-icon">
          <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
          <path d="M9 21h6" />
        </svg>
      ),
    },
    {
      id: 'fix',
      title: 'Show Me the Fix',
      badge: 'Actionable code',
      description:
        'Targeted solution with corrected code snippets, configuration adjustments, and exact verification steps.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mode-icon">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
          <line x1="14" y1="4" x2="10" y2="20" />
        </svg>
      ),
    },
  ];

  const handleKeyDown = (e, index) => {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % modes.length;
      onSelectMode(modes[nextIndex].id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + modes.length) % modes.length;
      onSelectMode(modes[prevIndex].id);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectMode(modes[index].id);
    }
  };

  return (
    <div className="mode-selector-section">
      <div className="section-label-row">
        <label className="section-label" id="mode-group-label">
          Choose Analysis Mode
        </label>
        <span className="section-subhint">Tailors Gemma 4's response depth</span>
      </div>

      <div
        className="mode-grid"
        role="radiogroup"
        aria-labelledby="mode-group-label"
      >
        {modes.map((item, index) => {
          const isSelected = mode === item.id;
          return (
            <div
              key={item.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={disabled ? -1 : isSelected ? 0 : -1}
              className={`mode-card ${isSelected ? 'is-selected' : ''} ${
                disabled ? 'is-disabled' : ''
              }`}
              onClick={() => !disabled && onSelectMode(item.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              <div className="mode-card-header">
                <div className="mode-icon-box">{item.icon}</div>
                <div className="mode-meta">
                  <div className="mode-title-row">
                    <span className="mode-title">{item.title}</span>
                    <span className="mode-badge">{item.badge}</span>
                  </div>
                </div>
                <div className="mode-radio-circle" aria-hidden="true">
                  {isSelected && <div className="mode-radio-inner" />}
                </div>
              </div>
              <p className="mode-desc">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
