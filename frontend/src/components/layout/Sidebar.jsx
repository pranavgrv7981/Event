import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Users,
  HeartHandshake,
  Wrench,
  CheckSquare,
  AlertTriangle,
  History,
  GitBranch,
} from "lucide-react";
import { useEvent } from "../../hooks/useEvent";

export default function Sidebar({ mobileOpen, onCloseMobile }) {
  const { currentEvent } = useEvent();

  const navItems = [
    {
      to: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      isPrimary: true,
      badge: null,
    },
    {
      section: "CORE OPERATIONS",
    },
    {
      to: "/sessions",
      label: "Sessions",
      icon: Calendar,
      badge: currentEvent?.stats?.sessions || "24",
    },
    {
      to: "/venues",
      label: "Venues",
      icon: Building2,
      badge: null,
    },
    {
      to: "/speakers",
      label: "Speakers",
      icon: Users,
      badge: null,
    },
    {
      to: "/volunteers",
      label: "Volunteers",
      icon: HeartHandshake,
      badge: null,
    },
    {
      to: "/equipment",
      label: "Equipment",
      icon: Wrench,
      badge: null,
    },
    {
      section: "COMMAND & CONTROL",
    },
    {
      to: "/tasks",
      label: "Tasks",
      icon: CheckSquare,
      badge: currentEvent?.stats?.tasks || "31",
      badgeType: "neutral",
    },
    {
      to: "/risks",
      label: "Risks",
      icon: AlertTriangle,
      badge: currentEvent?.stats?.risks || "3",
      badgeType: "danger",
    },
    {
      to: "/changes",
      label: "Changes",
      icon: History,
      badge: "NEW",
      badgeType: "warning",
    },
    {
      to: "/impact",
      label: "Impact Analysis",
      icon: GitBranch,
      badge: null,
      badgeType: "neutral",
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="mobile-backdrop" onClick={onCloseMobile} aria-hidden="true" />
      )}

      <aside className={`sidebar-container ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          {/* Operations Context Header */}
          <div className="sidebar-context-box">
            <span className="sidebar-context-label">ACTIVE OPERATIONS CONTEXT</span>
            <p className="sidebar-context-event-name">{currentEvent?.name || "Loading..."}</p>
            <div className="sidebar-context-meta">
              <span className="sidebar-context-phase">{currentEvent?.currentPhase || "Live Phase"}</span>
              <span className="sidebar-context-dot">·</span>
              <span className="sidebar-context-tz">IST</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="sidebar-nav">
            {navItems.map((item, index) => {
              if (item.section) {
                return (
                  <div key={index} className="sidebar-section-divider">
                    <span className="sidebar-section-text">{item.section}</span>
                  </div>
                );
              }

              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `sidebar-link ${item.isPrimary ? "primary-entry" : ""} ${isActive ? "active" : ""}`
                  }
                >
                  <div className="sidebar-link-content">
                    <Icon className="sidebar-icon" />
                    <span className="sidebar-label">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`sidebar-badge ${item.badgeType ? `badge-${item.badgeType}` : ""}`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Sidebar Status Footer */}
          <div className="sidebar-footer">
            <div className="sidebar-system-status">
              <div className="flex items-center gap-2">
                <span className="status-dot dot-success pulse-anim" />
                <span className="text-xs font-mono font-medium text-slate-300">OPS TELEMETRY ACTIVE</span>
              </div>
              <span className="text-2xs font-mono text-slate-500">ENGINE v1.0 · P2 SHELL</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
