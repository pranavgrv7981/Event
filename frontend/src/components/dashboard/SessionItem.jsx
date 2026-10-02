import React from "react";
import { Clock, MapPin, User, ArrowRight } from "lucide-react";
import StatusBadge from "../common/StatusBadge";

export default function SessionItem({ session }) {
  const isRelocated = session.isRelocated;

  return (
    <div className={`session-list-item ${isRelocated ? "relocated-notice" : ""}`}>
      {/* Time Column */}
      <div className="session-time-col">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span className="session-time-text">{session.time}</span>
      </div>

      {/* Main Details */}
      <div className="session-main-details">
        <div className="session-title-row">
          <h4 className="session-title">{session.title}</h4>
          {session.track && <span className="session-track-tag">{session.track}</span>}
        </div>

        <div className="session-meta-row">
          {/* Venue with relocation highlight */}
          <div className="session-meta-item">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {isRelocated ? (
              <span className="session-venue-relocated">
                <span className="original-strikethrough">{session.originalVenue}</span>
                <ArrowRight className="w-3 h-3 inline mx-1 text-danger" />
                <span className="new-venue font-semibold text-danger">{session.venue}</span>
              </span>
            ) : (
              <span className="session-venue-name">{session.venue}</span>
            )}
          </div>

          <span className="session-meta-divider">·</span>

          {/* Speaker */}
          <div className="session-meta-item">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="session-speaker-name">{session.speaker}</span>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="session-status-col">
        <StatusBadge
          status={session.status}
          variant={session.statusType}
          pulse={session.status === "In Progress"}
        />
      </div>
    </div>
  );
}
