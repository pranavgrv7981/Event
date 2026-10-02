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
  const openTasks = dashboard?.tasks?.todo ?? tasks.filter((t) => t.status === 'open' || t.status === 'todo').length;
  const inProgressTasks = dashboard?.tasks?.in_progress ?? tasks.filter((t) => t.status === 'in_progress').length;
  const highRisks = dashboard?.risks?.high ?? risks.filter((r) => r.severity === 'high' || r.severity === 'critical').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Event Header Banner */}
      <div style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: '8px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 800 }}>
                {event?.name || 'KBC TechFest 2026'}
              </h1>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                {event?.description || 'Event Operations & Deterministic Impact Command Center'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={() => onNavigateTab('demo')}>
            🎯 Launch Demo Flow
          </button>
          <button className="cc-btn cc-btn-primary cc-btn-sm" onClick={() => onInitiateChange()}>
            ⚡ Operational Change
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="cc-stats-grid">
        <StatsCard
          label="Total Sessions"
          value={dashboard?.sessions?.total ?? sessions.length}
          subtext="7 campus venues"
          color="blue"
          icon="📅"
          onClick={() => onNavigateTab('sessions')}
        />
        <StatsCard
          label="Active Conflicts"
          value={activeConflicts.length}
          subtext={activeConflicts.length > 0 ? "Requires mitigation" : "Clean schedule"}
          color={activeConflicts.length > 0 ? "rose" : "green"}
          icon="⚠️"
          onClick={() => onNavigateTab('dashboard')}
        />
        <StatsCard
          label="Open Tasks"
          value={openTasks}
          subtext={`${inProgressTasks} in progress`}
          color="amber"
          icon="✅"
          onClick={() => onNavigateTab('tasks')}
        />
        <StatsCard
          label="High Risks"
          value={highRisks}
          subtext={`${risks.length} recorded risks`}
          color={highRisks > 0 ? "rose" : "blue"}
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

      {/* Dual Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Left Column: Conflicts & Sessions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Conflicts */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Conflict Detection Engine
              </div>
              <span className={`cc-badge ${activeConflicts.length > 0 ? 'rose' : 'green'}`}>
                {activeConflicts.length} FLAGGED
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

          {/* Session Table */}
          <SessionTable
            sessions={sessions}
            venues={venues}
            onInitiateChange={onInitiateChange}
            onInspectDependencies={onInspectDependencies}
          />
        </div>

        {/* Right Column: Recent Changes, Tasks, Risks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Recent Changes Box */}
          <div className="cc-card">
            <div className="cc-card-header">
              <div className="cc-card-title">
                <span>🔄</span>
                <span>Recent Changes</span>
              </div>
              <button
                className="cc-btn cc-btn-secondary cc-btn-sm"
                onClick={() => onNavigateTab('changes')}
                style={{ padding: '2px 6px', fontSize: '10px' }}
              >
                View All
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentChanges.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                  No recent changes recorded.
                </div>
              ) : (
                recentChanges.slice(0, 4).map((ch) => (
                  <div
                    key={ch.id}
                    style={{
                      backgroundColor: 'rgba(9, 13, 22, 0.6)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      border: '1px solid var(--border-dim)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        {ch.entity_type}/{ch.entity_id}
                      </strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ch.id}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#fb7185' }}>{ch.old_value ?? 'none'}</span>
                      <span>&rarr;</span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>{ch.new_value ?? 'none'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Tasks */}
          <TaskList
            tasks={tasks.slice(0, 4)}
            onUpdateTaskStatus={onUpdateTaskStatus}
            isUpdating={isUpdating}
          />

          {/* Quick Risks */}
          <RiskPanel
            risks={risks.slice(0, 3)}
            onUpdateRiskStatus={onUpdateRiskStatus}
            isUpdating={isUpdating}
          />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
