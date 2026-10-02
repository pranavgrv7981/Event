import React, { useState } from 'react';
import api from '../services/api';
import AiAnalysisPanel from '../components/AiAnalysisPanel';
import ImpactPanel from '../components/ImpactPanel';
import { LoadingState } from '../components/LoadingState';

export function ChangesPage({
  changes = [],
  onInitiateChange,
  onRefreshChanges,
}) {
  const [selectedChangeId, setSelectedChangeId] = useState(null);
  const [changeTasks, setChangeTasks] = useState([]);
  const [changeRisks, setChangeRisks] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [verifiedImpact, setVerifiedImpact] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSelectChange = async (changeId) => {
    if (selectedChangeId === changeId) {
      setSelectedChangeId(null);
      return;
    }

    setSelectedChangeId(changeId);
    setIsLoadingDetails(true);
    setChangeTasks([]);
    setChangeRisks([]);
    setAiAnalysis(null);
    setVerifiedImpact(null);

    try {
      const [tasksRes, risksRes] = await Promise.allSettled([
        api.getChangeTasks(changeId),
        api.getChangeRisks(changeId),
      ]);

      if (tasksRes.status === 'fulfilled') setChangeTasks(tasksRes.value);
      if (risksRes.status === 'fulfilled') setChangeRisks(risksRes.value);
    } catch (err) {
      console.error('Failed to load change relations:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleAnalyzeChange = async (changeId) => {
    setIsAnalyzing(true);
    try {
      const result = await api.analyzeChange(changeId);
      setAiAnalysis(result);
      if (result.verified_impact) {
        setVerifiedImpact(result.verified_impact);
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Operational Change Audit Log</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Immutable history of all venue shifts, status overrides, and schedule alterations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onRefreshChanges}>
            ↻ Refresh Log
          </button>
          <button className="btn btn-primary" onClick={() => onInitiateChange()} style={{ fontWeight: 700 }}>
            ⚡ New Change
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>🔄</span>
            <span>Recorded Changes ({changes.length})</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Change ID</th>
                <th>Target Entity</th>
                <th>Field</th>
                <th>Delta (Old &rarr; New)</th>
                <th>Reason</th>
                <th>Author / Time</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {changes.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No operational changes have been recorded yet.
                  </td>
                </tr>
              ) : (
                changes.map((ch) => {
                  const isSelected = selectedChangeId === ch.id;
                  return (
                    <React.Fragment key={ch.id}>
                      <tr style={{ backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : undefined }}>
                        <td>
                          <code style={{ fontSize: '11px', color: '#93c5fd' }}>{ch.id}</code>
                        </td>
                        <td>
                          <span className="badge neutral">{ch.entity_type}</span>
                          <span style={{ marginLeft: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{ch.entity_id}</span>
                        </td>
                        <td>
                          <code style={{ fontSize: '11px' }}>{ch.field_name}</code>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <span style={{ color: '#f87171' }}>{ch.old_value ?? 'none'}</span>
                            <span>&rarr;</span>
                            <span style={{ color: '#34d399', fontWeight: 600 }}>{ch.new_value ?? 'none'}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ch.reason}>
                            {ch.reason}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{ch.created_by || 'Operations'}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatDate(ch.created_at)}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleSelectChange(ch.id)}
                            >
                              {isSelected ? '▲ Hide' : '▼ Details'}
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                handleSelectChange(ch.id);
                                handleAnalyzeChange(ch.id);
                              }}
                              style={{ backgroundColor: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)', color: '#091e2b' }}
                            >
                              ✨ AI Analyze
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isSelected && (
                        <tr>
                          <td colSpan="7" style={{ backgroundColor: 'rgba(10, 15, 25, 0.95)', padding: '20px' }}>
                            {isLoadingDetails ? (
                              <LoadingState message="Loading change relations..." />
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Change Explanation */}
                                <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                                    Operational Rationale
                                  </div>
                                  <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                                    &ldquo;{ch.reason}&rdquo;
                                  </div>
                                </div>

                                {/* Generated Tasks & Risks */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                  <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-amber)', fontWeight: 700, marginBottom: '8px' }}>
                                      ✅ Follow-Up Operational Tasks ({changeTasks.length})
                                    </div>
                                    {changeTasks.length === 0 ? (
                                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No follow-up tasks linked.</div>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {changeTasks.map((t) => (
                                          <div key={t.id} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{t.title}</span>
                                            <span className="badge neutral" style={{ fontSize: '10px' }}>{t.status}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-rose)', fontWeight: 700, marginBottom: '8px' }}>
                                      ⚠️ Related Risks Identified ({changeRisks.length})
                                    </div>
                                    {changeRisks.length === 0 ? (
                                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No associated risks recorded.</div>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {changeRisks.map((r) => (
                                          <div key={r.id} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{r.title}</span>
                                            <span className="badge rose" style={{ fontSize: '10px' }}>{r.severity}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Reconstructed Verified Impact (if analyzed) */}
                                {verifiedImpact && (
                                  <ImpactPanel verifiedImpact={verifiedImpact} />
                                )}

                                {/* AI Impact Analysis */}
                                <AiAnalysisPanel
                                  aiAnalysisResponse={aiAnalysis}
                                  isLoading={isAnalyzing}
                                  onTriggerAnalyze={() => handleAnalyzeChange(ch.id)}
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
