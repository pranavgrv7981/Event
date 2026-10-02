import React from 'react';

export function AiAnalysisPanel({ aiAnalysisResponse, isLoading = false, onTriggerAnalyze }) {
  if (isLoading) {
    return (
      <div className="ai-analysis-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
        <div className="spinner" style={{ borderTopColor: 'var(--accent-cyan)', margin: '0 auto 16px' }} />
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Generating Operational AI Analysis...
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Interpreting verified backend impact via Gemini / Core AI layer
        </div>
      </div>
    );
  }

  if (!aiAnalysisResponse) {
    return (
      <div className="ai-analysis-card">
        <div className="ai-analysis-header">
          <div className="ai-title">
            <span>✨</span>
            <span>AI IMPACT ANALYSIS</span>
          </div>
          <span className="badge neutral">READY</span>
        </div>
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Request AI-powered operational synthesis, key impact highlights, and prioritized recommendations based on verified facts.
          </p>
          {onTriggerAnalyze && (
            <button className="btn btn-primary" onClick={onTriggerAnalyze} style={{ backgroundColor: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)', color: '#091e2b', fontWeight: 700 }}>
              ✨ Generate AI Analysis
            </button>
          )}
        </div>
      </div>
    );
  }

  const { analysis, analysis_type, provider } = aiAnalysisResponse;
  const isHigh = analysis?.priority === 'high';
  const isMedium = analysis?.priority === 'medium';
  const priorityColor = isHigh ? 'rose' : isMedium ? 'amber' : 'blue';

  return (
    <div className="ai-analysis-card">
      <div className="ai-analysis-header">
        <div>
          <div className="ai-title">
            <span>✨</span>
            <span>AI IMPACT ANALYSIS</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Provider: <strong style={{ color: 'var(--accent-cyan)' }}>{provider?.toUpperCase() || 'GEMINI'}</strong> &bull; Type: <strong>{analysis_type?.replace(/_/g, ' ').toUpperCase()}</strong>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`badge ${priorityColor}`} style={{ fontWeight: 800, padding: '5px 10px', fontSize: '12px' }}>
            PRIORITY: {analysis?.priority?.toUpperCase()}
          </span>
          <span className="badge cyan" style={{ fontSize: '10px' }}>
            {provider === 'gemini' ? 'GOOGLE GEMINI' : 'DETERMINISTIC FALLBACK'}
          </span>
        </div>
      </div>

      {/* Summary */}
      {analysis?.summary && (
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
            Executive Operational Summary
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {analysis.summary}
          </p>
        </div>
      )}

      {/* Grid: Key Impacts & Recommended Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {/* Key Impacts */}
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🔍</span>
            <span>Key Impacts Identified ({analysis?.key_impacts?.length || 0})</span>
          </div>
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {analysis?.key_impacts && analysis.key_impacts.length > 0 ? (
              analysis.key_impacts.map((impact, idx) => (
                <li key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>&bull;</span>
                  <span>{impact}</span>
                </li>
              ))
            ) : (
              <li style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No critical key impacts flagged.</li>
            )}
          </ul>
        </div>

        {/* Recommended Actions */}
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-emerald)', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📋</span>
            <span>Recommended Actions ({analysis?.recommended_actions?.length || 0})</span>
          </div>
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {analysis?.recommended_actions && analysis.recommended_actions.length > 0 ? (
              analysis.recommended_actions.map((action, idx) => (
                <li key={idx} style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>✓</span>
                  <span>{action}</span>
                </li>
              ))
            ) : (
              <li style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No immediate actions required.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Warnings */}
      {analysis?.warnings && analysis.warnings.length > 0 && (
        <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '6px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#fda4af', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️</span>
            <span>Operational Warnings & Constraints ({analysis.warnings.length})</span>
          </div>
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {analysis.warnings.map((warning, idx) => (
              <li key={idx} style={{ fontSize: '12px', color: '#fecdd3', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: 'var(--accent-rose)' }}>&bull;</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Architecture Disclaimer */}
      <div style={{ marginTop: '12px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
        AI analysis is probabilistic interpretation grounded strictly on backend verified impact data. Persisted facts remain with SQLAlchemy/SQLite.
      </div>
    </div>
  );
}

export default AiAnalysisPanel;
