import React from 'react';
import SessionTable from '../components/SessionTable';

export function SessionsPage({ sessions = [], venues = [], onInitiateChange, onInspectDependencies }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Sessions & Schedule Master</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Inspect all scheduled conference talks, workshops, panels, and ceremonies across campus venues.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => onInitiateChange()}
          style={{ fontWeight: 700 }}
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
