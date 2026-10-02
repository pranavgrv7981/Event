import React from "react";
import { getStatusStyle } from "../../utils/formatters";

export default function StatusBadge({ status, variant, pulse = false, size = "sm", className = "" }) {
  const computed = variant ? { badgeClass: `badge-${variant}`, dotClass: `dot-${variant}` } : getStatusStyle(status);
  const sizeClass = size === "md" ? "badge-md" : "badge-sm";

  return (
    <span className={`status-badge ${computed.badgeClass} ${sizeClass} ${className}`}>
      <span className={`status-dot ${computed.dotClass} ${pulse ? "pulse-anim" : ""}`} />
      <span className="badge-text">{status}</span>
    </span>
  );
}
