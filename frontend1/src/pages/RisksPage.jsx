import React, { useState } from 'react';
import RiskPanel from '../components/RiskPanel';
import api from '../services/api';

export function RisksPage({
  eventId,
  risks = [],
  sessions = [],
  venues = [],
  onRefreshRisks,
  onUpdateRiskStatus,
  isUpdating = false,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [sessionId, setSessionId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        severity,
        status: 'open',
        session_id: sessionId || null,
        venue_id: venueId || null,
      };

      await api.createRisk(eventId, payload);
      setIsSubmitting(false);
      setShowCreate(false);
      setTitle('');
      setDescription('');
      if (onRefreshRisks) onRefreshRisks();
    } catch (err) {
      setIsSubmitting(false);
      setError(err?.detail || err?.message || 'Failed to record risk');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800 }}>Risk Register & Hazard Governance</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            Monitor capacity thresholds, hardware single points of failure, and schedule dependencies.
          </p>
        </div>
        <button className="cc-btn cc-btn-primary" onClick={() => setShowCreate(true)}>
          + Record Risk
        </button>
      </div>

      <RiskPanel
        risks={risks}
        onUpdateRiskStatus={onUpdateRiskStatus}
        isUpdating={isUpdating}
      />

      {/* Creation Modal */}
      {showCreate && (
        <div className="cc-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="cc-modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="cc-modal-head">
              <div style={{ fontSize: '13px', fontWeight: 800 }}>LOG OPERATIONAL RISK</div>
              <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="cc-modal-body">
                {error && (
                  <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '6px', padding: '8px 12px', color: '#fecdd3', fontSize: '11px', marginBottom: '12px' }}>
                    {error}
                  </div>
                )}
                <div style={{ marginBottom: '12px' }}>
                  <label className="cc-form-label">Risk Title</label>
                  <input
                    type="text"
                    className="cc-input"
                    placeholder="e.g. Auditorium A nearing capacity"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label className="cc-form-label">Description & Consequence</label>
                  <textarea
                    className="cc-textarea"
                    placeholder="Hazard evaluation..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    style={{ minHeight: '70px' }}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label className="cc-form-label">Severity Level</label>
                  <select className="cc-select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="cc-form-label">Related Venue</label>
                    <select className="cc-select" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                      <option value="">-- None --</option>
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="cc-form-label">Related Session</label>
                    <select className="cc-select" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                      <option value="">-- None --</option>
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="cc-modal-foot">
                <button type="button" className="cc-btn cc-btn-secondary cc-btn-sm" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="cc-btn cc-btn-primary cc-btn-sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Recording...' : 'Record Risk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RisksPage;
