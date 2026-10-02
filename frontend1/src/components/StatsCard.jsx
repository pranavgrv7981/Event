import React from 'react';

export function StatsCard({ label, value, subtext, color = 'blue', icon, onClick }) {
  return (
    <div className={`cc-stat-box ${color}`} onClick={onClick}>
      <div className="cc-stat-label">
        <span>{label}</span>
        {icon && <span>{icon}</span>}
      </div>
      <div className="cc-stat-num">{value ?? '—'}</div>
      {subtext && <div className="cc-stat-sub">{subtext}</div>}
    </div>
  );
}

export default StatsCard;
