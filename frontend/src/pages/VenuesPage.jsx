import React, { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import PlaceholderPage from "../components/common/PlaceholderPage";
import StatusBadge from "../components/common/StatusBadge";
import { getVenues } from "../services/api";

export default function VenuesPage() {
  const [venues, setVenues] = useState([]);

  useEffect(() => {
    getVenues().then(setVenues).catch(console.error);
  }, []);

  return (
    <PlaceholderPage
      title="Venue & Room Command"
      code="MOD-VENU"
      subtitle="Floor layouts, capacity monitoring, HVAC telemetry, and room status."
      icon={Building2}
      phaseTarget="Phase 2 — Venue Operations & Overrides"
      statSummary={[
        { count: venues.length || 6, label: "Total Facilities" },
        { count: "5", label: "Operational" },
        { count: "1", label: "Maintenance / Closed" },
      ]}
    >
      <div className="venues-grid-preview">
        {venues.map((v) => (
          <div key={v.id} className="venue-card-preview">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-slate-100">{v.name}</h4>
              <StatusBadge status={v.status} />
            </div>
            <p className="text-xs text-slate-400 mb-2">{v.building} · {v.floor}</p>
            <div className="flex justify-between items-center text-xs font-mono text-slate-300 pt-2 border-t border-slate-700/60">
              <span>Capacity: {v.capacity} seats</span>
              <span className="text-primary">{v.equipped?.length || 0} devices</span>
            </div>
            {v.statusReason && (
              <p className="text-2xs text-danger mt-2 font-mono bg-danger/10 p-1.5 rounded">
                {v.statusReason}
              </p>
            )}
          </div>
        ))}
      </div>
    </PlaceholderPage>
  );
}
