import React, { useState, useEffect } from "react";
import { History } from "lucide-react";
import PlaceholderPage from "../components/common/PlaceholderPage";
import ChangeAlert from "../components/dashboard/ChangeAlert";
import { getChanges } from "../services/api";

export default function ChangesPage() {
  const [changes, setChanges] = useState([]);

  useEffect(() => {
    getChanges().then(setChanges).catch(console.error);
  }, []);

  return (
    <PlaceholderPage
      title="Operational Change History"
      code="MOD-CHNG"
      subtitle="Audit log of room relocations, schedule shifts, and operational field mutations."
      icon={History}
      phaseTarget="Phase 2 — Change History & Rollback Logs"
      statSummary={[
        { count: changes.length || 2, label: "Recorded Changes" },
        { count: "1", label: "Critical Relocation" },
        { count: "1", label: "Schedule Delay" },
      ]}
    >
      <div className="changes-feed-container">
        {changes.map((change) => (
          <div key={change.id} className="mb-4">
            <ChangeAlert change={change} />
          </div>
        ))}
      </div>
    </PlaceholderPage>
  );
}
