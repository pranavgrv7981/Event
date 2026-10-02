import React, { useState, useEffect } from "react";
import { Wrench } from "lucide-react";
import PlaceholderPage from "../components/common/PlaceholderPage";
import StatusBadge from "../components/common/StatusBadge";
import { getEquipment } from "../services/api";

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState([]);

  useEffect(() => {
    getEquipment().then(setEquipment).catch(console.error);
  }, []);

  return (
    <PlaceholderPage
      title="Equipment & AV Assets"
      code="MOD-EQUP"
      subtitle="Hardware inventory, projector status, PA systems, computing rigs, and patch status."
      icon={Wrench}
      phaseTarget="Phase 2 — Asset Tracking & Allocation"
      statSummary={[
        { count: equipment.length || 8, label: "Asset Types" },
        { count: "5", label: "Relocated to Hall B" },
        { count: "100%", label: "Operational" },
      ]}
    >
      <div className="placeholder-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Asset Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Current Venue</th>
              <th>Operational Status</th>
            </tr>
          </thead>
          <tbody>
            {equipment.map((eq) => (
              <tr key={eq.id}>
                <td className="font-medium text-slate-100">{eq.name}</td>
                <td className="text-slate-400">{eq.type}</td>
                <td className="font-mono text-xs">{eq.quantity}</td>
                <td className="font-mono text-xs text-primary">{eq.venue}</td>
                <td><StatusBadge status={eq.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PlaceholderPage>
  );
}
