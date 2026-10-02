import React from 'react';

export function ConflictPanel({ conflicts = [], onInspectEntity }) {
  if (!conflicts || conflicts.length === 0) {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>✅</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#34d399' }}>
              NO CONFLICTS REPORTED
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Backend deterministic conflict validation detected zero scheduling or resource overlaps.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getConflictCategory = (type) => {
    switch (type) {
      case 'venue_schedule_overlap':
        return { label: 'Venue Schedule Conflict', icon: '🏢' };
      case 'speaker_overlap':
        return { label: 'Speaker Double-Booking Conflict', icon: '🎤' };
      case 'volunteer_overlap':
        return { label: 'Volunteer Overlap Conflict', icon: '🤝' };
      case 'equipment_conflict':
        return { label: 'Equipment Resource Conflict', icon: '⚡' };
      default:
        return { label: type?.replace(/_/g, ' ').toUpperCase(), icon: '⚠' };
    }
  };

  return (
    <div className="conflict-card-box">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid rgba(244, 63, 94, 0.3)', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>⚠️</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#f43f5e', letterSpacing: '0.06em' }}>
              CONFLICTS DETECTED ({conflicts.length})
            </div>
            <div style={{ fontSize: '11px', color: '#fecdd3' }}>
              Deterministic backend validation identified {conflicts.length} resource/schedule violation(s)
            </div>
          </div>
        </div>
        <span className="badge rose" style={{ fontWeight: 700 }}>
          ACTION REQUIRED
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {conflicts.map((conflict, index) => {
          const category = getConflictCategory(conflict.type);
          const isHigh = conflict.severity === 'high';

          return (
            <div 
              key={index}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: `1px solid ${isHigh ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                borderRadius: '8px',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{category.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: isHigh ? '#fda4af' : '#fde68a' }}>
                    {category.label}
                  </span>
                </div>
                <span className={`badge ${isHigh ? 'rose' : 'amber'}`}>
                  {conflict.severity?.toUpperCase()} SEVERITY
                </span>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '10px', lineHeight: 1.4 }}>
                {conflict.message}
              </div>

              {conflict.entity_ids && conflict.entity_ids.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Involved Entities:
                  </span>
                  {conflict.entity_ids.map((id) => (
                    <span 
                      key={id} 
                      className="chip"
                      onClick={() => onInspectEntity && onInspectEntity(id)}
                      style={{ cursor: onInspectEntity ? 'pointer' : 'default', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
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
