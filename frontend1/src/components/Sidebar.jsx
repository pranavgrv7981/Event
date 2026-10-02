import React from 'react';

export function Sidebar({ currentTab, onSelectTab, counts = {} }) {
  const navSections = [
    {
      heading: 'Operations',
      items: [
        { id: 'dashboard', label: 'Command Center', icon: '🎛️', badge: counts.conflicts > 0 ? `${counts.conflicts} alert` : null, badgeClass: 'danger' },
        { id: 'demo', label: 'Change Studio', icon: '⚡', badge: 'Demo', badgeClass: 'cyan' },
      ],
    },
    {
      heading: 'Event Structure',
      items: [
        { id: 'sessions', label: 'Sessions & Schedule', icon: '📅', badge: counts.sessions },
        { id: 'venues', label: 'Venues & Resources', icon: '🏢', badge: counts.venues },
        { id: 'people', label: 'Speakers & Staff', icon: '👥', badge: (counts.speakers || 0) + (counts.volunteers || 0) },
        { id: 'equipment', label: 'Equipment & AV', icon: '📦', badge: counts.equipment },
      ],
    },
    {
      heading: 'Assurance & Governance',
      items: [
        { id: 'tasks', label: 'Tasks & Checklist', icon: '✅', badge: counts.openTasks, badgeClass: counts.openTasks > 0 ? 'amber' : 'neutral' },
        { id: 'risks', label: 'Risk Register', icon: '⚠️', badge: counts.highRisks, badgeClass: counts.highRisks > 0 ? 'danger' : 'neutral' },
        { id: 'changes', label: 'Change Audit Log', icon: '🔄', badge: counts.changes },
      ],
    },
  ];

  return (
    <aside className="cc-sidebar">
      <div className="cc-sidebar-header">
        <div className="cc-sidebar-logo">EO</div>
        <div className="cc-sidebar-title">COMMAND CENTER</div>
      </div>

      <div className="cc-sidebar-nav">
        {navSections.map((sec) => (
          <div key={sec.heading}>
            <div className="cc-nav-heading">{sec.heading}</div>
            {sec.items.map((item) => (
              <button
                key={item.id}
                className={`cc-nav-btn ${currentTab === item.id ? 'active' : ''}`}
                onClick={() => onSelectTab(item.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge !== null && (
                  <span className={`cc-nav-badge ${item.badgeClass === 'danger' ? 'danger' : ''}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="cc-sidebar-footer">
        <div style={{ fontWeight: 700, marginBottom: '2px', color: 'var(--text-dim)' }}>
          BACKUP FRONTEND (P2)
        </div>
        <div>Isolated in <code>frontend1/</code></div>
        <div style={{ opacity: 0.7, marginTop: '2px' }}>FastAPI + SQLite Engine</div>
      </div>
    </aside>
  );
}

export default Sidebar;
