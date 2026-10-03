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
  volunteers = [],
  equipment = [],
  speakers = [],
  currentRole = 'operations',
  onSelectRole,
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

  // Technical role filters
  const technicalConflicts = activeConflicts.filter(
    (c) => c.type === 'equipment_conflict' || c.message.toLowerCase().includes('sound') || c.message.toLowerCase().includes('auditorium')
  );
  const technicalTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes('av') ||
      t.title.toLowerCase().includes('projector') ||
      t.title.toLowerCase().includes('sound') ||
      t.title.toLowerCase().includes('tech') ||
      t.title.toLowerCase().includes('setup') ||
      t.venue_id
  );
  const technicalRisks = risks.filter(
    (r) =>
      r.title.toLowerCase().includes('capacity') ||
      r.title.toLowerCase().includes('sound') ||
      r.title.toLowerCase().includes('av') ||
      r.title.toLowerCase().includes('power') ||
      r.venue_id
  );
  const totalEquipmentUnits = equipment.reduce((sum, e) => sum + (e.quantity || 1), 0);
  const confirmedEquipment = equipment.filter((e) => e.status === 'confirmed').length;

  // Volunteer Coordinator filters
  const volunteerConflicts = activeConflicts.filter(
    (c) => c.type === 'volunteer_overlap' || c.type === 'speaker_overlap'
  );
  const volunteerTasks = tasks.filter(
    (t) =>
      t.assigned_volunteer_id != null ||
      t.title.toLowerCase().includes('volunteer') ||
      t.title.toLowerCase().includes('briefing') ||
      t.title.toLowerCase().includes('rehearsal') ||
      t.title.toLowerCase().includes('escort')
  );
  const volunteerRisks = risks.filter(
    (r) =>
      r.title.toLowerCase().includes('crowd') ||
      r.title.toLowerCase().includes('capacity') ||
      r.title.toLowerCase().includes('briefing') ||
      r.title.toLowerCase().includes('escort')
  );
  const distinctRoles = new Set(volunteers.map((v) => v.role)).size;
  const staffedSessionsCount = sessions.filter((s) => s.volunteers && s.volunteers.length > 0).length;

  // Leadership filters
  const criticalRisksList = risks.filter((r) => r.severity === 'high' || r.severity === 'critical');

  const roleMeta = {
    operations: {
      title: 'General Operations Command',
      badge: 'LOGISTICS & OPERATIONS',
      badgeColor: 'cyan',
      description: 'Unified command center tracking session schedules, atomic venue changes, live conflict detection, and operational checklists.',
    },
    technical: {
      title: 'Technical & AV Production Console',
      badge: 'AV & INFRASTRUCTURE',
      badgeColor: 'purple',
      description: 'Focused console monitoring hardware inventory, sound/projector dependencies, and technical resource collisions.',
    },
    volunteers: {
      title: 'Volunteer & Staffing Coordination',
      badge: 'STAFFING & ROSTER',
      badgeColor: 'amber',
      description: 'Dedicated roster oversight tracking volunteer assignments, shift scheduling, and double-booking conflict mitigation.',
    },
    leadership: {
      title: 'Executive & Strategic Oversight',
      badge: 'EXECUTIVE BRIEFING',
      badgeColor: 'green',
      description: 'High-level operational health index, critical hazard matrix, unresolved conflict escalation, and audited change ledger.',
    },
  };

  const currentMeta = roleMeta[currentRole] || roleMeta.operations;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Event Header Banner */}
      <div style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: '8px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 800 }}>
                  {event?.name || 'KBC TechFest 2026'} &mdash; {currentMeta.title}
                </h1>
                <span className={`cc-badge ${currentMeta.badgeColor}`} style={{ fontSize: '10px' }}>
                  {currentMeta.badge}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                {currentMeta.description}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {onSelectRole && (
            <div className="cc-role-selector" style={{ marginRight: '6px' }}>
              <button
                type="button"
                className={`cc-role-btn ${currentRole === 'operations' ? 'active' : ''}`}
                onClick={() => onSelectRole('operations')}
              >
                🎛️ Operations
              </button>
              <button
                type="button"
                className={`cc-role-btn ${currentRole === 'technical' ? 'active' : ''}`}
                onClick={() => onSelectRole('technical')}
              >
                🛠️ Technical
              </button>
              <button
                type="button"
                className={`cc-role-btn ${currentRole === 'volunteers' ? 'active' : ''}`}
                onClick={() => onSelectRole('volunteers')}
              >
                🤝 Volunteers
              </button>
              <button
                type="button"
                className={`cc-role-btn ${currentRole === 'leadership' ? 'active' : ''}`}
                onClick={() => onSelectRole('leadership')}
              >
                👑 Leadership
              </button>
            </div>
          )}

          <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={() => onNavigateTab('demo')}>
            🎯 Launch Demo Flow
          </button>
          <button className="cc-btn cc-btn-primary cc-btn-sm" onClick={() => onInitiateChange()}>
            ⚡ Operational Change
          </button>
        </div>
      </div>

      {/* KPI Stats Grid - Role Adapted */}
      {currentRole === 'operations' && (
        <div className="cc-stats-grid">
          <StatsCard
            label="Total Sessions"
            value={dashboard?.sessions?.total ?? sessions.length}
            subtext={`${venues.length} campus venues`}
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
      )}

      {currentRole === 'technical' && (
        <div className="cc-stats-grid">
          <StatsCard
            label="Total Equipment Units"
            value={totalEquipmentUnits}
            subtext={`${equipment.length} catalog items`}
            color="blue"
            icon="📦"
            onClick={() => onNavigateTab('equipment')}
          />
          <StatsCard
            label="Hardware Conflicts"
            value={technicalConflicts.length}
            subtext={technicalConflicts.length > 0 ? "AV collisions flagged" : "Zero hardware clashes"}
            color={technicalConflicts.length > 0 ? "rose" : "green"}
            icon="⚡"
            onClick={() => onNavigateTab('dashboard')}
          />
          <StatsCard
            label="Confirmed Inventory"
            value={`${confirmedEquipment} / ${equipment.length}`}
            subtext="Deployed on campus"
            color="green"
            icon="🏢"
            onClick={() => onNavigateTab('equipment')}
          />
          <StatsCard
            label="AV & Stage Tasks"
            value={technicalTasks.length}
            subtext="Sound & projector checks"
            color="amber"
            icon="🛠️"
            onClick={() => onNavigateTab('tasks')}
          />
          <StatsCard
            label="Hardware Risks"
            value={technicalRisks.length}
            subtext="Stage & venue hazards"
            color={technicalRisks.length > 0 ? "rose" : "blue"}
            icon="⚠️"
            onClick={() => onNavigateTab('risks')}
          />
        </div>
      )}

      {currentRole === 'volunteers' && (
        <div className="cc-stats-grid">
          <StatsCard
            label="Registered Volunteers"
            value={volunteers.length}
            subtext="Active staff roster"
            color="blue"
            icon="🤝"
            onClick={() => onNavigateTab('people')}
          />
          <StatsCard
            label="Staffing Conflicts"
            value={volunteerConflicts.length}
            subtext={volunteerConflicts.length > 0 ? "Double-bookings detected" : "Shift rosters clear"}
            color={volunteerConflicts.length > 0 ? "rose" : "green"}
            icon="⚠️"
            onClick={() => onNavigateTab('dashboard')}
          />
          <StatsCard
            label="Staffed Sessions"
            value={`${staffedSessionsCount} / ${sessions.length}`}
            subtext="Room coverage active"
            color="green"
            icon="📅"
            onClick={() => onNavigateTab('sessions')}
          />
          <StatsCard
            label="Volunteer Tasks"
            value={volunteerTasks.length}
            subtext="Briefings & room escort"
            color="amber"
            icon="✅"
            onClick={() => onNavigateTab('tasks')}
          />
          <StatsCard
            label="Distinct Staff Roles"
            value={distinctRoles}
            subtext="Escort, AV, Stage, Reg"
            color="purple"
            icon="👥"
            onClick={() => onNavigateTab('people')}
          />
        </div>
      )}

      {currentRole === 'leadership' && (
        <div className="cc-stats-grid">
          <StatsCard
            label="Event Health Index"
            value={activeConflicts.length === 0 ? "98% READY" : "ATTENTION"}
            subtext={activeConflicts.length === 0 ? "Operational criteria met" : "Conflicts pending action"}
            color={activeConflicts.length === 0 ? "green" : "rose"}
            icon="📊"
            onClick={() => onNavigateTab('dashboard')}
          />
          <StatsCard
            label="Critical / High Risks"
            value={criticalRisksList.length}
            subtext={`${risks.length} total event risks`}
            color={criticalRisksList.length > 0 ? "rose" : "green"}
            icon="🛡️"
            onClick={() => onNavigateTab('risks')}
          />
          <StatsCard
            label="Unresolved Conflicts"
            value={activeConflicts.length}
            subtext="Blocking schedule issues"
            color={activeConflicts.length > 0 ? "rose" : "green"}
            icon="⚠️"
            onClick={() => onNavigateTab('dashboard')}
          />
          <StatsCard
            label="Strategic Changes"
            value={recentChanges.length}
            subtext="Audited in database"
            color="purple"
            icon="🔄"
            onClick={() => onNavigateTab('changes')}
          />
          <StatsCard
            label="Program Schedule"
            value={sessions.length}
            subtext={`${venues.length} venues active`}
            color="blue"
            icon="📅"
            onClick={() => onNavigateTab('sessions')}
          />
        </div>
      )}

      {/* Role-Adapted Dual Column Layout */}
      {currentRole === 'operations' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            <SessionTable
              sessions={sessions}
              venues={venues}
              onInitiateChange={onInitiateChange}
              onInspectDependencies={onInspectDependencies}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <RecentChangesCard changes={recentChanges} onNavigateTab={onNavigateTab} />
            <TaskList tasks={tasks.slice(0, 4)} onUpdateTaskStatus={onUpdateTaskStatus} isUpdating={isUpdating} />
            <RiskPanel risks={risks.slice(0, 3)} onUpdateRiskStatus={onUpdateRiskStatus} isUpdating={isUpdating} />
          </div>
        </div>
      )}

      {currentRole === 'technical' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Technical Conflicts */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Hardware & AV Collision Monitoring
                </div>
                <span className={`cc-badge ${technicalConflicts.length > 0 ? 'rose' : 'green'}`}>
                  {technicalConflicts.length} HARDWARE ALERTS
                </span>
              </div>
              <ConflictPanel
                conflicts={technicalConflicts}
                onInspectEntity={(id) => onInspectDependencies('equipment', id)}
              />
            </div>

            {/* Equipment Resource Allocations */}
            <div className="cc-card">
              <div className="cc-card-header">
                <div className="cc-card-title">
                  <span>📦</span>
                  <span>Audio/Visual & Hardware Inventory Allocation</span>
                </div>
                <span className="cc-badge neutral">{equipment.length} Assets Registered</span>
              </div>
              <div className="cc-table-wrapper">
                <table className="cc-table">
                  <thead>
                    <tr>
                      <th>Equipment Item</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Qty</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((eq) => (
                      <tr key={eq.id}>
                        <td>
                          <strong>{eq.name}</strong>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{eq.id}</div>
                        </td>
                        <td><span className="cc-badge neutral">{eq.type || 'AV Equipment'}</span></td>
                        <td style={{ color: 'var(--accent-cyan)' }}>{eq.location || 'Campus Store'}</td>
                        <td><strong>{eq.quantity || 1}</strong></td>
                        <td>
                          <span className={`cc-badge ${eq.status === 'confirmed' ? 'green' : 'amber'}`}>
                            {eq.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="cc-btn cc-btn-secondary cc-btn-sm"
                            onClick={() => onInspectDependencies('equipment', eq.id)}
                            title="Inspect equipment dependencies"
                          >
                            🔗 Deps
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stage AV Sessions */}
            <SessionTable
              sessions={sessions}
              venues={venues}
              onInitiateChange={onInitiateChange}
              onInspectDependencies={onInspectDependencies}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="cc-card">
              <div className="cc-card-header">
                <div className="cc-card-title">
                  <span>🛠️</span>
                  <span>AV Technical Tasks ({technicalTasks.length})</span>
                </div>
              </div>
              <TaskList tasks={technicalTasks} onUpdateTaskStatus={onUpdateTaskStatus} isUpdating={isUpdating} />
            </div>

            <div className="cc-card">
              <div className="cc-card-header">
                <div className="cc-card-title">
                  <span>⚠️</span>
                  <span>Hardware & Venue Risks ({technicalRisks.length})</span>
                </div>
              </div>
              <RiskPanel risks={technicalRisks} onUpdateRiskStatus={onUpdateRiskStatus} isUpdating={isUpdating} />
            </div>
          </div>
        </div>
      )}

      {currentRole === 'volunteers' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Volunteer Staffing Conflicts */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Volunteer Double-Booking & Staffing Collisions
                </div>
                <span className={`cc-badge ${volunteerConflicts.length > 0 ? 'rose' : 'green'}`}>
                  {volunteerConflicts.length} STAFFING CONFLICTS
                </span>
              </div>
              <ConflictPanel
                conflicts={volunteerConflicts}
                onInspectEntity={(id) => onInspectDependencies('volunteer', id)}
              />
            </div>

            {/* Volunteer Staffing Roster */}
            <div className="cc-card">
              <div className="cc-card-header">
                <div className="cc-card-title">
                  <span>🤝</span>
                  <span>Volunteer Staffing Directory & Deployments</span>
                </div>
                <span className="cc-badge neutral">{volunteers.length} Staff Members</span>
              </div>
              <div className="cc-table-wrapper">
                <table className="cc-table">
                  <thead>
                    <tr>
                      <th>Volunteer</th>
                      <th>Designated Role</th>
                      <th>Contact Email</th>
                      <th>Assigned Shifts</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volunteers.map((vol) => (
                      <tr key={vol.id}>
                        <td>
                          <strong>{vol.name}</strong>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{vol.id}</div>
                        </td>
                        <td>
                          <span className="cc-badge cyan" style={{ fontSize: '10px' }}>
                            {vol.role || 'Event Assistant'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-dim)', fontSize: '11px' }}>{vol.email}</td>
                        <td>
                          {vol.assigned_sessions && vol.assigned_sessions.length > 0 ? (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {vol.assigned_sessions.map((s) => (
                                <span key={s.id} className="cc-badge neutral" style={{ fontSize: '9px' }}>
                                  {s.title}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Float / Standby</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="cc-btn cc-btn-secondary cc-btn-sm"
                            onClick={() => onInspectDependencies('volunteer', vol.id)}
                            title="Inspect volunteer dependencies"
                          >
                            🔗 Deps
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Session Coverage */}
            <SessionTable
              sessions={sessions}
              venues={venues}
              onInitiateChange={onInitiateChange}
              onInspectDependencies={onInspectDependencies}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="cc-card">
              <div className="cc-card-header">
                <div className="cc-card-title">
                  <span>📋</span>
                  <span>Volunteer Tasks ({volunteerTasks.length})</span>
                </div>
              </div>
              <TaskList tasks={volunteerTasks} onUpdateTaskStatus={onUpdateTaskStatus} isUpdating={isUpdating} />
            </div>

            <div className="cc-card">
              <div className="cc-card-header">
                <div className="cc-card-title">
                  <span>⚠️</span>
                  <span>Staffing & Crowd Hazards ({volunteerRisks.length})</span>
                </div>
              </div>
              <RiskPanel risks={volunteerRisks} onUpdateRiskStatus={onUpdateRiskStatus} isUpdating={isUpdating} />
            </div>
          </div>
        </div>
      )}

      {currentRole === 'leadership' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Executive Operational Briefing */}
            <div className="cc-card" style={{ borderLeft: '4px solid var(--accent-emerald)', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-emerald)', letterSpacing: '0.04em' }}>
                  Executive Readiness Briefing
                </div>
                <span className="cc-badge green">GOVERNANCE VERIFIED</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.6, marginBottom: '12px' }}>
                TechFest 2026 operations are currently executing across {venues.length} active university venues with {sessions.length} scheduled program sessions and {speakers.length} confirmed speaker engagements.
                {activeConflicts.length === 0
                  ? ' The deterministic constraint engine reports 0 unresolved schedule or resource collisions. Program readiness index is optimal.'
                  : ` The constraint engine has flagged ${activeConflicts.length} active operational conflict(s) requiring management attention.`}
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>Program Integrity: <strong style={{ color: 'var(--accent-emerald)' }}>Active</strong></span>
                <span>&bull;</span>
                <span>Speakers Roster: <strong style={{ color: 'var(--accent-cyan)' }}>{speakers.length} confirmed</strong></span>
                <span>&bull;</span>
                <span>Active Hazards: <strong style={{ color: criticalRisksList.length > 0 ? 'var(--accent-rose)' : 'var(--text-main)' }}>{criticalRisksList.length} High/Critical</strong></span>
                <span>&bull;</span>
                <span>Audited Changes: <strong style={{ color: 'var(--accent-purple)' }}>{recentChanges.length} committed</strong></span>
              </div>
            </div>

            {/* Critical & High Risk Governance Matrix */}
            <div className="cc-card">
              <div className="cc-card-header">
                <div className="cc-card-title">
                  <span>🛡️</span>
                  <span>Critical Risk Governance Matrix ({criticalRisksList.length})</span>
                </div>
                <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={() => onNavigateTab('risks')}>
                  Full Risk Register
                </button>
              </div>
              <div className="cc-table-wrapper">
                <table className="cc-table">
                  <thead>
                    <tr>
                      <th>Hazard / Risk Title</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Venue</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalRisksList.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                          No high or critical risks active.
                        </td>
                      </tr>
                    ) : (
                      criticalRisksList.map((risk) => (
                        <tr key={risk.id}>
                          <td><strong>{risk.title}</strong></td>
                          <td>
                            <span className={`cc-badge ${risk.severity === 'critical' ? 'rose' : 'amber'}`}>
                              {risk.severity?.toUpperCase()}
                            </span>
                          </td>
                          <td><span className="cc-badge neutral">{risk.status}</span></td>
                          <td style={{ color: 'var(--accent-cyan)' }}>{risk.venue_id || 'Campus'}</td>
                          <td style={{ fontSize: '11px', color: 'var(--text-dim)', maxWidth: '240px' }}>{risk.description}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="cc-btn cc-btn-secondary cc-btn-sm"
                              onClick={() => onUpdateRiskStatus && onUpdateRiskStatus(risk.id, risk.status === 'open' ? 'mitigating' : 'mitigated')}
                            >
                              Mitigate
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Unresolved Conflicts */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>
                Operational Conflicts Requiring Escalation ({activeConflicts.length})
              </div>
              <ConflictPanel conflicts={activeConflicts} onInspectEntity={(id) => onInspectDependencies('session', id)} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <RecentChangesCard changes={recentChanges} onNavigateTab={onNavigateTab} />

            <div className="cc-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', color: 'var(--accent-cyan)' }}>
                P3 Notion Integration Status
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: '10px' }}>
                Executive reporting state is consolidated and available for automatic dispatch to Notion via <code>POST /changes/{'{id}'}/sync-notion</code>.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(9, 13, 22, 0.6)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-dim)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Notion Bridge:</span>
                <span className="cc-badge cyan">READY</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecentChangesCard({ changes = [], onNavigateTab }) {
  return (
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
        {changes.length === 0 ? (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
            No recent changes recorded.
          </div>
        ) : (
          changes.slice(0, 4).map((ch) => (
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
  );
}

export default DashboardPage;
