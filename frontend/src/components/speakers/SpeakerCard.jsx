import React from "react";
import { Calendar, MapPin, Clock, Info } from "lucide-react";
import StatusBadge from "../common/StatusBadge";

export default function SpeakerCard({ speaker, onClick }) {
  return (
    <div
      className="entity-ops-card speaker-ops-card"
      onClick={() => onClick && onClick(speaker)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick && onClick(speaker)}
    >
      {/* Top Header: Avatar, Name, Status */}
      <div className="card-top-row">
        <div className="flex items-center gap-3">
          <div className="speaker-avatar-wrap">
            {speaker.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <h3 className="card-entity-title">{speaker.name}</h3>
            <p className="text-xs text-primary font-medium">{speaker.role}</p>
            <p className="text-2xs text-slate-400">{speaker.organization}</p>
          </div>
        </div>
        <StatusBadge
          status={speaker.status}
          pulse={speaker.status === "On Stage"}
        />
      </div>

      {/* Session Allocation Box */}
      <div className="speaker-session-box">
        <div className="flex items-center gap-1.5 mb-1">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold text-xs text-slate-200 truncate">
            {speaker.sessionTitle}
          </span>
        </div>
        <div className="flex items-center gap-3 text-2xs text-slate-400 font-mono">
          <span><Clock className="w-3 h-3 inline mr-1" />{speaker.sessionTime}</span>
          <span><MapPin className="w-3 h-3 inline mr-1" />{speaker.venueName}</span>
        </div>
      </div>

      {/* Requirements preview */}
      {speaker.requirements && (
        <div className="speaker-req-preview">
          <Info className="w-3 h-3 text-warning shrink-0" />
          <span className="text-2xs text-slate-300 truncate">{speaker.requirements}</span>
        </div>
      )}

      {/* Footer */}
      <div className="card-telemetry-footer">
        <span className="text-2xs font-mono text-slate-400">{speaker.email}</span>
        <span className="card-inspect-hint ml-auto">Inspect Speaker →</span>
      </div>
    </div>
  );
}
