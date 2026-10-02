import React from 'react';
import ChangePanel from '../components/ChangePanel';

export function ChangeStudioPage({
  eventId,
  sessions = [],
  venues = [],
  onSuccess,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>⚡</span>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800 }}>Change Impact Studio & Simulation</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Interactive workspace to test operational changes, verify deterministic dependency impact, detect conflicts, and review AI recommendations.
            </p>
          </div>
        </div>
      </div>

      <ChangePanel
        eventId={eventId}
        sessions={sessions}
        venues={venues}
        onSuccess={onSuccess}
        isModal={false}
      />
    </div>
  );
}

export default ChangeStudioPage;
