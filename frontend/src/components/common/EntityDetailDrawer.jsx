import React, { useEffect, useContext } from "react";
import {
  X,
  Calendar,
  User,
  HeartHandshake,
  Wrench,
  Clock,
  MapPin,
  AlertTriangle,
  Info,
  Phone,
  Mail,
  Zap,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import { getPriorityStyle } from "../../utils/formatters";
import { EventContext } from "../../context/EventContext";

export default function EntityDetailDrawer({
  isOpen,
  onClose,
  entityType,
  entityData,
  onSelectEntity,
  onOpenVenueChange,
}) {
  const eventCtx = useContext(EventContext);

  const handleTriggerVenueChange = (data) => {
    if (onOpenVenueChange) {
      onOpenVenueChange(data);
    } else if (eventCtx?.openVenueChangeModal) {
      eventCtx.openVenueChangeModal(data);
    }
  };
  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !entityData) return null;

  const navigateTo = (type, dataOrId) => {
    if (onSelectEntity) {
      onSelectEntity(type, dataOrId);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-header-left">
            <div className="flex items-center gap-2 mb-1">
              <span className="drawer-type-chip">{entityType.toUpperCase()}</span>
              {entityData.code && <span className="drawer-code-chip">{entityData.code}</span>}
              <StatusBadge
                status={entityData.status || "ACTIVE"}
                variant={entityData.statusType}
                pulse={entityData.status === "In Progress" || entityData.status === "On Stage"}
              />
            </div>
            <h2 className="drawer-title">{entityData.title || entityData.name}</h2>
          </div>
          <button
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close detail view"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="drawer-body">
          {/* ================= SESSION VIEW ================= */}
          {entityType === "session" && (
            <div className="drawer-content-stack">
              {/* Relocation Alert Banner if relocated */}
              {entityData.isRelocated && (
                <div className="drawer-alert-callout danger">
                  <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-danger text-xs font-mono">
                      OPERATIONAL RELOCATION ACTIVE
                    </span>
                    <p className="text-2xs text-slate-300 mt-0.5">
                      Session moved from <strong className="line-through">{entityData.originalVenue}</strong> to{" "}
                      <strong className="text-danger">{entityData.venue}</strong> due to Hall A HVAC failure.
                    </p>
                  </div>
                </div>
              )}

              {/* Time & Venue Bar */}
              <div className="drawer-meta-grid">
                <div className="drawer-meta-cell">
                  <span className="cell-label">TIME</span>
                  <div className="cell-val flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-xs">{entityData.time}</span>
                  </div>
                </div>

                <div className="drawer-meta-cell">
                  <span className="cell-label">ALLOCATED VENUE</span>
                  <button
                    className="cell-val-btn flex items-center gap-1.5"
                    onClick={() => navigateTo("venue", entityData.venueId || entityData.venue)}
                    title="Click to inspect Venue details"
                  >
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span className="underline font-semibold text-primary">{entityData.venue}</span>
                  </button>
                </div>

                <div className="drawer-meta-cell">
                  <span className="cell-label">TRACK / DOMAIN</span>
                  <span className="cell-val text-xs text-slate-300">
                    {entityData.track || "General"}
                  </span>
                </div>

                <div className="drawer-meta-cell">
                  <span className="cell-label">ESTIMATED ATTENDANCE</span>
                  <span className="cell-val font-mono text-xs text-slate-200">
                    {entityData.attendeeEstimate || "150+"} attendees
                  </span>
                </div>
              </div>

              {/* Change Venue Action Trigger */}
              <div className="drawer-action-banner">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-warning" />
                      Operational Venue Relocation
                    </span>
                    <span className="text-2xs text-slate-400">
                      Currently assigned to <strong className="text-slate-200">{entityData.venue}</strong>
                    </span>
                  </div>
                  <button
                    className="btn btn-warning text-xs flex items-center gap-1.5 font-semibold"
                    onClick={() =>
                      handleTriggerVenueChange({
                        session: entityData.title,
                        sessionId: entityData.id,
                        currentVenue: entityData.venue || "Auditorium A",
                      })
                    }
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Change Venue</span>
                  </button>
                </div>
              </div>

              {/* Description */}
              {entityData.description && (
                <div className="drawer-section">
                  <h4 className="drawer-section-title">Session Briefing</h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded border border-slate-800">
                    {entityData.description}
                  </p>
                </div>
              )}

              {/* Speaker Card */}
              <div className="drawer-section">
                <h4 className="drawer-section-title">Keynote / Lead Speaker</h4>
                <div
                  className="interactive-linked-card"
                  onClick={() => navigateTo("speaker", entityData.speakerId || entityData.speaker)}
                >
                  <div className="linked-card-avatar">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="linked-card-info">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-100">
                        {entityData.speakerFull || entityData.speaker}
                      </span>
                      <span className="view-detail-hint">Inspect Speaker →</span>
                    </div>
                    <span className="text-2xs text-slate-400">
                      {entityData.speakerRole || "Speaker"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assigned Volunteers */}
              <div className="drawer-section">
                <div className="flex justify-between items-center mb-1.5">
                  <h4 className="drawer-section-title">Assigned Volunteers & Crew</h4>
                  <span className="font-mono text-2xs text-slate-400">
                    {entityData.volunteers?.length || 0} crew assigned
                  </span>
                </div>
                {entityData.volunteers && entityData.volunteers.length > 0 ? (
                  <div className="chips-flow-wrap">
                    {entityData.volunteers.map((vol) => (
                      <button
                        key={vol.id}
                        className="interactive-chip"
                        onClick={() => navigateTo("volunteer", vol.id)}
                        title="Click to view Volunteer profile"
                      >
                        <HeartHandshake className="w-3 h-3 text-emerald-400 mr-1" />
                        <span>{vol.name}</span>
                        <span className="chip-sub">({vol.role})</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-2xs text-slate-500 italic">No direct volunteers assigned to this slot.</p>
                )}
              </div>

              {/* Equipment In Use */}
              <div className="drawer-section">
                <div className="flex justify-between items-center mb-1.5">
                  <h4 className="drawer-section-title">Allocated AV & Hardware</h4>
                  <span className="font-mono text-2xs text-slate-400">
                    {entityData.equipment?.length || 0} assets
                  </span>
                </div>
                {entityData.equipment && entityData.equipment.length > 0 ? (
                  <div className="chips-flow-wrap">
                    {entityData.equipment.map((eq) => (
                      <button
                        key={eq.id}
                        className="interactive-chip"
                        onClick={() => navigateTo("equipment", eq.id)}
                        title="Click to view Equipment details"
                      >
                        <Wrench className="w-3 h-3 text-primary mr-1" />
                        <span>{eq.name}</span>
                        <span className="chip-sub font-mono">[{eq.status}]</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-2xs text-slate-500 italic">Standard room equipment utilized.</p>
                )}
              </div>

              {/* Associated Operational Tasks */}
              {entityData.tasks && entityData.tasks.length > 0 && (
                <div className="drawer-section">
                  <h4 className="drawer-section-title">Operational Tasks Attached</h4>
                  <div className="tasks-mini-list">
                    {entityData.tasks.map((task) => (
                      <div key={task.id} className="task-mini-item">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs text-slate-200">{task.title}</span>
                          <span className={`task-priority-badge ${getPriorityStyle(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        <span className="text-2xs text-slate-400 font-mono">Status: {task.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= VENUE VIEW ================= */}
          {entityType === "venue" && (
            <div className="drawer-content-stack">
              {entityData.status === "MAINTENANCE" && (
                <div className="drawer-alert-callout danger">
                  <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-danger text-xs font-mono">
                      FACILITY OFFLINE / MAINTENANCE
                    </span>
                    <p className="text-2xs text-slate-300 mt-0.5">{entityData.statusReason}</p>
                  </div>
                </div>
              )}

              <div className="drawer-meta-grid">
                <div className="drawer-meta-cell">
                  <span className="cell-label">LOCATION</span>
                  <span className="cell-val text-xs text-slate-200">
                    {entityData.building}, {entityData.floor}
                  </span>
                </div>

                <div className="drawer-meta-cell">
                  <span className="cell-label">CAPACITY</span>
                  <span className="cell-val font-mono text-xs text-slate-100 font-bold">
                    {entityData.capacity} Seats
                  </span>
                </div>

                <div className="drawer-meta-cell">
                  <span className="cell-label">APPROX. UTILIZATION</span>
                  <span className="cell-val font-mono text-xs text-primary">
                    {entityData.approximateUtilization || "75%"}
                  </span>
                </div>

                <div className="drawer-meta-cell">
                  <span className="cell-label">SCHEDULED SESSIONS</span>
                  <span className="cell-val font-mono text-xs text-slate-100 font-bold">
                    {entityData.scheduledCount || entityData.scheduledSessions?.length || 0} Sessions
                  </span>
                </div>
              </div>

              {/* Relocate Venue Action Trigger */}
              <div className="drawer-action-banner">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-warning" />
                      Facility Evacuation & Relocation
                    </span>
                    <span className="text-2xs text-slate-400">
                      Relocate scheduled sessions from <strong className="text-slate-200">{entityData.name}</strong>
                    </span>
                  </div>
                  <button
                    className="btn btn-warning text-xs flex items-center gap-1.5 font-semibold"
                    onClick={() =>
                      handleTriggerVenueChange({
                        currentVenue: entityData.name,
                      })
                    }
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Relocate Venue</span>
                  </button>
                </div>
              </div>

              {/* Scheduled Sessions in this Venue */}
              <div className="drawer-section">
                <h4 className="drawer-section-title">Scheduled Sessions in this Venue</h4>
                <div className="drawer-list-group">
                  {entityData.scheduledSessions && entityData.scheduledSessions.length > 0 ? (
                    entityData.scheduledSessions.map((s) => (
                      <div
                        key={s.id}
                        className="interactive-linked-item"
                        onClick={() => navigateTo("session", s.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-slate-100">{s.title}</span>
                          <span className="font-mono text-2xs text-primary">{s.time}</span>
                        </div>
                        <div className="flex items-center justify-between text-2xs text-slate-400">
                          <span>Speaker: {s.speaker}</span>
                          <StatusBadge status={s.status} variant={s.statusType} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-2xs text-slate-500 italic">No scheduled sessions in this room.</p>
                  )}
                </div>
              </div>

              {/* Equipped Hardware */}
              {entityData.equipped && entityData.equipped.length > 0 && (
                <div className="drawer-section">
                  <h4 className="drawer-section-title">Permanent & Staged Hardware</h4>
                  <div className="chips-flow-wrap">
                    {entityData.equipped.map((eq, idx) => (
                      <button
                        key={eq.id || idx}
                        className="interactive-chip"
                        onClick={() => eq.id && navigateTo("equipment", eq.id)}
                      >
                        <Wrench className="w-3 h-3 text-slate-400 mr-1" />
                        <span>{eq.name || eq}</span>
                        {eq.status && <span className="chip-sub font-mono">[{eq.status}]</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= SPEAKER VIEW ================= */}
          {entityType === "speaker" && (
            <div className="drawer-content-stack">
              <div className="speaker-profile-hero">
                <div className="speaker-large-avatar">
                  {entityData.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="speaker-hero-text">
                  <h3 className="text-sm font-bold text-slate-100">{entityData.name}</h3>
                  <p className="text-xs text-primary font-medium">{entityData.role}</p>
                  <p className="text-2xs text-slate-400">{entityData.organization}</p>
                </div>
              </div>

              {entityData.bio && (
                <div className="drawer-section">
                  <h4 className="drawer-section-title">Background & Biography</h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded border border-slate-800">
                    {entityData.bio}
                  </p>
                </div>
              )}

              {/* Speaker Session Link */}
              <div className="drawer-section">
                <h4 className="drawer-section-title">Assigned Session</h4>
                <div
                  className="interactive-linked-card"
                  onClick={() => navigateTo("session", entityData.sessionId)}
                >
                  <div className="linked-card-avatar">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="linked-card-info">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-100">
                        {entityData.sessionTitle}
                      </span>
                      <span className="view-detail-hint">Open Session →</span>
                    </div>
                    <div className="flex items-center gap-3 text-2xs text-slate-400 mt-1 font-mono">
                      <span><Clock className="w-3 h-3 inline mr-1" />{entityData.sessionTime}</span>
                      <span><MapPin className="w-3 h-3 inline mr-1" />{entityData.venueName}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirements & Tech Rider */}
              {entityData.requirements && (
                <div className="drawer-section">
                  <h4 className="drawer-section-title">Presentation & Technical Requirements</h4>
                  <div className="tech-rider-box">
                    <Info className="w-4 h-4 text-warning shrink-0" />
                    <p className="text-xs text-slate-300">{entityData.requirements}</p>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="drawer-section">
                <h4 className="drawer-section-title">Direct Liaison Contact</h4>
                <div className="contact-info-list">
                  <div className="contact-item">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-xs text-slate-200">{entityData.email}</span>
                  </div>
                  {entityData.phone && (
                    <div className="contact-item">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono text-xs text-slate-200">{entityData.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= VOLUNTEER VIEW ================= */}
          {entityType === "volunteer" && (
            <div className="drawer-content-stack">
              <div className="drawer-meta-grid">
                <div className="drawer-meta-cell">
                  <span className="cell-label">OPERATIONAL ROLE</span>
                  <span className="cell-val text-xs text-slate-100 font-semibold">{entityData.role}</span>
                </div>

                <div className="drawer-meta-cell">
                  <span className="cell-label">ASSIGNED VENUE</span>
                  <button
                    className="cell-val-btn flex items-center gap-1.5"
                    onClick={() => entityData.venueId && navigateTo("venue", entityData.venueId)}
                  >
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span className="underline font-semibold text-primary">{entityData.assignedVenue}</span>
                  </button>
                </div>

                <div className="drawer-meta-cell">
                  <span className="cell-label">SHIFT SCHEDULE</span>
                  <span className="cell-val font-mono text-xs text-slate-300">{entityData.shift}</span>
                </div>

                <div className="drawer-meta-cell">
                  <span className="cell-label">ACTIVE TASKS COUNT</span>
                  <span className="cell-val font-mono text-xs text-warning font-bold">
                    {entityData.taskCount || 0} Assigned Tasks
                  </span>
                </div>
              </div>

              {/* Assigned Sessions */}
              <div className="drawer-section">
                <h4 className="drawer-section-title">Assigned Sessions On Duty</h4>
                <div className="drawer-list-group">
                  {entityData.assignedSessions && entityData.assignedSessions.length > 0 ? (
                    entityData.assignedSessions.map((s) => (
                      <div
                        key={s.id}
                        className="interactive-linked-item"
                        onClick={() => navigateTo("session", s.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-slate-100">{s.title}</span>
                          <span className="font-mono text-2xs text-primary">{s.time}</span>
                        </div>
                        <span className="view-detail-hint mt-1 block">Inspect Session →</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-2xs text-slate-500 italic">General roving duty across assigned facility.</p>
                  )}
                </div>
              </div>

              {/* Radio Contact */}
              <div className="drawer-section">
                <h4 className="drawer-section-title">Radio / Telephony Channel</h4>
                <div className="contact-info-list">
                  <div className="contact-item">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono text-xs text-slate-200">{entityData.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= EQUIPMENT VIEW ================= */}
          {entityType === "equipment" && (
            <div className="drawer-content-stack">
              <div className="drawer-meta-grid">
                <div className="drawer-meta-cell">
                  <span className="cell-label">EQUIPMENT TYPE</span>
                  <span className="cell-val text-xs text-slate-200">{entityData.type}</span>
                </div>

                <div className="drawer-meta-cell">
                  <span className="cell-label">QUANTITY</span>
                  <span className="cell-val font-mono text-xs text-slate-100 font-bold">
                    {entityData.quantity || 1} Unit(s)
                  </span>
                </div>

                <div className="drawer-meta-cell">
                  <span className="cell-label">CURRENT VENUE</span>
                  <button
                    className="cell-val-btn flex items-center gap-1.5"
                    onClick={() => entityData.venueId && navigateTo("venue", entityData.venueId)}
                  >
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span className="underline font-semibold text-primary">{entityData.venueName || entityData.venue}</span>
                  </button>
                </div>

                <div className="drawer-meta-cell">
                  <span className="cell-label">OPERATIONAL STATUS</span>
                  <div className="cell-val">
                    <StatusBadge status={entityData.status} />
                  </div>
                </div>
              </div>

              {/* Assigned Session */}
              {entityData.assignedSessionId && (
                <div className="drawer-section">
                  <h4 className="drawer-section-title">Dedicated Session Allocation</h4>
                  <div
                    className="interactive-linked-card"
                    onClick={() => navigateTo("session", entityData.assignedSessionId)}
                  >
                    <div className="linked-card-avatar">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div className="linked-card-info">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-100">
                          {entityData.assignedSessionTitle}
                        </span>
                        <span className="view-detail-hint">Open Session →</span>
                      </div>
                      <span className="text-2xs text-slate-400">Primary presentation asset</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Maintenance & Tech Notes */}
              {entityData.notes && (
                <div className="drawer-section">
                  <h4 className="drawer-section-title">Engineering / Calibration Notes</h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded border border-slate-800 font-mono">
                    {entityData.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="drawer-footer">
          <span className="text-2xs font-mono text-slate-500">MIRA COMMAND DESK · ENTITY TELEMETRY</span>
          <button className="btn btn-secondary text-xs" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
