import React from "react";

export default function DashboardSection({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  children,
  className = "",
}) {
  return (
    <section className={`dashboard-section-panel ${className}`}>
      <div className="section-panel-header">
        <div className="section-header-left">
          {Icon && (
            <div className="section-header-icon-box">
              <Icon className="w-4 h-4 text-slate-300" />
            </div>
          )}
          <div className="section-header-text">
            <div className="flex items-center gap-2">
              <h2 className="section-panel-title">{title}</h2>
              {badge}
            </div>
            {subtitle && <p className="section-panel-subtitle">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="section-header-actions">{actions}</div>}
      </div>

      <div className="section-panel-content">{children}</div>
    </section>
  );
}
