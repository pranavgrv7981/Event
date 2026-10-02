import React from 'react';

export function ConflictPanel({ conflicts = [], onInspectEntity }) {
  if (!conflicts || conflicts.length === 0) {
    return (
      <div className="cc-card" style={{ borderLeft: '3px solid var(--accent-emerald)', padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>✓</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--accent-emerald)' }}>
              NO CONFLICTS DETECTED
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Backend deterministic validation reports zero schedule or resource overlaps.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getConflictCategory = (type) => {
    switch (type) {
      case 'venue_schedule_overlap':
        return { label: 'Venue Overlap Conflict', icon: '🏢' };
      case 'speaker_overlap':
        return { label: 'Speaker Double-Booking', icon: '🎤' };
      case 'volunteer_overlap':
        return { label: 'Volunteer Double-Booking', icon: '🤝' };
      case 'equipment_conflict':
        return { label: 'Equipment Resource Conflict', icon: '📦' };
      default:
        return { label: type?.replace(/_/g, ' ').toUpperCase(), icon: '⚠️' };
    }
  };

  return (
    <div className="cc-conflict-box">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(244, 63, 94, 0.3)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#fb7185', letterSpacing: '0.05em' }}>
              CONFLICTS DETECTED ({conflicts.length})
            </div>
            <div style={{ fontSize: '11px', color: '#fecdd3' }}>
              Backend conflict engine flagged resource collision(s)
            </div>
          </div>
        </div>
        <span className="cc-badge rose">RESOLVE REQUIRED</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {conflicts.map((conflict, idx) => {
          const category = getConflictCategory(conflict.type);
          const isHigh = conflict.severity === 'high';

          return (
            <div
              key={idx}
              style={{
                backgroundColor: 'rgba(10, 15, 25, 0.7)',
                border: `1px solid ${isHigh ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                borderRadius: '6px',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{category.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '12px', color: isHigh ? '#fda4af' : '#fde68a' }}>
                    {category.label}
                  </span>
                </div>
                <span className={`cc-badge ${isHigh ? 'rose' : 'amber'}`}>
                  {conflict.severity?.toUpperCase()} SEV
                </span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-main)', marginBottom: '8px' }}>
                {conflict.message}
              </div>

              {conflict.entity_ids && conflict.entity_ids.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Entities:
                  </span>
                  {conflict.entity_ids.map((id) => (
                    <span
                      key={id}
                      className="cc-badge neutral"
                      style={{ cursor: onInspectEntity ? 'pointer' : 'default', fontFamily: 'var(--font-mono)' }}
                      onClick={() => onInspectEntity && onInspectEntity(id)}
                    >
                      {id}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ConflictPanel;
