import React from 'react';

export function LoadingState({ message = 'Loading operations data...' }) {
  return (
    <div className="cc-state-block">
      <div className="cc-spinner" style={{ width: '32px', height: '32px', marginBottom: '14px' }} />
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{message}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
        Communicating with FastAPI event operations engine
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry, message = 'Unable to connect to backend' }) {
  const errMsg = typeof error === 'string' ? error : error?.message || 'Unknown network error';

  return (
    <div className="cc-state-block">
      <div style={{ fontSize: '28px', marginBottom: '10px' }}>⚠️</div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-rose)' }}>{message}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-dim)', maxWidth: '420px', margin: '6px 0 16px' }}>
        {errMsg}
      </div>
      {onRetry && (
        <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={onRetry}>
          ↻ Retry Connection
        </button>
      )}
    </div>
  );
}
