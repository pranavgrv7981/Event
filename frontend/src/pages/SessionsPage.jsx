import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import PlaceholderPage from "../components/common/PlaceholderPage";
import StatusBadge from "../components/common/StatusBadge";
import { getSessions } from "../services/api";

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    getSessions().then(setSessions).catch(console.error);
  }, []);

  return (
    <PlaceholderPage
      title="Sessions Schedule & Allocation"
      code="MOD-SESS"
      subtitle="Complete schedule timeline, room assignments, speaker links, and live track states."
      icon={Calendar}
      phaseTarget="Phase 2 — Session Entity Management"
      statSummary={[
        { count: sessions.length || 24, label: "Total Sessions" },
        { count: "2", label: "Currently Running" },
        { count: "3", label: "Relocated (Hall B)" },
      ]}
    >
      <div className="placeholder-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Session Name</th>
              <th>Venue</th>
              <th>Speaker</th>
              <th>Track</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td className="font-mono text-xs">{s.time}</td>
                <td className="font-medium text-slate-100">{s.title}</td>
                <td>
                  {s.isRelocated ? (
                    <span className="text-danger font-medium">{s.venue} (Relocated)</span>
                  ) : (
                    <span>{s.venue}</span>
                  )}
                </td>
                <td className="text-slate-300">{s.speaker}</td>
                <td><span className="session-track-tag">{s.track || "General"}</span></td>
                <td><StatusBadge status={s.status} variant={s.statusType} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PlaceholderPage>
  );
}
