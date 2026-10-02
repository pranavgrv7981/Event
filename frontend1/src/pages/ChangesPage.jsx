import React, { useState } from 'react';
import api from '../services/api';
import ImpactPanel from '../components/ImpactPanel';
import AiAnalysisPanel from '../components/AiAnalysisPanel';
import { LoadingState } from '../components/LoadingState';

export function ChangesPage({
  changes = [],
  onInitiateChange,
  onRefreshChanges,
}) {
  const [selectedChangeId, setSelectedChangeId] = useState(null);
  const [changeTasks, setChangeTasks] = useState([]);
  const [changeRisks, setChangeRisks] = useState([]);
  const [aiResponse, setAiResponse] = useState(null);
  const [verifiedImpact, setVerifiedImpact] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSelectChange = async (changeId) => {
    if (selectedChangeId === changeId) {
      setSelectedChangeId(null);
      return;
    }

    setSelectedChangeId(changeId);
    setIsLoading(true);
    setChangeTasks([]);
    setChangeRisks([]);
    setAiResponse(null);
    setVerifiedImpact(null);

    try {
      const [tasksRes, risksRes] = await Promise.allSettled([
        api.getChangeTasks(changeId),
        api.getChangeRisks(changeId),
      ]);

      if (tasksRes.status === 'fulfilled') setChangeTasks(tasksRes.value);
      if (risksRes.status === 'fulfilled') setChangeRisks(risksRes.value);
    } catch (err) {
      console.error('Failed to load change details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async (changeId) => {
    setIsAnalyzing(true);
    try {
      const res = await api.analyzeChange(changeId);
      setAiResponse(res);
      if (res?.verified_impact) setVerifiedImpact(res.verified_impact);
    } catch (err) {
      console.error('AI analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800 }}>Operational Change Audit Log</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            Immutable ledger of all schedule, venue, and status alterations with verified causality.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={onRefreshChanges}>
            ↻ Refresh Log
          </button>
          <button className="cc-btn cc-btn-primary cc-btn-sm" onClick={() => onInitiateChange()}>
            ⚡ New Change
          </button>
        </div>
      </div>

      <div className="cc-card">
        <div className="cc-card-header">
          <div className="cc-card-title">
            <span>🔄</span>
            <span>Recorded Changes ({changes.length})</span>
          </div>
        </div>

        <div className="cc-table-wrapper">
          <table className="cc-table">
            <thead>
              <tr>
                <th>Change ID</th>
                <th>Target</th>
                <th>Field</th>
                <th>Delta</th>
                <th>Reason</th>
                <th>Time</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {changes.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No operational changes recorded yet.
                  </td>
                </tr>
              ) : (
                changes.map((ch) => {
                  const isSelected = selectedChangeId === ch.id;
                  return (
                    <React.Fragment key={ch.id}>
                      <tr style={{ backgroundColor: isSelected ? 'var(--bg-card-hover)' : undefined }}>
                        <td><code>{ch.id}</code></td>
                        <td>
                          <span className="cc-badge neutral">{ch.entity_type}</span>{' '}
                          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{ch.entity_id}</span>
                        </td>
                        <td><code>{ch.field_name}</code></td>
                        <td>
                          <span style={{ color: '#fb7185' }}>{ch.old_value ?? 'none'}</span> &rarr;{' '}
                          <span style={{ color: '#34d399', fontWeight: 600 }}>{ch.new_value ?? 'none'}</span>
                        </td>
                        <td>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ch.reason}>
                            {ch.reason}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '11px' }}>{formatDate(ch.created_at)}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ch.created_by || 'Operations'}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button
                              className="cc-btn cc-btn-secondary cc-btn-sm"
                              onClick={() => handleSelectChange(ch.id)}
                            >
                              {isSelected ? '▲ Hide' : '▼ Details'}
                            </button>
                            <button
                              className="cc-btn cc-btn-primary cc-btn-sm"
                              style={{ backgroundColor: 'var(--accent-purple)' }}
                              onClick={() => {
                                handleSelectChange(ch.id);
                                handleAnalyze(ch.id);
                              }}
                            >
                              ✨ AI
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isSelected && (
                        <tr>
                          <td colSpan="7" style={{ backgroundColor: 'rgba(9, 13, 22, 0.95)', padding: '16px' }}>
                            {isLoading ? (
                              <LoadingState message="Loading change consequences..." />
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ backgroundColor: 'rgba(19, 27, 46, 0.8)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-dim)' }}>
                                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '2px' }}>
                                    Operational Reason
                                  </div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                                    &ldquo;{ch.reason}&rdquo;
                                  </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                                  <div style={{ backgroundColor: 'rgba(9, 13, 22, 0.6)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-dim)' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-amber)', fontWeight: 700, marginBottom: '6px' }}>
                                      ✅ Follow-Up Tasks ({changeTasks.length})
                                    </div>
                                    {changeTasks.length === 0 ? (
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No follow-up tasks linked.</div>
                                    ) : (
                                      changeTasks.map((t) => (
                                        <div key={t.id} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                          <span>{t.title}</span>
                                          <span className="cc-badge neutral">{t.status}</span>
                                        </div>
                                      ))
                                    )}
                                  </div>

                                  <div style={{ backgroundColor: 'rgba(9, 13, 22, 0.6)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-dim)' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-rose)', fontWeight: 700, marginBottom: '6px' }}>
                                      ⚠️ Associated Risks ({changeRisks.length})
                                    </div>
                                    {changeRisks.length === 0 ? (
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No associated risks recorded.</div>
                                    ) : (
                                      changeRisks.map((r) => (
                                        <div key={r.id} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                          <span>{r.title}</span>
                                          <span className="cc-badge rose">{r.severity}</span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>

                                {verifiedImpact && <ImpactPanel verifiedImpact={verifiedImpact} />}

                                <AiAnalysisPanel
                                  aiResponse={aiResponse}
                                  isLoading={isAnalyzing}
                                  onTriggerAnalyze={() => handleAnalyze(ch.id)}
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ChangesPage;
