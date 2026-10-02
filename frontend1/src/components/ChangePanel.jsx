import React, { useState } from 'react';
import api from '../services/api';
import ConflictPanel from './ConflictPanel';
import ImpactPanel from './ImpactPanel';
import AiAnalysisPanel from './AiAnalysisPanel';

export function ChangePanel({
  eventId,
  sessions = [],
  venues = [],
  preselectedSession = null,
  onSuccess,
  isModal = false,
  onClose,
}) {
  const [userSessionId, setUserSessionId] = useState(null);
  const [fieldName, setFieldName] = useState('venue_id');
  const [userNewVal, setUserNewVal] = useState(null);
  const [reason, setReason] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const [verifiedImpact, setVerifiedImpact] = useState(null);
  const [aiResponse, setAiResponse] = useState(null);

  const selectedSessionId = userSessionId ?? preselectedSession?.id ?? (sessions[0]?.id || '');
  const currentSession = sessions.find((s) => s.id === selectedSessionId);

  const defaultOtherVenue = venues.find((v) => v.id !== currentSession?.venue_id)?.id || '';
  const newValue = userNewVal ?? (fieldName === 'venue_id' ? defaultOtherVenue : '');

  const setSelectedSessionId = (id) => {
    setUserSessionId(id);
    setUserNewVal(null);
  };

  const setNewValue = (val) => {
    setUserNewVal(val);
  };

  const applyPreset = (sessionId, targetVenueId, presetReason) => {
    setSelectedSessionId(sessionId);
    setFieldName('venue_id');
    setNewValue(targetVenueId);
    setReason(presetReason);
    setError(null);
    setVerifiedImpact(null);
    setAiResponse(null);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedSessionId) {
      setError('Please select a target session.');
      return;
    }
    if (!newValue) {
      setError('Please provide or select the new value.');
      return;
    }
    if (!reason.trim()) {
      setError('An operational reason is required by backend validation.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setVerifiedImpact(null);
    setAiResponse(null);

    try {
      const payload = {
        entity_type: 'session',
        entity_id: selectedSessionId,
        field_name: fieldName,
        new_value: newValue,
        reason: reason.trim(),
      };

      // 1. Backend deterministic change transaction
      const impactResult = await api.createChange(eventId, payload);
      setVerifiedImpact(impactResult);
      setIsProcessing(false);

      if (onSuccess) onSuccess(impactResult);

      // 2. Request AI Analysis
      if (impactResult?.change_id) {
        setIsAnalyzing(true);
        try {
          const aiResult = await api.analyzeChange(impactResult.change_id);
          setAiResponse(aiResult);
        } catch (aiErr) {
          console.error('AI impact analysis call failed:', aiErr);
        } finally {
          setIsAnalyzing(false);
        }
      }
    } catch (err) {
      setIsProcessing(false);
      setError(err?.detail || err?.message || 'Change processing failed');
    }
  };

  const handleManualAnalyze = async () => {
    if (!verifiedImpact?.change_id) return;
    setIsAnalyzing(true);
    try {
      const result = await api.analyzeChange(verifiedImpact.change_id);
      setAiResponse(result);
    } catch (err) {
      setError(`AI analysis request error: ${err?.detail || err?.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentVenue = venues.find((v) => v.id === currentSession?.venue_id);
  const destinationVenue = venues.find((v) => v.id === newValue);

  return (
    <div className={isModal ? 'cc-modal-window' : 'cc-card'}>
      {isModal && (
        <div className="cc-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚡</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
                Operational Change Workflow
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Deterministic Transaction Engine &bull; Event: {eventId}
              </div>
            </div>
          </div>
          {onClose && (
            <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
      )}

      <div style={{ padding: isModal ? '20px' : '0' }}>
        {/* Quick Scenario Buttons */}
        <div style={{ backgroundColor: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.2)', borderRadius: '6px', padding: '10px 12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-cyan)', marginBottom: '6px' }}>
            🎯 Quick Demo Scenarios (One-Click Setup)
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="cc-btn cc-btn-secondary cc-btn-sm"
              onClick={() => applyPreset('session_01', 'venue_auditorium_b', 'Auditorium A sound stage technical check requires relocation to Auditorium B.')}
            >
              Demo: Move Opening Ceremony &rarr; Aud B
            </button>
            <button
              type="button"
              className="cc-btn cc-btn-secondary cc-btn-sm"
              onClick={() => applyPreset('session_05', 'venue_auditorium_a', 'Investor pitch showcase expanded for larger audience in Auditorium A.')}
            >
              Demo: Move Startup Pitch &rarr; Aud A
            </button>
            <button
              type="button"
              className="cc-btn cc-btn-secondary cc-btn-sm"
              onClick={() => applyPreset('session_03', 'venue_innovation_lab', 'Programming workshop requires local high-power GPU lab.')}
            >
              Demo: Move Workshop &rarr; Innovation Lab
            </button>
          </div>
        </div>

        {/* Change Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '14px' }}>
            {/* Step 1: Session */}
            <div>
              <label className="cc-form-label">1. Target Session</label>
              <select
                className="cc-select"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                disabled={isProcessing}
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.venue?.name || s.venue_id})
                  </option>
                ))}
              </select>
              {currentSession && (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Current Venue: <strong style={{ color: 'var(--accent-cyan)' }}>{currentVenue?.name || currentSession.venue_id}</strong>
                </div>
              )}
            </div>

            {/* Step 2: Field */}
            <div>
              <label className="cc-form-label">2. Operational Field</label>
              <select
                className="cc-select"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                disabled={isProcessing}
              >
                <option value="venue_id">Relocate Venue (venue_id)</option>
                <option value="status">Change Status (status)</option>
                <option value="title">Update Title (title)</option>
              </select>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Primary demo path: Relocate Venue
              </div>
            </div>

            {/* Step 3: Destination / Value */}
            <div>
              <label className="cc-form-label">3. New Proposed Value</label>
              {fieldName === 'venue_id' ? (
                <select
                  className="cc-select"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  disabled={isProcessing}
                >
                  <option value="">-- Choose Venue --</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id} disabled={v.id === currentSession?.venue_id}>
                      {v.name} (Cap: {v.capacity}) {v.id === currentSession?.venue_id ? '— (Current)' : ''}
                    </option>
                  ))}
                </select>
              ) : fieldName === 'status' ? (
                <select
                  className="cc-select"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  disabled={isProcessing}
                >
                  <option value="scheduled">scheduled</option>
                  <option value="delayed">delayed</option>
                  <option value="in_progress">in_progress</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              ) : (
                <input
                  type="text"
                  className="cc-input"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="New value..."
                  disabled={isProcessing}
                />
              )}
              {fieldName === 'venue_id' && destinationVenue && (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Cap: {destinationVenue.capacity} &bull; Location: {destinationVenue.location}
                </div>
              )}
            </div>
          </div>

          {/* Operational Reason */}
          <div style={{ marginBottom: '14px' }}>
            <label className="cc-form-label">4. Operational Reason (Required by Validation)</label>
            <input
              type="text"
              className="cc-input"
              placeholder="e.g. Stage lighting issue in Auditorium A requires moving keynote to Auditorium B."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          {/* Proposed Delta Preview */}
          {currentSession && newValue && (
            <div style={{ backgroundColor: 'rgba(9, 13, 22, 0.6)', border: '1px dashed var(--border-mid)', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                  PROPOSED SHIFT:
                </span>
                <span style={{ marginLeft: '6px', fontSize: '12px', fontWeight: 600 }}>
                  {currentSession.title}
                </span>
                <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>&bull;</span>
                <span style={{ color: 'var(--accent-rose)', fontSize: '12px' }}>
                  {currentVenue?.name || currentSession.venue_id}
                </span>
                <span style={{ margin: '0 4px', color: 'var(--text-muted)' }}>&rarr;</span>
                <span style={{ color: 'var(--accent-emerald)', fontSize: '12px', fontWeight: 700 }}>
                  {destinationVenue?.name || newValue}
                </span>
              </div>
              <span className="cc-badge cyan">READY</span>
            </div>
          )}

          {error && (
            <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '6px', padding: '10px 14px', color: '#fecdd3', fontSize: '12px', marginBottom: '14px' }}>
              <strong>Change Rejected by Backend:</strong> {error}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="submit"
              className="cc-btn cc-btn-primary"
              disabled={isProcessing || !selectedSessionId || !newValue || !reason.trim()}
              style={{ minWidth: '180px' }}
            >
              {isProcessing ? 'Processing change...' : '⚡ Submit Operational Change'}
            </button>
            {isProcessing && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Validating atomic database constraints and conflicts...
              </span>
            )}
          </div>
        </form>

        {/* Live Change Results */}
        {verifiedImpact && (
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-dim)', paddingTop: '16px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
                  TRANSACTION COMMITTED
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Change Record ID: <code>{verifiedImpact.change_id}</code>
                </div>
              </div>
              <span className="cc-badge green">DATABASE APPLIED</span>
            </div>

            {/* Conflicts */}
            <ConflictPanel conflicts={verifiedImpact.conflicts} />

            {/* Deterministic Verified Impact */}
            <ImpactPanel verifiedImpact={verifiedImpact} />

            {/* AI Analysis */}
            <AiAnalysisPanel
              aiResponse={aiResponse}
              isLoading={isAnalyzing}
              onTriggerAnalyze={handleManualAnalyze}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ChangePanel;
