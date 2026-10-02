import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { LoadingState, ErrorState } from './LoadingState';

export function DependencyModal({ entityType, entityId, onClose }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchDeps() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.getDependencies(entityType, entityId);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    if (entityType && entityId) {
      fetchDeps();
    }
    return () => { isMounted = false; };
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

  const totalDownstream = categories.reduce((sum, cat) => sum + (cat.items?.length || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🔗</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                DETERMINISTIC DEPENDENCY GRAPH
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Source: <strong style={{ fontFamily: 'var(--font-mono)' }}>{entityType}/{entityId}</strong>
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <LoadingState message="Traversing deterministic dependency graph..." />
          ) : error ? (
            <ErrorState error={error} message="Failed to load dependencies" />
          ) : data ? (
            <div>
              <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-blue)', fontWeight: 700 }}>
                  Deterministic Impact Reach
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>
                  Modifying this <strong>{entityType}</strong> directly touches <strong>{totalDownstream}</strong> downstream entity relations across the event graph.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {categories.map((cat) => (
                  <div key={cat.label} style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', borderRadius: '6px', padding: '10px 14px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {cat.icon} {cat.label} ({cat.items?.length || 0})
                      </span>
                    </div>
                    {cat.items && cat.items.length > 0 ? (
                      <div className="chip-container">
                        {cat.items.map((item) => (
                          <span key={item.id} className="chip">
                            <strong>{item.name}</strong> <span style={{ opacity: 0.6 }}>({item.id})</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>None linked</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default DependencyModal;
