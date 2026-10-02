import React, { useState, useEffect } from 'react';
import api from '../services/api';

export function Header({ activeEvent, activeConflictsCount = 0, onOpenChangeModal }) {
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    let isMounted = true;
    async function checkHealth() {
      try {
        await api.getHealth();
        if (isMounted) setBackendStatus('online');
      } catch {
        if (isMounted) setBackendStatus('offline');
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="top-header">
      <div className="header-left">
        <div className="header-title-group">
          <div className="command-logo">EO</div>
          <div>
            <div className="header-title">
              Event Operations Command Center
            </div>
          </div>
        </div>

        {activeEvent && (
          <div className="header-event-badge">
            <span style={{ color: 'var(--text-muted)' }}>ACTIVE EVENT:</span>
            <strong>{activeEvent.name}</strong>
            <span className="badge blue" style={{ padding: '1px 5px', fontSize: '9px' }}>
              {activeEvent.status}
            </span>
          </div>
        )}
      </div>

      <div className="header-right">
        {activeConflictsCount > 0 ? (
          <div 
            className="badge rose" 
            style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Active conflicts detected by backend"
          >
            <span className="status-dot danger" />
            <strong>{activeConflictsCount} CONFLICTS DETECTED</strong>
          </div>
        ) : (
          <div className="badge emerald" style={{ padding: '5px 10px', fontSize: '11px' }}>
            ✓ NO ACTIVE CONFLICTS
          </div>
        )}

        <div className="system-status-indicator">
          <span className={`status-dot ${backendStatus === 'online' ? '' : 'danger'}`} />
          <span>
            {backendStatus === 'online' ? 'BACKEND ONLINE' : backendStatus === 'offline' ? 'BACKEND OFFLINE' : 'CHECKING API'}
          </span>
        </div>

        {onOpenChangeModal && (
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => onOpenChangeModal()}
            style={{ fontWeight: 600, letterSpacing: '0.02em' }}
          >
            ⚡ Operational Change
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;
