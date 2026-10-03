import React, { useState, useEffect } from 'react';
import api from '../services/api';

export function Header({
  activeEvent,
  activeConflictsCount = 0,
  onOpenChangeModal,
  currentRole = 'operations',
  onSelectRole,
}) {
  const [isBackendOnline, setIsBackendOnline] = useState(null);

  useEffect(() => {
    let active = true;
    async function ping() {
      try {
        await api.getHealth();
        if (active) setIsBackendOnline(true);
      } catch {
        if (active) setIsBackendOnline(false);
      }
    }
    ping();
    const timer = setInterval(ping, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <header className="cc-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="cc-sidebar-logo" style={{ width: '24px', height: '24px', fontSize: '11px' }}>
            EO
          </div>
          <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Operations Command Center
          </span>
        </div>

        {activeEvent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-dim)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-muted)' }}>EVENT:</span>
            <strong style={{ color: 'var(--accent-cyan)' }}>{activeEvent.name}</strong>
            <span className="cc-badge neutral" style={{ fontSize: '9px', padding: '1px 5px' }}>
              {activeEvent.status}
            </span>
          </div>
        )}
      </div>

      {/* Role Switcher */}
      {onSelectRole && (
        <div className="cc-role-selector">
          <button
            type="button"
            className={`cc-role-btn ${currentRole === 'operations' ? 'active' : ''}`}
            onClick={() => onSelectRole('operations')}
            title="General operations, schedule, and all conflicts"
          >
            🎛️ Operations
          </button>
          <button
            type="button"
            className={`cc-role-btn ${currentRole === 'technical' ? 'active' : ''}`}
            onClick={() => onSelectRole('technical')}
            title="Technical equipment, AV dependencies, and hardware collisions"
          >
            🛠️ Technical
          </button>
          <button
            type="button"
            className={`cc-role-btn ${currentRole === 'volunteers' ? 'active' : ''}`}
            onClick={() => onSelectRole('volunteers')}
            title="Volunteer deployment, staffing overlaps, and shifts"
          >
            🤝 Volunteers
          </button>
          <button
            type="button"
            className={`cc-role-btn ${currentRole === 'leadership' ? 'active' : ''}`}
            onClick={() => onSelectRole('leadership')}
            title="Executive briefing, critical risks, and governance audit"
          >
            👑 Leadership
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {activeConflictsCount > 0 ? (
          <div className="cc-badge rose" style={{ padding: '4px 8px', fontSize: '11px' }}>
            <span className="cc-pulse-dot danger" />
            <span>{activeConflictsCount} ACTIVE CONFLICTS</span>
          </div>
        ) : (
          <div className="cc-badge green" style={{ padding: '4px 8px', fontSize: '11px' }}>
            <span className="cc-pulse-dot" />
            <span>0 CONFLICTS</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span className={`cc-pulse-dot ${isBackendOnline ? '' : 'danger'}`} />
          <span>{isBackendOnline === true ? 'ONLINE (8000)' : isBackendOnline === false ? 'OFFLINE' : 'CHECKING'}</span>
        </div>

        {onOpenChangeModal && (
          <button className="cc-btn cc-btn-primary cc-btn-sm" onClick={() => onOpenChangeModal()}>
            ⚡ Operational Change
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;
