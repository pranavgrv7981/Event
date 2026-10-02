import React from 'react';
import StatsCard from '../components/StatsCard';
import ConflictPanel from '../components/ConflictPanel';
import SessionTable from '../components/SessionTable';
import TaskList from '../components/TaskList';
import RiskPanel from '../components/RiskPanel';

export function DashboardPage({
  event,
  dashboard,
  sessions = [],
  venues = [],
  tasks = [],
  risks = [],
  recentChanges = [],
  onInitiateChange,
  onInspectDependencies,
  onNavigateTab,
  onUpdateTaskStatus,
  onUpdateRiskStatus,
  isUpdating = false,
}) {
  const activeConflicts = dashboard?.active_conflicts || [];
  const openTasksCount = dashboard?.tasks?.todo ?? tasks.filter(t => t.status === 'open' || t.status === 'todo').length;
  const inProgressTasksCount = dashboard?.tasks?.in_progress ?? tasks.filter(t => t.status === 'in_progress').length;
  const highRisksCount = dashboard?.risks?.high ?? risks.filter(r => r.severity === 'high' || r.severity === 'critical').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Event Header Banner */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>⚡</span>
            <div>
              <h1 style={{ fontSize: '20px', margin: 0, fontWeight: 800, letterSpacing: '-0.01em' }}>
                {event?.name || 'KBC TechFest 2026'}
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {event?.description || 'Event Operations & Deterministic Impact Command Center'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateTab('demo')}
          >
            🎯 Launch Demo Flow
          </button>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => onInitiateChange()}
          >
            ⚡ Operational Change
          </button>
        </div>
      </div>

      {/* Stats Counter Grid */}
      <div className="stats-grid">
        <StatsCard
          label="Total Sessions"
          value={dashboard?.sessions?.total ?? sessions.length}
          subtext="Across 7 campus venues"
          color="blue"
          icon="📅"
          onClick={() => onNavigateTab('sessions')}
        />
        <StatsCard
          label="Active Conflicts"
          value={activeConflicts.length}
          subtext={activeConflicts.length > 0 ? "Requires schedule adjustment" : "All clean"}
          color={activeConflicts.length > 0 ? "rose" : "emerald"}
          icon="⚠️"
          onClick={() => onNavigateTab('dashboard')}
        />
        <StatsCard
          label="Open Tasks"
          value={openTasksCount}
          subtext={`${inProgressTasksCount} currently in progress`}
          color="amber"
          icon="✅"
          onClick={() => onNavigateTab('tasks')}
        />
        <StatsCard
          label="High Risks"
          value={highRisksCount}
          subtext={`${risks.length} total monitored risks`}
          color={highRisksCount > 0 ? "rose" : "neutral"}
          icon="🛡️"
          onClick={() => onNavigateTab('risks')}
        />
        <StatsCard
          label="Changes Recorded"
          value={dashboard?.recent_changes?.length ?? recentChanges.length}
          subtext="Audited in database"
          color="purple"
          icon="🔄"
          onClick={() => onNavigateTab('changes')}
        />
      </div>

      {/* Main Dual-Column Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Conflicts & Sessions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Active Conflicts Panel */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                Live Conflict Monitor
              </h2>
              <span className={`badge ${activeConflicts.length > 0 ? 'rose' : 'emerald'}`}>
                {activeConflicts.length} DETECTED
              </span>
            </div>
            <ConflictPanel 
              conflicts={activeConflicts} 
              onInspectEntity={(id) => {
                if (id.startsWith('session_')) onInspectDependencies('session', id);
                else if (id.startsWith('venue_')) onInspectDependencies('venue', id);
                else if (id.startsWith('speaker_')) onInspectDependencies('speaker', id);
                else if (id.startsWith('volunteer_')) onInspectDependencies('volunteer', id);
              }} 
            />
          </div>

          {/* Program Sessions Table */}
          <SessionTable
            sessions={sessions}
            venues={venues}
            onInitiateChange={onInitiateChange}
            onInspectDependencies={onInspectDependencies}
          />
        </div>

        {/* Right Column: Urgent Tasks & Risks & Recent Changes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Recent Changes Log */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <span>🔄</span>
                <span>Recent Operational Changes</span>
              </div>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateTab('changes')}
                style={{ padding: '2px 8px', fontSize: '10px' }}
              >
                View All
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentChanges.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                  No recent changes recorded.
                </div>
              ) : (
                recentChanges.slice(0, 4).map((ch) => (
                  <div 
                    key={ch.id}
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#93c5fd' }}>
                        {ch.entity_type}/{ch.entity_id} &bull; {ch.field_name}
                      </strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {ch.id}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                      <span style={{ color: '#f87171' }}>{ch.old_value ?? 'none'}</span>
                      <span>&rarr;</span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>{ch.new_value ?? 'none'}</span>
                    </div>
                    {ch.reason && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                        &ldquo;{ch.reason}&rdquo;
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Operational Tasks Quick View */}
          <TaskList
            tasks={tasks.slice(0, 5)}
            isUpdating={isUpdating}
            onUpdateTaskStatus={onUpdateTaskStatus}
          />

          {/* Risk Register Quick View */}
          <RiskPanel
            risks={risks.slice(0, 4)}
            isUpdating={isUpdating}
            onUpdateRiskStatus={onUpdateRiskStatus}
          />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
