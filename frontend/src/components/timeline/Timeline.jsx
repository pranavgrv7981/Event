import React, { useState } from "react";
import TimelineItem from "./TimelineItem";
import { Filter, Clock } from "lucide-react";

export default function Timeline({ sessions, onSelectSession }) {
  const [selectedTrack, setSelectedTrack] = useState("all");

  const tracks = ["all", ...new Set(sessions.map((s) => s.track).filter(Boolean))];

  const filteredSessions = sessions.filter((s) => {
    if (selectedTrack === "all") return true;
    return s.track === selectedTrack;
  });

  return (
    <div className="timeline-container">
      {/* Timeline Controls / Track Filter */}
      <div className="timeline-filter-strip">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-2xs font-semibold text-slate-300 uppercase">
            Chronological Run of Show
          </span>
          <span className="font-mono text-2xs text-slate-500">
            ({filteredSessions.length} Scheduled Slots)
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3 h-3 text-slate-500" />
          <span className="text-2xs font-mono text-slate-400">Track:</span>
          {tracks.map((track) => (
            <button
              key={track}
              className={`timeline-track-pill ${selectedTrack === track ? "active" : ""}`}
              onClick={() => setSelectedTrack(track)}
            >
              {track === "all" ? "All Tracks" : track}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Flow */}
      <div className="timeline-flow-list">
        {filteredSessions.map((session) => (
          <TimelineItem
            key={session.id}
            session={session}
            onClick={onSelectSession}
          />
        ))}
      </div>
    </div>
  );
}
