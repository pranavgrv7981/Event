import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Layers,
  UserCheck,
  Bell,
  Menu,
  X,
  Radio,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { useEvent } from "../../hooks/useEvent";

export default function TopBar({ onToggleMobileMenu, mobileMenuOpen }) {
  const {
    events,
    currentEventId,
    setCurrentEventId,
    currentRole,
    setCurrentRole,
    roles,
    isLive,
    toggleLiveStatus,
  } = useEvent();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="topbar">
      {/* Left: Mobile Toggle & Brand */}
      <div className="topbar-left">
        <button
          className="mobile-nav-toggle"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <Link to="/" className="brand-lockup">
          <div className="brand-logo-icon">
            <Radio className="w-4 h-4 text-primary" />
          </div>
          <div className="brand-text">
            <span className="brand-name">MIRA</span>
            <span className="brand-divider">/</span>
            <span className="brand-sub">EVENT COMMAND CENTER</span>
          </div>
        </Link>
      </div>

      {/* Center: Event Selector & LIVE Status */}
      <div className="topbar-center">
        {/* Event Selector */}
        <div className="event-selector-wrapper">
          <Layers className="w-3.5 h-3.5 text-muted-foreground mr-1.5" />
          <select
            className="topbar-select event-select"
            value={currentEventId}
            onChange={(e) => setCurrentEventId(e.target.value)}
            aria-label="Select active event"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.name} ({evt.code})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground pointer-events-none select-arrow" />
        </div>

        {/* LIVE Operational Status Indicator */}
        <button
          className={`live-indicator-pill ${isLive ? "live" : "standby"}`}
          onClick={toggleLiveStatus}
          title={isLive ? "Live Operations Mode Active (Click to toggle standby)" : "Standby Mode (Click to toggle live)"}
        >
          <span className={`live-beacon ${isLive ? "beacon-active" : ""}`} />
          <span className="live-text">{isLive ? "LIVE OPERATIONS" : "STANDBY"}</span>
        </button>
      </div>

      {/* Right: Role Selector, Notifications, Profile */}
      <div className="topbar-right">
        {/* Role Selector */}
        <div className="role-selector-wrapper">
          <UserCheck className="w-3.5 h-3.5 text-muted-foreground mr-1.5" />
          <span className="role-label-prefix">ROLE:</span>
          <select
            className="topbar-select role-select"
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            aria-label="Select command role"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground pointer-events-none select-arrow" />
        </div>

        {/* Notifications / Alerts Indicator */}
        <div className="relative notification-container">
          <button
            className="topbar-icon-button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            title="Operational Alerts"
            aria-label="Operational Alerts"
          >
            <Bell className="w-4 h-4 text-slate-300" />
            <span className="notification-badge">1</span>
          </button>

          {/* Quick Notification Dropdown */}
          {notificationsOpen && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <span className="font-semibold text-xs text-slate-200">OPERATIONAL NOTIFICATIONS</span>
                <span className="badge-danger text-2xs px-1.5 py-0.5 rounded">1 URGENT</span>
              </div>
              <div className="notification-list">
                <div
                  className="notification-item urgent cursor-pointer"
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate("/changes");
                  }}
                >
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-danger mt-0.5 shrink-0" />
                    <div>
                      <p className="notification-title">Venue Relocation: Hall A → Hall B</p>
                      <p className="notification-time">12 mins ago · 4 sessions affected</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="notification-footer">
                <button
                  className="view-all-alerts-link"
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate("/changes");
                  }}
                >
                  View Change History →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User / Profile Area */}
        <div className="user-profile-badge">
          <div className="user-avatar-initials">OD</div>
          <div className="user-info-text">
            <span className="user-name">Ops Desk 01</span>
            <span className="user-sub-role">
              {roles.find((r) => r.id === currentRole)?.roleName || "Command Lead"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
