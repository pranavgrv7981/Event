import React from "react";
import { Clock, MapPin, User, HeartHandshake, Wrench, ArrowRight, CheckSquare } from "lucide-react";
import StatusBadge from "../common/StatusBadge";

export default function SessionCard({ session, onClick }) {
  const isRelocated = session.isRelocated;

  return (
    <div
      className={`entity-ops-card session-ops-card ${isRelocated ? "relocated-border" : ""}`}
      onClick={() => onClick && onClick(session)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick && onClick(session)}
    >
      {/* Header Row: Time and Status */}
      <div className="card-top-row">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-xs font-semibold text-slate-200">{session.time}</span>
          {session.track && <span className="entity-track-chip">{session.track}</span>}
        </div>
        <StatusBadge
          status={session.status}
          variant={session.statusType}
          pulse={session.status === "In Progress"}
        />
      </div>

      {/* Main Title & Relocation Warning */}
      <div className="card-title-section">
        <h3 className="card-entity-title">{session.title}</h3>
        {isRelocated && (
          <div className="relocation-mini-callout">
            <span className="font-mono text-2xs font-bold text-danger">RELOCATED:</span>
            <span className="line-through text-slate-500 ml-1">{session.originalVenue}</span>
            <ArrowRight className="w-3 h-3 inline mx-1 text-danger" />
            <span className="font-bold text-danger">{session.venue}</span>
          </div>
        )}
      </div>

      {/* Core Entity Links: Venue & Speaker */}
      <div className="card-relationships-grid">
        <div className="relationship-item">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="relationship-label">Venue:</span>
          <span className={`relationship-value ${isRelocated ? "text-danger font-semibold" : "text-slate-200"}`}>
            {session.venue}
          </span>
        </div>

        <div className="relationship-item">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="relationship-label">Speaker:</span>
          <span className="relationship-value text-slate-200">{session.speaker}</span>
        </div>
      </div>

      {/* Bottom Telemetry Strip: Volunteers, Equipment, Tasks */}
      <div className="card-telemetry-footer">
        <div className="telemetry-badge-item" title={`${session.volunteers?.length || 0} Volunteers Assigned`}>
          <HeartHandshake className="w-3 h-3 text-emerald-400 mr-1" />
          <span className="font-mono text-2xs text-slate-300">{session.volunteers?.length || 0} crew</span>
        </div>

        <div className="telemetry-badge-item" title={`${session.equipment?.length || 0} Equipment Assets`}>
          <Wrench className="w-3 h-3 text-primary mr-1" />
          <span className="font-mono text-2xs text-slate-300">{session.equipment?.length || 0} devices</span>
        </div>

        {session.tasks && session.tasks.length > 0 && (
          <div className="telemetry-badge-item" title={`${session.tasks.length} Operational Tasks Attached`}>
            <CheckSquare className="w-3 h-3 text-warning mr-1" />
            <span className="font-mono text-2xs text-slate-300">{session.tasks.length} tasks</span>
          </div>
        )}

        <span className="card-inspect-hint ml-auto">Inspect →</span>
      </div>
    </div>
  );
}
