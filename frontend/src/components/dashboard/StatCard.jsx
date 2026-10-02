import React from "react";

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  variant = "default",
  trend,
  breakdown = [],
  onClick,
}) {
  return (
    <div
      className={`stat-card stat-card-${variant} ${onClick ? "interactive" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="stat-card-header">
        <div className="stat-card-title-wrap">
          <span className="stat-card-title">{title}</span>
          {subtext && <span className="stat-card-subtext">{subtext}</span>}
        </div>
        {Icon && (
          <div className={`stat-card-icon-wrap icon-${variant}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="stat-card-body">
        <div className="stat-card-main-val">
          <span className="stat-value">{value}</span>
          {trend && <span className="stat-trend">{trend}</span>}
        </div>

        {breakdown && breakdown.length > 0 && (
          <div className="stat-breakdown-row">
            {breakdown.map((item, idx) => (
              <div key={idx} className="stat-breakdown-chip">
                <span className={`chip-dot dot-${item.variant || "neutral"}`} />
                <span className="chip-label">
                  <strong className="chip-count">{item.count}</strong> {item.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
