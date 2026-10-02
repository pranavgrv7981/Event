import React from "react";
import { Building2, Users, Calendar, AlertTriangle, Wrench } from "lucide-react";
import StatusBadge from "../common/StatusBadge";

export default function VenueCard({ venue, onClick }) {
  const isMaintenance = venue.status === "MAINTENANCE";

  return (
    <div
      className={`entity-ops-card venue-ops-card ${isMaintenance ? "maintenance-border" : ""}`}
      onClick={() => onClick && onClick(venue)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick && onClick(venue)}
    >
      {/* Top Header */}
      <div className="card-top-row">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h3 className="card-entity-title">{venue.name}</h3>
          {venue.code && <span className="entity-code-chip">{venue.code}</span>}
        </div>
        <StatusBadge status={venue.status} />
      </div>

      {/* Building & Floor */}
      <p className="card-location-sub">
        {venue.building} · {venue.floor}
      </p>

      {/* Maintenance Callout */}
      {isMaintenance && venue.statusReason && (
        <div className="relocation-mini-callout">
          <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0 inline mr-1" />
          <span className="text-2xs font-mono text-danger font-medium">{venue.statusReason}</span>
        </div>
      )}

      {/* Key Metric Strip */}
      <div className="venue-metrics-strip">
        <div className="metric-chip">
          <Users className="w-3 h-3 text-slate-400" />
          <span className="metric-text">
            <strong>{venue.capacity}</strong> Seats
          </span>
        </div>

        <div className="metric-chip">
          <Calendar className="w-3 h-3 text-primary" />
          <span className="metric-text">
            <strong>{venue.scheduledCount || venue.scheduledSessions?.length || 0}</strong> Sessions
          </span>
        </div>

        <div className="metric-chip">
          <span className="font-mono text-2xs text-slate-400">Util:</span>
          <span className="metric-text font-mono text-xs text-primary">
            {venue.approximateUtilization?.split(" ")[0] || "75%"}
          </span>
        </div>
      </div>

      {/* Scheduled Sessions Previews */}
      {venue.scheduledSessions && venue.scheduledSessions.length > 0 && (
        <div className="venue-sessions-preview-box">
          <span className="preview-box-label">SCHEDULED SESSIONS:</span>
          <div className="preview-items-list">
            {venue.scheduledSessions.slice(0, 3).map((s) => (
              <div key={s.id} className="preview-session-item">
                <span className="session-dot" />
                <span className="preview-time font-mono">{s.startTime}</span>
                <span className="preview-title truncate">{s.title}</span>
              </div>
            ))}
            {venue.scheduledSessions.length > 3 && (
              <span className="text-2xs font-mono text-slate-500 pl-2">
                +{venue.scheduledSessions.length - 3} more sessions
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="card-telemetry-footer">
        <div className="telemetry-badge-item">
          <Wrench className="w-3 h-3 text-slate-400 mr-1" />
          <span className="font-mono text-2xs text-slate-300">
            {venue.equipped?.length || 0} devices staged
          </span>
        </div>
        <span className="card-inspect-hint ml-auto">Inspect Venue →</span>
      </div>
    </div>
  );
}
