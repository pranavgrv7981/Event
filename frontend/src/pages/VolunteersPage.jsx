import React, { useState, useEffect } from "react";
import { HeartHandshake } from "lucide-react";
import PlaceholderPage from "../components/common/PlaceholderPage";
import { getVolunteers } from "../services/api";

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState([]);

  useEffect(() => {
    getVolunteers().then(setVolunteers).catch(console.error);
  }, []);

  return (
    <PlaceholderPage
      title="Volunteers & Field Crew"
      code="MOD-VOLN"
      subtitle="Floor deployment, duty rosters, crowd control distribution, and team leads."
      icon={HeartHandshake}
      phaseTarget="Phase 2 — Volunteer Dispatch & Tasking"
      statSummary={[
        { count: volunteers.length || 32, label: "Active Crew" },
        { count: "8", label: "Re-deployed to Hall B" },
        { count: "100%", label: "Radio Checked" },
      ]}
    >
      <div className="placeholder-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Volunteer Name</th>
              <th>Operational Role</th>
              <th>Assigned Location</th>
              <th>Radio / Phone</th>
              <th>Readiness</th>
            </tr>
          </thead>
          <tbody>
            {volunteers.map((v) => (
              <tr key={v.id}>
                <td className="font-medium text-slate-100">{v.name}</td>
                <td className="text-slate-300">{v.role}</td>
                <td>
                  <span className="font-mono text-xs text-primary">{v.assignedVenue}</span>
                </td>
                <td className="font-mono text-xs text-slate-400">{v.phone}</td>
                <td>
                  <span className="badge-success text-2xs px-2 py-0.5 rounded font-mono">ON STATION</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PlaceholderPage>
  );
}
