import React from "react";
import { MapPin, User, ArrowRight, HeartHandshake } from "lucide-react";
import StatusBadge from "../common/StatusBadge";

export default function TimelineItem({ session, onClick }) {
  const isRelocated = session.isRelocated;
  const isLive = session.status === "In Progress";

  return (
    <div
      className={`timeline-entry-row ${isLive ? "timeline-live-row" : ""} ${isRelocated ? "timeline-relocated-row" : ""}`}
      onClick={() => onClick && onClick(session)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick && onClick(session)}
    >
      {/* 1. Time Column with vertical connector */}
      <div className="timeline-time-col">
        <span className="timeline-start-time">{session.startTime}</span>
        <span className="timeline-end-time">{session.endTime}</span>
      </div>

      {/* 2. Visual Node Marker */}
      <div className="timeline-node-col">
        <div className={`timeline-node-dot ${isLive ? "live-dot pulse-anim" : ""} ${isRelocated ? "relocated-dot" : ""}`} />
        <div className="timeline-connector-line" />
      </div>

      {/* 3. Event Detail Card */}
      <div className="timeline-content-card">
        <div className="timeline-card-header">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="timeline-session-title">{session.title}</h4>
            {session.track && <span className="entity-track-chip">{session.track}</span>}
          </div>
          <StatusBadge
            status={session.status}
            variant={session.statusType}
            pulse={isLive}
          />
        </div>

        {/* Relocation Callout if moved */}
        {isRelocated && (
          <div className="timeline-relocation-badge">
            <span className="font-mono text-2xs font-bold text-danger">RELOCATED:</span>
            <span className="line-through text-slate-500 ml-1">{session.originalVenue}</span>
            <ArrowRight className="w-3 h-3 inline mx-1 text-danger" />
            <span className="font-bold text-danger">{session.venue}</span>
          </div>
        )}

        {/* Venue & Speaker Details */}
        <div className="timeline-meta-row">
          <div className="timeline-meta-chip">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className={`meta-text ${isRelocated ? "text-danger font-semibold" : "text-slate-200"}`}>
              {session.venue}
            </span>
          </div>

          <span className="timeline-meta-sep">·</span>

          <div className="timeline-meta-chip">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="meta-text text-slate-200">{session.speaker}</span>
          </div>

          <span className="timeline-meta-sep">·</span>

          <div className="timeline-meta-chip">
            <HeartHandshake className="w-3 h-3 text-emerald-400" />
            <span className="meta-text font-mono text-slate-300">{session.volunteers?.length || 0} crew</span>
          </div>

          <div className="timeline-inspect-action ml-auto">
            <span>View Details →</span>
          </div>
        </div>
      </div>
    </div>
  );
}
