import React from 'react';

export function StatsCard({ label, value, subtext, color = 'blue', icon, onClick }) {
  return (
    <div 
      className={`stat-card ${color}`} 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stat-label">
        <span>{label}</span>
        {icon && <span style={{ fontSize: '15px' }}>{icon}</span>}
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );
}

export default StatsCard;
