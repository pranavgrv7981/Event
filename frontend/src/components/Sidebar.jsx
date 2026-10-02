import React from 'react';

export function Sidebar({ currentTab, onSelectTab, counts = {} }) {
  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: '🎛️', badge: counts.conflicts > 0 ? `${counts.conflicts} alert` : null, badgeType: 'danger' },
    { id: 'demo', label: 'Change Studio', icon: '⚡', badge: 'Demo Flow', badgeType: 'cyan' },
    { id: 'sessions', label: 'Sessions & Schedule', icon: '📅', badge: counts.sessions },
    { id: 'venues', label: 'Venues & Spaces', icon: '🏢', badge: counts.venues },
    { id: 'people', label: 'Speakers & Staff', icon: '👥', badge: (counts.speakers || 0) + (counts.volunteers || 0) },
    { id: 'equipment', label: 'Equipment & AV', icon: '📦', badge: counts.equipment },
    { id: 'tasks', label: 'Tasks & Checklist', icon: '✅', badge: counts.openTasks, badgeType: counts.openTasks > 0 ? 'amber' : 'neutral' },
    { id: 'risks', label: 'Risk Register', icon: '⚠️', badge: counts.highRisks, badgeType: counts.highRisks > 0 ? 'danger' : 'neutral' },
    { id: 'changes', label: 'Change History', icon: '🔄', badge: counts.changes },
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">OPERATIONS CONSOLE</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Operations Control</div>
        {navItems.slice(0, 2).map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
          >
            <div className="nav-item-left">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className={`nav-badge ${item.badgeType === 'danger' ? 'danger' : ''}`}>
                {item.badge}
              </span>
            )}
          </button>
        ))}

        <div className="nav-section-title" style={{ marginTop: '12px' }}>Event Architecture</div>
        {navItems.slice(2, 6).map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
          >
            <div className="nav-item-left">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {item.badge !== undefined && item.badge !== null && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </button>
        ))}

        <div className="nav-section-title" style={{ marginTop: '12px' }}>Incident & Governance</div>
        {navItems.slice(6).map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
          >
            <div className="nav-item-left">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {item.badge !== undefined && item.badge !== null && (
              <span className={`nav-badge ${item.badgeType === 'danger' ? 'danger' : ''}`}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div><strong>CORE ARCHITECTURE</strong></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10px' }}>
          <div>P2 Frontend (React + Vite)</div>
          <div>P1 Backend + AI (FastAPI + SQLite)</div>
          <div>P3 Notion Integration</div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
