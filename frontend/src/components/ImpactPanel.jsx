import React, { useState } from 'react';

export function ImpactPanel({ verifiedImpact, onInspectEntity }) {
  const [activeCategory, setActiveCategory] = useState(null);

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

  const totalAffected = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="verified-impact-card">
      <div className="verified-impact-header">
        <div>
          <div className="verified-title">
            <span>🛡️</span>
            <span>VERIFIED IMPACT (DATABASE DETERMINISTIC)</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Source: <strong>{verification?.source?.toUpperCase() || 'DATABASE'}</strong> &bull; Deterministic: <strong>TRUE</strong> &bull; Severity: <span className={`badge ${impact?.severity === 'high' ? 'rose' : impact?.severity === 'medium' ? 'amber' : 'blue'}`}>{impact?.severity?.toUpperCase()}</span>
          </div>
        </div>
        <div className="badge emerald" style={{ fontWeight: 700, padding: '5px 10px' }}>
          VERIFIED BY ENGINE
        </div>
      </div>

      {change && (
        <div style={{ backgroundColor: 'rgba(10, 15, 25, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
            CHANGE PROCESSED & COMMITTED
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Target: </span>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{change.entity_type} / {change.entity_id}</strong>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Field: </span>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{change.field_name}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '13px' }}>
            <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              {change.old_value ?? 'None'}
            </span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>&rarr;</span>
            <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              {change.new_value ?? 'None'}
            </span>
          </div>
          {change.reason && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
              &ldquo;{change.reason}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '10px' }}>
          Deterministic Affected Entities Count ({totalAffected} total)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
          {categories.map((cat) => (
            <div
              key={cat.key}
              onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
              style={{
                backgroundColor: activeCategory === cat.key ? 'var(--bg-surface-elevated)' : 'rgba(15, 23, 42, 0.7)',
                border: activeCategory === cat.key ? '1px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '10px',
                textAlign: 'center',
                cursor: cat.count > 0 ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '16px', marginBottom: '2px' }}>{cat.icon}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: cat.count > 0 ? '#34d399' : 'var(--text-muted)' }}>
                {cat.count}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                {cat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Entities Breakdown */}
      {activeCategory && (
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border-default)', borderRadius: '6px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
              Affected {activeCategory.toUpperCase()} ({categories.find(c => c.key === activeCategory)?.items.length})
            </span>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => setActiveCategory(null)}
              style={{ padding: '2px 6px', fontSize: '10px' }}
            >
              Close
            </button>
          </div>
          <div className="chip-container">
            {categories.find(c => c.key === activeCategory)?.items.length > 0 ? (
              categories.find(c => c.key === activeCategory)?.items.map((item) => (
                <span 
                  key={item.id} 
                  className="chip"
                  onClick={() => onInspectEntity && onInspectEntity(item.id)}
                  style={{ cursor: onInspectEntity ? 'pointer' : 'default' }}
                >
                  <strong>{item.name}</strong> <span style={{ opacity: 0.6 }}>({item.id})</span>
                </span>
              ))
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>None recorded in this category.</span>
            )}
          </div>
        </div>
      )}

      {/* Backend Engine Reasons */}
      {impact?.reasons && impact.reasons.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '6px' }}>
            Deterministic Calculation Factors
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {impact.reasons.map((reason, idx) => (
              <span key={idx} className="badge neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                {reason}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ImpactPanel;
