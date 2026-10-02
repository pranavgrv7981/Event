import React, { useState } from 'react';
import api from '../services/api';
import ImpactPanel from './ImpactPanel';
import ConflictPanel from './ConflictPanel';
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
  const [userSelectedSessionId, setUserSelectedSessionId] = useState(null);
  const [fieldName, setFieldName] = useState('venue_id');
  const [userNewValue, setUserNewValue] = useState(null);
  const [reason, setReason] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  
  const [verifiedImpact, setVerifiedImpact] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const selectedSessionId = userSelectedSessionId ?? preselectedSession?.id ?? (sessions[0]?.id || '');
  const currentSession = sessions.find((s) => s.id === selectedSessionId);
  
  const defaultVenueId = venues.find((v) => v.id !== currentSession?.venue_id)?.id || '';
  const newValue = userNewValue ?? (fieldName === 'venue_id' ? defaultVenueId : '');

  const setSelectedSessionId = (id) => {
    setUserSelectedSessionId(id);
    setUserNewValue(null);
  };

  const setNewValue = (val) => {
    setUserNewValue(val);
  };

  // Quick preset triggers
  const applyPreset = (sessionId, targetVenueId, presetReason) => {
    setSelectedSessionId(sessionId);
    setFieldName('venue_id');
    setNewValue(targetVenueId);
    setReason(presetReason);
    setError(null);
    setVerifiedImpact(null);
    setAiAnalysis(null);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedSessionId) {
      setError('Please select a session');
      return;
    }
    if (!newValue) {
      setError('Please select or specify the new value');
      return;
    }
    if (!reason.trim()) {
      setError('A operational reason is required by backend validation');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setVerifiedImpact(null);
    setAiAnalysis(null);

    try {
      const payload = {
        entity_type: 'session',
        entity_id: selectedSessionId,
        field_name: fieldName,
        new_value: newValue,
        reason: reason.trim(),
      };

      // 1. Process deterministic change on backend
      const impactResult = await api.createEventChange(eventId, payload);
      setVerifiedImpact(impactResult);
      setIsProcessing(false);

      if (onSuccess) {
        onSuccess(impactResult);
      }

      // 2. Request AI Analysis from backend
      if (impactResult?.change_id) {
        setIsAnalyzing(true);
        try {
          const aiResult = await api.analyzeChange(impactResult.change_id);
          setAiAnalysis(aiResult);
        } catch (aiErr) {
          console.error('AI analysis request error:', aiErr);
          // Backend AI error is non-blocking for verified impact
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
      const aiResult = await api.analyzeChange(verifiedImpact.change_id);
      setAiAnalysis(aiResult);
    } catch (err) {
      setError(`AI Analysis Error: ${err?.detail || err?.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentVenueObj = venues.find(v => v.id === currentSession?.venue_id);
  const newVenueObj = venues.find(v => v.id === newValue);

  return (
    <div className={isModal ? 'modal-container' : 'card'} style={{ maxWidth: isModal ? '900px' : '100%' }}>
      {isModal && (
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                OPERATIONAL CHANGE WORKFLOW
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Target: Event ID {eventId} &bull; Deterministic Backend Transaction
              </div>
            </div>
          </div>
          {onClose && (
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              ✕ Close
            </button>
          )}
        </div>
      )}

      <div style={{ padding: isModal ? '24px' : '0' }}>
        {/* Preset Bar for quick demonstration */}
        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '6px', padding: '12px 14px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-blue)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🎯</span>
            <span>Quick Demo Scenarios (One-Click Setup)</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => applyPreset('session_01', 'venue_auditorium_b', 'Auditorium A sound stage technical check requires relocation to Auditorium B.')}
            >
              Demo 1: Move Opening Ceremony &rarr; Aud B
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => applyPreset('session_05', 'venue_auditorium_a', 'Investor pitch showcase expanded for larger audience in Auditorium A.')}
            >
              Demo 2: Move Startup Pitch &rarr; Aud A
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => applyPreset('session_03', 'venue_innovation_lab', 'Hands-on programming workshop requires high-power GPU lab.')}
            >
              Demo 3: Move Workshop &rarr; Innovation Lab
            </button>
          </div>
        </div>

        {/* Change Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {/* Step 1: Select Session */}
            <div className="form-group">
              <label className="form-label">1. Select Target Session</label>
              <select
                className="form-select"
                value={selectedSessionId}
                onChange={(e) => {
                  setSelectedSessionId(e.target.value);
                  setNewValue('');
                }}
                disabled={isProcessing}
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.venue?.name || s.venue_id})
                  </option>
                ))}
              </select>
              {currentSession && (
                <div className="form-help">
                  Current Venue: <strong style={{ color: '#93c5fd' }}>{currentVenueObj?.name || currentSession.venue_id}</strong>
                </div>
              )}
            </div>

            {/* Step 2: Choose Field */}
            <div className="form-group">
              <label className="form-label">2. Field to Change</label>
              <select
                className="form-select"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                disabled={isProcessing}
              >
                <option value="venue_id">Relocate Venue (venue_id)</option>
                <option value="status">Change Status (status)</option>
                <option value="title">Update Title (title)</option>
              </select>
              <div className="form-help">
                Primary demo path: Relocate Venue
              </div>
            </div>

            {/* Step 3: New Value */}
            <div className="form-group">
              <label className="form-label">3. Select New Value</label>
              {fieldName === 'venue_id' ? (
                <select
                  className="form-select"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  disabled={isProcessing}
                >
                  <option value="">-- Select Destination Venue --</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id} disabled={v.id === currentSession?.venue_id}>
                      {v.name} (Cap: {v.capacity}) {v.id === currentSession?.venue_id ? '— (Current)' : ''}
                    </option>
                  ))}
                </select>
              ) : fieldName === 'status' ? (
                <select
                  className="form-select"
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
                  className="form-control"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Enter new value..."
                  disabled={isProcessing}
                />
              )}
              {fieldName === 'venue_id' && newVenueObj && (
                <div className="form-help">
                  Capacity: {newVenueObj.capacity} &bull; Location: {newVenueObj.location}
                </div>
              )}
            </div>
          </div>

          {/* Reason Input */}
          <div className="form-group">
            <label className="form-label">4. Operational Reason (Required)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Stage lighting issue in Auditorium A requires moving keynote to Auditorium B."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isProcessing}
            />
            <div className="form-help">
              This operational explanation is recorded in the immutable audit log and supplied to the AI impact analyzer.
            </div>
          </div>

          {/* Live Review Preview */}
          {currentSession && newValue && (
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px dashed var(--border-default)', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Proposed Shift:</span>
                <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {currentSession.title}
                </span>
                <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>&bull;</span>
                <span style={{ color: '#f87171', fontSize: '12px' }}>
                  {currentVenueObj?.name || currentSession.venue_id}
                </span>
                <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>&rarr;</span>
                <span style={{ color: '#34d399', fontSize: '12px', fontWeight: 700 }}>
                  {newVenueObj?.name || newValue}
                </span>
              </div>
              <span className="badge blue">READY TO SUBMIT</span>
            </div>
          )}

          {error && (
            <div className="alert-banner danger" style={{ marginBottom: '16px' }}>
              <span className="alert-icon">⚠️</span>
              <div className="alert-content">
                <div className="alert-title">Change Rejected by Backend</div>
                <div className="alert-description">{error}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isProcessing || !selectedSessionId || !newValue || !reason.trim()}
              style={{ fontWeight: 700, minWidth: '200px' }}
            >
              {isProcessing ? (
                <>
                  <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', margin: 0 }} />
                  <span>Processing change...</span>
                </>
              ) : (
                <>⚡ Submit Operational Change</>
              )}
            </button>
            {isProcessing && (
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Validating dependencies & detecting conflicts in SQLite transaction...
              </span>
            )}
          </div>
        </form>

        {/* Impact & Conflict & AI Analysis Display */}
        {verifiedImpact && (
          <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  TRANSACTION RESULT: CHANGE APPLIED
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Change Record ID: <strong style={{ fontFamily: 'var(--font-mono)' }}>{verifiedImpact.change_id}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge emerald">TRANSACTION COMMITTED</span>
              </div>
            </div>

            {/* Section 1: Conflicts (if any) */}
            <ConflictPanel conflicts={verifiedImpact.conflicts} />

            {/* Section 2: Verified Impact (Deterministic facts) */}
            <ImpactPanel verifiedImpact={verifiedImpact} />

            {/* Section 3: AI Impact Analysis */}
            <AiAnalysisPanel
              aiAnalysisResponse={aiAnalysis}
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
