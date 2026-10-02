import React from "react";
import { HeartHandshake, MapPin, Clock, CheckSquare, Phone } from "lucide-react";
import StatusBadge from "../common/StatusBadge";

export default function VolunteerCard({ volunteer, onClick }) {
  return (
    <div
      className="entity-ops-card volunteer-ops-card"
      onClick={() => onClick && onClick(volunteer)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick && onClick(volunteer)}
    >
      <div className="card-top-row">
        <div className="flex items-center gap-2">
          <div className="volunteer-icon-box">
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="card-entity-title">{volunteer.name}</h3>
            <p className="text-xs text-slate-300 font-medium">{volunteer.role}</p>
          </div>
        </div>
        <StatusBadge status={volunteer.status} />
      </div>

      {/* Deployment & Shift details */}
      <div className="volunteer-deployment-grid">
        <div className="relationship-item">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="relationship-label">Station:</span>
          <span className="relationship-value font-mono text-primary font-semibold">
            {volunteer.assignedVenue}
          </span>
        </div>

        <div className="relationship-item">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="relationship-label">Shift:</span>
          <span className="relationship-value font-mono text-slate-300">
            {volunteer.shift?.split(" ")[0]}
          </span>
        </div>
      </div>

      {/* Assigned Sessions Preview */}
      {volunteer.assignedSessions && volunteer.assignedSessions.length > 0 && (
        <div className="volunteer-sessions-badge-strip">
          <span className="text-2xs font-mono text-slate-400 block mb-1">DUTY SESSIONS:</span>
          <div className="chips-flow-wrap">
            {volunteer.assignedSessions.map((s) => (
              <span key={s.id} className="mini-duty-chip">
                {s.title} ({s.time.split(" ")[0]})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer: Task count & Phone */}
      <div className="card-telemetry-footer">
        <div className="telemetry-badge-item">
          <CheckSquare className="w-3 h-3 text-warning mr-1" />
          <span className="font-mono text-2xs text-slate-300">
            {volunteer.taskCount || 0} active tasks
          </span>
        </div>

        <div className="telemetry-badge-item">
          <Phone className="w-3 h-3 text-slate-400 mr-1" />
          <span className="font-mono text-2xs text-slate-400">{volunteer.phone}</span>
        </div>

        <span className="card-inspect-hint ml-auto">Inspect →</span>
      </div>
    </div>
  );
}
