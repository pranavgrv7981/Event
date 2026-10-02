import React, { useState, useEffect } from "react";
import { Users } from "lucide-react";
import PlaceholderPage from "../components/common/PlaceholderPage";
import { getSpeakers } from "../services/api";

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState([]);

  useEffect(() => {
    getSpeakers().then(setSpeakers).catch(console.error);
  }, []);

  return (
    <PlaceholderPage
      title="Speakers & VIP Directorate"
      code="MOD-SPKR"
      subtitle="Speaker logistics, green room schedules, escort assignments, and arrival states."
      icon={Users}
      phaseTarget="Phase 2 — Speaker Coordination"
      statSummary={[
        { count: speakers.length || 8, label: "Confirmed Speakers" },
        { count: "3", label: "Affected by Hall A" },
        { count: "8", label: "Checked In" },
      ]}
    >
      <div className="speakers-grid-preview">
        {speakers.map((sp) => (
          <div key={sp.id} className="speaker-card-preview">
            <div className="speaker-avatar-wrap">
              {sp.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="speaker-info">
              <h4 className="font-semibold text-slate-100">{sp.name}</h4>
              <p className="text-xs text-primary font-medium">{sp.role}</p>
              <p className="text-2xs text-slate-400">{sp.organization}</p>
            </div>
          </div>
        ))}
      </div>
    </PlaceholderPage>
  );
}
