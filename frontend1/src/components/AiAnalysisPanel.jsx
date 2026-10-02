import React from 'react';

export function AiAnalysisPanel({ aiResponse, isLoading = false, onTriggerAnalyze }) {
  if (isLoading) {
    return (
      <div className="cc-ai-box" style={{ textAlign: 'center', padding: '32px 20px' }}>
        <div className="cc-spinner" style={{ borderTopColor: 'var(--accent-purple)', margin: '0 auto 12px' }} />
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
          Generating AI Operational Synthesis...
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Grounding interpretations on backend-verified facts
        </div>
      </div>
    );
  }

  if (!aiResponse) {
    return (
      <div className="cc-ai-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(139, 92, 246, 0.3)', paddingBottom: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-purple)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            AI IMPACT ANALYSIS
          </div>
          <span className="cc-badge neutral">ON DEMAND</span>
        </div>
        <div style={{ textAlign: 'center', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
            Request an automated operational synthesis, priority assessment, and recommended action checklist based on deterministic facts.
          </p>
          {onTriggerAnalyze && (
            <button className="cc-btn cc-btn-primary cc-btn-sm" onClick={onTriggerAnalyze} style={{ backgroundColor: 'var(--accent-purple)', borderColor: 'var(--accent-purple)', color: '#fff' }}>
              ✨ Request AI Analysis
            </button>
          )}
        </div>
      </div>
    );
  }

  const { analysis, provider, analysis_type } = aiResponse;
  const isHigh = analysis?.priority === 'high';
  const isMedium = analysis?.priority === 'medium';
  const priorityBadge = isHigh ? 'rose' : isMedium ? 'amber' : 'cyan';

  return (
    <div className="cc-ai-box">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid rgba(139, 92, 246, 0.3)', paddingBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-purple)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>✨</span>
            <span>AI IMPACT ANALYSIS</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
            Provider: <strong style={{ color: 'var(--accent-purple)' }}>{provider?.toUpperCase() || 'GEMINI'}</strong> &bull; Mode: <strong>{analysis_type?.replace(/_/g, ' ').toUpperCase()}</strong>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`cc-badge ${priorityBadge}`} style={{ fontSize: '11px', padding: '4px 8px' }}>
            PRIORITY: {analysis?.priority?.toUpperCase()}
          </span>
          <span className="cc-badge neutral" style={{ fontSize: '9px' }}>
            {provider === 'gemini' ? 'GOOGLE GEMINI' : 'DETERMINISTIC FALLBACK'}
          </span>
        </div>
      </div>

      {/* Summary */}
      {analysis?.summary && (
        <div style={{ backgroundColor: 'rgba(9, 13, 22, 0.7)', border: '1px solid var(--border-dim)', borderRadius: '6px', padding: '12px 14px', marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
            Executive Operational Summary
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.5 }}>
            {analysis.summary}
          </div>
        </div>
      )}

      {/* Grid of Key Impacts and Recommended Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
        {/* Key Impacts */}
        <div style={{ backgroundColor: 'rgba(9, 13, 22, 0.6)', border: '1px solid var(--border-dim)', borderRadius: '6px', padding: '12px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🔍</span>
            <span>Key Impacts ({analysis?.key_impacts?.length || 0})</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {analysis?.key_impacts?.map((item, idx) => (
              <li key={idx} style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>&bull;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommended Actions */}
        <div style={{ backgroundColor: 'rgba(9, 13, 22, 0.6)', border: '1px solid var(--border-dim)', borderRadius: '6px', padding: '12px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-emerald)', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>📋</span>
            <span>Recommended Actions ({analysis?.recommended_actions?.length || 0})</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {analysis?.recommended_actions?.map((action, idx) => (
              <li key={idx} style={{ fontSize: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>✓</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Warnings */}
      {analysis?.warnings && analysis.warnings.length > 0 && (
        <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '6px', padding: '10px 12px' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#fb7185', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>⚠️</span>
            <span>Warnings & Constraints ({analysis.warnings.length})</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {analysis.warnings.map((w, idx) => (
              <li key={idx} style={{ fontSize: '11px', color: '#fecdd3', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ color: 'var(--accent-rose)' }}>&bull;</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
        Explanation layer derived from backend database facts. The backend database is the authoritative source.
      </div>
    </div>
  );
}

export default AiAnalysisPanel;
