import React from 'react';

export function LoadingState({ message = 'Loading operations data...' }) {
  return (
    <div className="state-container">
      <div className="spinner" />
      <div className="state-title">{message}</div>
      <div className="state-subtitle">Connecting to Event Operations backend</div>
    </div>
  );
}

export function ErrorState({ error, onRetry, message = 'Unable to load operations data' }) {
  const errorMessage = typeof error === 'string' ? error : error?.message || 'An unknown error occurred.';

  return (
    <div className="state-container">
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
      <div className="state-title" style={{ color: 'var(--accent-rose)' }}>{message}</div>
      <div className="state-subtitle" style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
        {errorMessage}
      </div>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          ↻ Retry Connection
        </button>
      )}
    </div>
  );
}
