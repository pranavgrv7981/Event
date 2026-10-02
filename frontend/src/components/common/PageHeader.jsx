import React from "react";

export default function PageHeader({ title, code, badge, subtitle, actions, children }) {
  return (
    <div className="page-header-container">
      <div className="page-header-left">
        <div className="page-header-title-row">
          <h1 className="page-title">{title}</h1>
          {code && <span className="entity-code-chip">{code}</span>}
          {badge}
        </div>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
      {children}
    </div>
  );
}
