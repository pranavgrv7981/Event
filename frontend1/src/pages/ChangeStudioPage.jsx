import React from 'react';
import ChangePanel from '../components/ChangePanel';

export function ChangeStudioPage({
  event,
  eventId,
  sessions = [],
  venues = [],
  onSuccess,
}) {
  return (
    <div className="cc-change-studio">
      <header className="cc-studio-heading">
        <div className="cc-studio-copy">
          <div className="cc-studio-eyebrow">Operational workspace <span> / </span> Change management</div>
          <h1>Change Impact Studio</h1>
          <p>Preview an operational change, then review backend-verified impact, conflicts, AI analysis, and Notion sync status.</p>
        </div>
        <div className="cc-studio-context">
          <span>Active event</span>
          <strong>{event?.name || eventId || 'Event operations'}</strong>
          <small>{sessions.length} sessions <span>·</span> {venues.length} venues</small>
        </div>
      </header>

      <ol className="cc-workflow" aria-label="Change processing workflow">
        <li><span>01</span> Record change</li>
        <li><span>02</span> Verify impact</li>
        <li><span>03</span> Review conflicts</li>
        <li><span>04</span> Analyze</li>
        <li><span>05</span> Sync to Notion</li>
      </ol>

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
