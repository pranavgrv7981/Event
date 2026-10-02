import React from 'react';
import SessionTable from '../components/SessionTable';

export function SessionsPage({ sessions = [], venues = [], onInitiateChange, onInspectDependencies }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800 }}>Sessions & Schedule Master</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            Scheduled conference talks, keynote ceremonies, technical workshops, and pitch showcases.
          </p>
        </div>
        <button
          className="cc-btn cc-btn-primary"
          onClick={() => onInitiateChange()}
        >
          ⚡ Make Operational Change
        </button>
      </div>

      <SessionTable
        sessions={sessions}
        venues={venues}
        onInitiateChange={onInitiateChange}
        onInspectDependencies={onInspectDependencies}
      />
    </div>
  );
}

export default SessionsPage;
