import React from "react";
import { Wrench, MapPin, Calendar, Layers } from "lucide-react";
import StatusBadge from "../common/StatusBadge";

export default function EquipmentCard({ equipment, onClick }) {
  return (
    <div
      className="entity-ops-card equipment-ops-card"
      onClick={() => onClick && onClick(equipment)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick && onClick(equipment)}
    >
      <div className="card-top-row">
        <div className="flex items-center gap-2">
          <div className="equipment-icon-box">
            <Wrench className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="card-entity-title">{equipment.name}</h3>
            {equipment.code && <span className="entity-code-chip">{equipment.code}</span>}
          </div>
        </div>
        <StatusBadge status={equipment.status} />
      </div>

      <div className="card-relationships-grid">
        <div className="relationship-item">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="relationship-label">Venue:</span>
          <span className="relationship-value text-slate-200 font-mono text-xs">
            {equipment.venueName}
          </span>
        </div>

        <div className="relationship-item">
          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="relationship-label">Quantity:</span>
          <span className="relationship-value font-mono text-xs text-slate-100 font-bold">
            {equipment.quantity} Unit(s)
          </span>
        </div>
      </div>

      {/* Assigned Session Allocation */}
      <div className="equipment-session-box">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="relationship-label">Session:</span>
          <span className="font-semibold text-xs text-slate-200 truncate">
            {equipment.assignedSessionTitle || "General Facility"}
          </span>
        </div>
      </div>

      {/* Notes / Tech Spec preview */}
      {equipment.notes && (
        <p className="equipment-notes-preview font-mono text-2xs text-slate-400 truncate mt-1">
          Note: {equipment.notes}
        </p>
      )}

      {/* Footer */}
      <div className="card-telemetry-footer">
        <span className="text-2xs font-mono text-slate-400">Category: {equipment.type}</span>
        <span className="card-inspect-hint ml-auto">Inspect Asset →</span>
      </div>
    </div>
  );
}
