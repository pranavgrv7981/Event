import React from "react";
import { AlertTriangle } from "lucide-react";
import { getSeverityStyle } from "../../utils/formatters";

export default function RiskItem({ risk }) {
  const { badgeClass, borderClass } = getSeverityStyle(risk.severity);

  return (
    <div className={`risk-list-card ${borderClass}`}>
      <div className="risk-header-row">
        <div className="risk-severity-wrap">
          <span className={`risk-severity-badge ${badgeClass}`}>
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            {risk.severity} SEVERITY
          </span>
          {risk.status && (
            <span className="risk-status-tag font-mono text-2xs uppercase">
              {risk.status}
            </span>
          )}
        </div>
        {risk.impactArea && (
          <span className="risk-area-tag">{risk.impactArea}</span>
        )}
      </div>

      <h4 className="risk-title">{risk.title}</h4>
      <p className="risk-description">{risk.description}</p>

      {risk.mitigation && (
        <div className="risk-mitigation-box">
          <span className="mitigation-label">MITIGATION:</span>
          <span className="mitigation-text">{risk.mitigation}</span>
        </div>
      )}
    </div>
  );
}
