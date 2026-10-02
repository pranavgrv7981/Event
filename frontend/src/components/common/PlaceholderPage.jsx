import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Cpu } from "lucide-react";
import PageHeader from "./PageHeader";

export default function PlaceholderPage({
  title,
  code,
  badge,
  subtitle,
  icon: Icon,
  phaseTarget = "Phase 2 — Entity Views & Management",
  statSummary,
  children,
}) {
  return (
    <div className="placeholder-page-container">
      <div className="breadcrumb-nav mb-3">
        <Link to="/" className="breadcrumb-link">
          <ArrowLeft className="w-3.5 h-3.5 mr-1 inline" />
          Back to Command Dashboard
        </Link>
      </div>

      <PageHeader
        title={title}
        code={code}
        badge={badge}
        subtitle={subtitle}
        actions={
          <div className="placeholder-phase-badge">
            <Cpu className="w-3.5 h-3.5 text-primary mr-1.5" />
            <span className="font-mono text-2xs text-slate-300">SCHEDULED FOR {phaseTarget.toUpperCase()}</span>
          </div>
        }
      />

      {/* Quick Summary Pill Bar if provided */}
      {statSummary && (
        <div className="placeholder-summary-strip">
          {statSummary.map((item, idx) => (
            <div key={idx} className="summary-strip-item">
              <span className="summary-strip-count">{item.count}</span>
              <span className="summary-strip-label">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Content / Preview Area */}
      <div className="placeholder-content-card">
        {children || (
          <div className="placeholder-default-body">
            <div className="placeholder-icon-wrap">
              {Icon && <Icon className="w-8 h-8 text-primary/70" />}
            </div>
            <h3 className="placeholder-title">{title} Operations Module</h3>
            <p className="placeholder-desc">
              Navigation route verified. Full operational workflows, filtering, editing, and dependency linkages
              will be activated in subsequent phases.
            </p>
            <div className="placeholder-meta-tags">
              <span className="meta-tag">ROUTE: OK</span>
              <span className="meta-tag">STATE: STAGED</span>
              <span className="meta-tag">API: CONNECTED</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
