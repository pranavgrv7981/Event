import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { LoadingState, ErrorState } from './LoadingState';

export function DependencyModal({ entityType, entityId, onClose }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function fetchDeps() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.getDependencies(entityType, entityId);
        if (active) setData(res);
      } catch (err) {
        if (active) setError(err);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    if (entityType && entityId) fetchDeps();
    return () => { active = false; };
  }, [entityType, entityId]);

  if (!entityType || !entityId) return null;

  const categories = data?.affected ? [
    { label: 'Sessions', items: data.affected.sessions, icon: '📅' },
    { label: 'Venues', items: data.affected.venues, icon: '🏢' },
    { label: 'Speakers', items: data.affected.speakers, icon: '🎤' },
    { label: 'Volunteers', items: data.affected.volunteers, icon: '🤝' },
    { label: 'Equipment', items: data.affected.equipment, icon: '📦' },
    { label: 'Tasks', items: data.affected.tasks, icon: '✅' },
    { label: 'Risks', items: data.affected.risks, icon: '⚠️' },
  ] : [];

  const totalAffected = categories.reduce((sum, c) => sum + (c.items?.length || 0), 0);

  return (
    <div className="cc-modal-backdrop" onClick={onClose}>
      <div className="cc-modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="cc-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔗</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
                Deterministic Dependency Traversal
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Target: <code>{entityType}/{entityId}</code>
              </div>
            </div>
          </div>
          <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="cc-modal-body">
          {isLoading ? (
            <LoadingState message="Querying deterministic dependency graph..." />
          ) : error ? (
            <ErrorState error={error} message="Dependency query failed" />
          ) : data ? (
            <div>
              <div style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: '6px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px' }}>
                Modifying <strong>{entityType}</strong> directly cascades through <strong>{totalAffected}</strong> connected entities across the operational database graph.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categories.map((cat) => (
                  <div key={cat.label} style={{ backgroundColor: 'rgba(9, 13, 22, 0.7)', borderRadius: '6px', padding: '10px 12px', border: '1px solid var(--border-dim)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                      {cat.icon} {cat.label} ({cat.items?.length || 0})
                    </div>
                    {cat.items && cat.items.length > 0 ? (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {cat.items.map((it) => (
                          <span key={it.id} className="cc-badge neutral">
                            <strong>{it.name}</strong> <span style={{ opacity: 0.6 }}>({it.id})</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>None linked</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="cc-modal-foot">
          <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default DependencyModal;
