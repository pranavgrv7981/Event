import React, { useState } from "react";
import {
  Calendar,
  User,
  HeartHandshake,
  Wrench,
  CheckSquare,
  ShieldAlert,
  ArrowRight,
  ArrowDown,
  Clock,
  ExternalLink,
  RotateCcw,
  Info,
} from "lucide-react";
import StatusBadge from "../common/StatusBadge";
import { getPriorityStyle } from "../../utils/formatters";

export default function ImpactResultsView({
  impactData,
  onInspectEntity,
  onRerun,
  isModal = false,
}) {
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'sessions' | 'speakers' | 'volunteers' | 'equipment' | 'tasks'

  if (!impactData) return null;

  const { change, impact_summary, affected } = impactData;
  const counts = impact_summary?.counts || {
    sessions: affected?.sessions?.length || 0,
    speakers: affected?.speakers?.length || 0,
    volunteers: affected?.volunteers?.length || 0,
    equipment: affected?.equipment?.length || 0,
    tasks: affected?.tasks?.length || 0,
  };

  const handleInspect = (type, entity) => {
    if (onInspectEntity) {
      onInspectEntity(type, entity);
    }
  };

  return (
    <div className={`impact-results-container ${isModal ? "modal-mode" : ""}`}>
      {/* 1. Primary Change Alert Banner */}
      <div className="impact-hero-banner">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="impact-badge-pulse">
              <ShieldAlert className="w-4 h-4 text-danger animate-pulse" />
              VENUE CHANGE DETECTED
            </span>
            <span className="font-mono text-2xs text-slate-400">
              CHANGE ID: {change?.id || "change_001"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xs text-slate-400">
              <Clock className="w-3 h-3 inline mr-1 text-slate-500" />
              Verified at {change?.created_at ? new Date(change.created_at).toLocaleTimeString() : "09:48 AM"}
            </span>
            {onRerun && (
              <button
                className="btn btn-secondary text-2xs py-1 px-2.5 flex items-center gap-1"
                onClick={onRerun}
                title="Re-run dependency cascade verification"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Re-analyze</span>
              </button>
            )}
          </div>
        </div>

        {/* Visual Comparison: Current Venue -> New Venue */}
        <div className="impact-migration-strip">
          <div className="venue-chip-box current">
            <span className="venue-chip-label">ORIGIN FACILITY</span>
            <span className="venue-chip-name">{change?.old_value || "Auditorium A"}</span>
            <span className="venue-chip-sub text-danger">Offline / Evacuating</span>
          </div>

          <div className="venue-migration-arrow">
            <ArrowRight className="w-6 h-6 text-warning hidden sm:inline" />
            <ArrowDown className="w-6 h-6 text-warning sm:hidden" />
            <span className="text-3xs font-mono text-warning uppercase font-bold tracking-wider">
              RELOCATING TO
            </span>
          </div>

          <div className="venue-chip-box target">
            <span className="venue-chip-label">TARGET FACILITY</span>
            <span className="venue-chip-name">{change?.new_value || "Auditorium B"}</span>
            <span className="venue-chip-sub text-emerald-400">Ready / Active</span>
          </div>
        </div>

        {/* Operational Reason */}
        {change?.reason && (
          <div className="impact-reason-box">
            <span className="font-mono text-2xs text-slate-400 font-bold uppercase mr-2">
              Operational Trigger:
            </span>
            <span className="text-xs text-slate-200 font-mono">{change.reason}</span>
          </div>
        )}
      </div>

      {/* 2. Impact Summary Metric Cards */}
      <div className="impact-summary-header">
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <span>Cascade Impact Summary</span>
          <span className="text-slate-500 font-normal">|</span>
          <span className="text-warning font-mono font-semibold">
            {counts.sessions + counts.speakers + counts.volunteers + counts.equipment + counts.tasks} downstream entities affected
          </span>
        </h3>
      </div>

      <div className="impact-metrics-grid">
        {/* Sessions Card */}
        <div
          className={`impact-stat-card ${activeTab === "sessions" ? "active" : ""}`}
          onClick={() => setActiveTab(activeTab === "sessions" ? "all" : "sessions")}
          role="button"
          tabIndex={0}
        >
          <div className="impact-stat-top">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="impact-stat-count text-primary">{counts.sessions}</span>
          </div>
          <span className="impact-stat-label">Affected Sessions</span>
          <span className="impact-stat-hint">Schedule shifted to {change?.new_value || "Hall B"}</span>
        </div>

        {/* Speakers Card */}
        <div
          className={`impact-stat-card ${activeTab === "speakers" ? "active" : ""}`}
          onClick={() => setActiveTab(activeTab === "speakers" ? "all" : "speakers")}
          role="button"
          tabIndex={0}
        >
          <div className="impact-stat-top">
            <User className="w-4 h-4 text-warning" />
            <span className="impact-stat-count text-warning">{counts.speakers}</span>
          </div>
          <span className="impact-stat-label">Affected Speakers</span>
          <span className="impact-stat-hint">Stage relocation alerts queued</span>
        </div>

        {/* Volunteers Card */}
        <div
          className={`impact-stat-card ${activeTab === "volunteers" ? "active" : ""}`}
          onClick={() => setActiveTab(activeTab === "volunteers" ? "all" : "volunteers")}
          role="button"
          tabIndex={0}
        >
          <div className="impact-stat-top">
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
            <span className="impact-stat-count text-emerald-400">{counts.volunteers}</span>
          </div>
          <span className="impact-stat-label">Affected Volunteers</span>
          <span className="impact-stat-hint">Crowd & AV marshals redeployed</span>
        </div>

        {/* Equipment Card */}
        <div
          className={`impact-stat-card ${activeTab === "equipment" ? "active" : ""}`}
          onClick={() => setActiveTab(activeTab === "equipment" ? "all" : "equipment")}
          role="button"
          tabIndex={0}
        >
          <div className="impact-stat-top">
            <Wrench className="w-4 h-4 text-sky-400" />
            <span className="impact-stat-count text-sky-400">{counts.equipment}</span>
          </div>
          <span className="impact-stat-label">Affected Equipment</span>
          <span className="impact-stat-hint">Staged AV & projection assets</span>
        </div>

        {/* Dependent Tasks Card */}
        <div
          className={`impact-stat-card ${activeTab === "tasks" ? "active" : ""}`}
          onClick={() => setActiveTab(activeTab === "tasks" ? "all" : "tasks")}
          role="button"
          tabIndex={0}
        >
          <div className="impact-stat-top">
            <CheckSquare className="w-4 h-4 text-rose-400" />
            <span className="impact-stat-count text-rose-400">{counts.tasks}</span>
          </div>
          <span className="impact-stat-label">Dependent Tasks</span>
          <span className="impact-stat-hint">High-priority operational directives</span>
        </div>
      </div>

      {/* 3. Filter Tabs */}
      <div className="impact-tab-strip">
        <button
          className={`impact-tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All Affected Breakdown
        </button>
        <button
          className={`impact-tab-btn ${activeTab === "sessions" ? "active" : ""}`}
          onClick={() => setActiveTab("sessions")}
        >
          Sessions ({counts.sessions})
        </button>
        <button
          className={`impact-tab-btn ${activeTab === "speakers" ? "active" : ""}`}
          onClick={() => setActiveTab("speakers")}
        >
          Speakers ({counts.speakers})
        </button>
        <button
          className={`impact-tab-btn ${activeTab === "volunteers" ? "active" : ""}`}
          onClick={() => setActiveTab("volunteers")}
        >
          Volunteers ({counts.volunteers})
        </button>
        <button
          className={`impact-tab-btn ${activeTab === "equipment" ? "active" : ""}`}
          onClick={() => setActiveTab("equipment")}
        >
          Equipment ({counts.equipment})
        </button>
        <button
          className={`impact-tab-btn ${activeTab === "tasks" ? "active" : ""}`}
          onClick={() => setActiveTab("tasks")}
        >
          Tasks ({counts.tasks})
        </button>
      </div>

      {/* 4. Entity Breakdown Grids */}
      <div className="impact-breakdown-sections">
        {/* AFFECTED SESSIONS */}
        {(activeTab === "all" || activeTab === "sessions") && (
          <div className="breakdown-panel">
            <div className="breakdown-panel-header">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h4 className="breakdown-title">AFFECTED SESSIONS ({affected?.sessions?.length || 0})</h4>
              </div>
              <span className="breakdown-meta font-mono text-2xs text-slate-400">
                Click any session to open full detail drawer
              </span>
            </div>
            <div className="breakdown-items-grid">
              {affected?.sessions?.map((session) => (
                <div
                  key={session.id}
                  className="impact-entity-card session-card"
                  onClick={() => handleInspect("session", session)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-xs text-slate-100 leading-snug">
                      {session.title}
                    </span>
                    <span className="font-mono text-2xs text-primary font-bold shrink-0">
                      {session.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-2xs text-slate-400 mt-2">
                    <span>
                      Speaker: <strong className="text-slate-300">{session.speaker}</strong>
                    </span>
                    <StatusBadge status={session.status} variant={session.statusType} />
                  </div>
                  <div className="impact-card-footer">
                    <span className="font-mono text-3xs text-danger font-semibold">
                      {session.originalVenue} → {session.venue}
                    </span>
                    <span className="inspect-link">
                      Inspect Session <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AFFECTED SPEAKERS */}
        {(activeTab === "all" || activeTab === "speakers") && (
          <div className="breakdown-panel">
            <div className="breakdown-panel-header">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-warning" />
                <h4 className="breakdown-title">AFFECTED SPEAKERS ({affected?.speakers?.length || 0})</h4>
              </div>
              <span className="breakdown-meta font-mono text-2xs text-slate-400">
                Click speaker to review requirements & liaison contacts
              </span>
            </div>
            <div className="breakdown-items-grid">
              {affected?.speakers?.map((speaker) => (
                <div
                  key={speaker.id}
                  className="impact-entity-card speaker-card"
                  onClick={() => handleInspect("speaker", speaker)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-100">
                      {speaker.fullName || speaker.name}
                    </span>
                    <StatusBadge status={speaker.status || "CONFIRMED"} variant="warning" />
                  </div>
                  <span className="text-2xs text-slate-300 block">{speaker.role} · {speaker.organization}</span>
                  <div className="text-2xs text-slate-400 mt-2 font-mono">
                    Session: <span className="text-primary font-semibold">{speaker.session}</span>
                  </div>
                  <div className="impact-card-footer">
                    <span className="text-3xs font-mono text-slate-400">{speaker.phone}</span>
                    <span className="inspect-link">
                      Inspect Speaker <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AFFECTED VOLUNTEERS */}
        {(activeTab === "all" || activeTab === "volunteers") && (
          <div className="breakdown-panel">
            <div className="breakdown-panel-header">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-emerald-400" />
                <h4 className="breakdown-title">AFFECTED VOLUNTEERS & CREW ({affected?.volunteers?.length || 0})</h4>
              </div>
              <span className="breakdown-meta font-mono text-2xs text-slate-400">
                Click volunteer to view shift allocations & duty station
              </span>
            </div>
            <div className="breakdown-items-grid volunteers-grid">
              {affected?.volunteers?.map((vol) => (
                <div
                  key={vol.id}
                  className="impact-entity-card volunteer-card"
                  onClick={() => handleInspect("volunteer", vol)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-100">{vol.name}</span>
                    <span className="duty-reassigned-chip">Reassigned</span>
                  </div>
                  <span className="text-2xs text-slate-300 font-medium block">{vol.role}</span>
                  <span className="text-2xs text-emerald-400 font-mono mt-1 block">
                    Station: {vol.station}
                  </span>
                  <div className="impact-card-footer">
                    <span className="text-3xs font-mono text-slate-500">{vol.shift}</span>
                    <span className="inspect-link">
                      Inspect <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AFFECTED EQUIPMENT */}
        {(activeTab === "all" || activeTab === "equipment") && (
          <div className="breakdown-panel">
            <div className="breakdown-panel-header">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-sky-400" />
                <h4 className="breakdown-title">AFFECTED EQUIPMENT ({affected?.equipment?.length || 0})</h4>
              </div>
              <span className="breakdown-meta font-mono text-2xs text-slate-400">
                Click device to inspect calibration & venue assignment
              </span>
            </div>
            <div className="breakdown-items-grid">
              {affected?.equipment?.map((eq) => (
                <div
                  key={eq.id}
                  className="impact-entity-card equipment-card"
                  onClick={() => handleInspect("equipment", eq)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-100">{eq.name}</span>
                    <span className="font-mono text-2xs text-slate-400">{eq.code}</span>
                  </div>
                  <div className="flex items-center gap-2 text-2xs text-slate-400 mt-1">
                    <span>Type: {eq.type}</span>
                    <span>·</span>
                    <span>Qty: {eq.quantity}</span>
                  </div>
                  <span className="text-2xs text-sky-400 font-mono mt-1 block">
                    Assigned: {eq.assignedSessionTitle} ({eq.venue})
                  </span>
                  <div className="impact-card-footer">
                    <StatusBadge status={eq.status} />
                    <span className="inspect-link">
                      Inspect Device <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DEPENDENT TASKS */}
        {(activeTab === "all" || activeTab === "tasks") && (
          <div className="breakdown-panel">
            <div className="breakdown-panel-header">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-rose-400" />
                <h4 className="breakdown-title">DEPENDENT TASKS & DIRECTIVES ({affected?.tasks?.length || 0})</h4>
              </div>
              <span className="breakdown-meta font-mono text-2xs text-slate-400">
                Generated operational mitigation tasks
              </span>
            </div>
            <div className="breakdown-items-grid tasks-grid">
              {affected?.tasks?.map((task) => (
                <div key={task.id} className="impact-task-card">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-semibold text-xs text-slate-100 leading-snug">
                      {task.title}
                    </span>
                    <span className={`task-priority-badge ${getPriorityStyle(task.priority)} shrink-0`}>
                      {task.priority}
                    </span>
                  </div>
                  {task.context && (
                    <p className="text-2xs text-slate-300 font-mono leading-relaxed mb-2 bg-slate-900/50 p-2 rounded border border-slate-800">
                      {task.context}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-2xs text-slate-400 pt-2 border-t border-slate-800">
                    <span>
                      Owner: <strong className="text-slate-200">{task.owner}</strong>
                    </span>
                    <span className="font-mono text-2xs text-warning">
                      Due: {task.deadline}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Architecture & Ownership Banner */}
      <div className="impact-footer-info">
        <Info className="w-4 h-4 text-primary shrink-0" />
        <span className="text-2xs text-slate-400">
          <strong className="text-slate-200">INTELLIGENT CASUALTY MITIGATION:</strong> All downstream dependency relationships verified via P1 DAG evaluation model. No client-side recalculation overhead. Prepared for P3 AI automated dispatch briefings.
        </span>
      </div>
    </div>
  );
}
