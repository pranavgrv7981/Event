import React, { useState } from 'react';

export function ImpactPanel({ verifiedImpact, onInspectEntity }) {
  const [selectedCat, setSelectedCat] = useState(null);

  if (!verifiedImpact) return null;

  const { change, impact, affected, verification } = verifiedImpact;
  const counts = impact?.counts || {
    sessions: 0,
    speakers: 0,
    volunteers: 0,
    equipment: 0,
    tasks: 0,
    risks: 0,
  };

  const categories = [
    { key: 'sessions', label: 'Sessions', count: counts.sessions, icon: '📅', items: affected?.sessions || [] },
    { key: 'speakers', label: 'Speakers', count: counts.speakers, icon: '🎤', items: affected?.speakers || [] },
    { key: 'volunteers', label: 'Volunteers', count: counts.volunteers, icon: '🤝', items: affected?.volunteers || [] },
    { key: 'equipment', label: 'Equipment', count: counts.equipment, icon: '📦', items: affected?.equipment || [] },
    { key: 'tasks', label: 'Tasks', count: counts.tasks, icon: '✅', items: affected?.tasks || [] },
    { key: 'risks', label: 'Risks', count: counts.risks, icon: '⚠️', items: affected?.risks || [] },
  ];

  return (
    <div className="cc-impact-box">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid rgba(16, 185, 129, 0.3)', paddingBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-emerald)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🛡️</span>
            <span>VERIFIED IMPACT</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
            Deterministic Database Calculation &bull; Source: <strong>{verification?.source?.toUpperCase() || 'DATABASE'}</strong> &bull; Severity: <span className={`cc-badge ${impact?.severity === 'high' ? 'rose' : impact?.severity === 'medium' ? 'amber' : 'cyan'}`}>{impact?.severity?.toUpperCase()}</span>
          </div>
        </div>
        <span className="cc-badge green">FACTS VERIFIED</span>
      </div>

      {change && (
        <div style={{ backgroundColor: 'rgba(9, 13, 22, 0.7)', border: '1px solid var(--border-dim)', borderRadius: '6px', padding: '12px 14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
            CHANGE PROCESSED
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', flexWrap: 'wrap' }}>
            <span style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
              {change.old_value ?? 'None'}
            </span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>&rarr;</span>
            <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 700 }}>
              {change.new_value ?? 'None'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '6px' }}>
              ({change.entity_type} / {change.entity_id} &bull; field: <code>{change.field_name}</code>)
            </span>
          </div>
          {change.reason && (
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px', fontStyle: 'italic' }}>
              &ldquo;{change.reason}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Grid of Verified Metric Counts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', marginBottom: '14px' }}>
        {categories.map((cat) => (
          <div
            key={cat.key}
            onClick={() => setSelectedCat(selectedCat === cat.key ? null : cat.key)}
            style={{
              backgroundColor: selectedCat === cat.key ? 'var(--bg-card-hover)' : 'rgba(9, 13, 22, 0.6)',
              border: selectedCat === cat.key ? '1px solid var(--accent-emerald)' : '1px solid var(--border-dim)',
              borderRadius: '6px',
              padding: '10px',
              textAlign: 'center',
              cursor: cat.count > 0 ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '15px' }}>{cat.icon}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: cat.count > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
              {cat.count}
            </div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>
              {cat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Entity Category Breakdown */}
      {selectedCat && (
        <div style={{ backgroundColor: 'rgba(9, 13, 22, 0.85)', border: '1px solid var(--border-mid)', borderRadius: '6px', padding: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-main)' }}>
              Affected {selectedCat} Records ({categories.find(c => c.key === selectedCat)?.items.length || 0})
            </span>
            <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={() => setSelectedCat(null)} style={{ padding: '1px 5px', fontSize: '9px' }}>
              Close
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.find(c => c.key === selectedCat)?.items.length > 0 ? (
              categories.find(c => c.key === selectedCat)?.items.map((item) => (
                <span
                  key={item.id}
                  className="cc-badge neutral"
                  style={{ cursor: onInspectEntity ? 'pointer' : 'default' }}
                  onClick={() => onInspectEntity && onInspectEntity(item.id)}
                >
                  <strong>{item.name}</strong> <span style={{ opacity: 0.6 }}>({item.id})</span>
                </span>
              ))
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No items affected.</span>
            )}
          </div>
        </div>
      )}

      {/* Engine Factor Tags */}
      {impact?.reasons && impact.reasons.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
            Calculation Factors:
          </span>
          {impact.reasons.map((r, i) => (
            <span key={i} className="cc-badge neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImpactPanel;
