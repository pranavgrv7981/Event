import React from 'react';
import ChangePanel from '../components/ChangePanel';

export function ChangeStudioPage({
  eventId,
  sessions = [],
  venues = [],
  onSuccess,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>⚡</span>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Change Impact Studio & Simulation</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Interactive workspace to simulate operational changes, verify deterministic dependency impact, detect conflicts, and review AI recommendations.
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
