import React, { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import PlaceholderPage from "../components/common/PlaceholderPage";
import RiskItem from "../components/dashboard/RiskItem";
import { getRisks } from "../services/api";

export default function RisksPage() {
  const [risks, setRisks] = useState([]);

  useEffect(() => {
    getRisks().then(setRisks).catch(console.error);
  }, []);

  return (
    <PlaceholderPage
      title="Active Risks & Conflict Matrix"
      code="MOD-RISK"
      subtitle="Capacity thresholds, hardware conflicts, speaker double-booking, and environmental alerts."
      icon={AlertTriangle}
      phaseTarget="Phase 2 — Risk Matrix & Mitigation Engine"
      statSummary={[
        { count: risks.length || 3, label: "Active Threats" },
        { count: "1", label: "Critical Severity" },
        { count: "1", label: "High Severity" },
        { count: "1", label: "Mitigating" },
      ]}
    >
      <div className="risks-grid-preview">
        {risks.map((risk) => (
          <RiskItem key={risk.id} risk={risk} />
        ))}
      </div>
    </PlaceholderPage>
  );
}
