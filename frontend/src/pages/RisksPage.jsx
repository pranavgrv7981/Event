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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [sessionId, setSessionId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  const handleCreateRisk = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setCreateError('Title and description are required.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        severity,
        status: 'open',
        session_id: sessionId || null,
        venue_id: venueId || null,
      };

      await api.createEventRisk(eventId, payload);
      setIsSubmitting(false);
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      if (onRefreshRisks) onRefreshRisks();
    } catch (err) {
      setIsSubmitting(false);
      setCreateError(err?.detail || err?.message || 'Failed to create risk');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Risk Register & Hazard Governance</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Monitor crowd thresholds, hardware single points of failure, weather exposure, and schedule dependencies.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          style={{ fontWeight: 700 }}
        >
          + Log Operational Risk
        </button>
      </div>

      <RiskPanel
        risks={risks}
        isUpdating={isUpdating}
        onUpdateRiskStatus={onUpdateRiskStatus}
      />

      {/* Risk Creation Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ fontSize: '14px', fontWeight: 700 }}>LOG OPERATIONAL RISK</div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateRisk}>
              <div className="modal-body">
                {createError && (
                  <div className="alert-banner danger" style={{ marginBottom: '16px' }}>
                    <div className="alert-title">Creation Failed</div>
                    <div className="alert-description">{createError}</div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Risk Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Auditorium A nearing capacity"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description & Consequence</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Detailed hazard assessment..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Severity Level</label>
                  <select className="form-select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Related Venue (Optional)</label>
                    <select className="form-select" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                      <option value="">-- None --</option>
                      {venues.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Related Session (Optional)</label>
                    <select className="form-select" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                      <option value="">-- None --</option>
                      {sessions.map(s => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
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
