import React, { useState } from 'react';

export function TaskList({ tasks = [], onUpdateTaskStatus, isUpdating = false }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const formatTime = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return iso;
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'critical':
      case 'high': return 'rose';
      case 'medium': return 'amber';
      default: return 'neutral';
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case 'done': return 'green';
      case 'in_progress': return 'cyan';
      case 'blocked': return 'rose';
      default: return 'amber';
    }
  };

  return (
    <div className="cc-card cc-task-list">
      <div className="cc-card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <div className="cc-card-title">
          <span>✅</span>
          <span>Operational Tasks ({filteredTasks.length} / {tasks.length})</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <select
            className="cc-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '120px', padding: '4px 6px', fontSize: '11px' }}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>
          <select
            className="cc-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ width: '120px', padding: '4px 6px', fontSize: '11px' }}
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>
            No operational tasks match filters.
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              className="cc-task-item"
              key={task.id}
              style={{
                backgroundColor: 'rgba(9, 13, 22, 0.65)',
                border: '1px solid var(--border-dim)',
                borderRadius: '6px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div className="cc-task-item-heading" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-main)' }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {task.description}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <span className={`cc-badge ${getPriorityBadge(task.priority)}`}>
                    {task.priority?.toUpperCase()}
                  </span>
                  <span className={`cc-badge ${getStatusBadge(task.status)}`}>
                    {task.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-dim)', fontSize: '10px', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span>Due: <strong style={{ color: 'var(--text-main)' }}>{formatTime(task.due_time)}</strong></span>
                  {task.assigned_volunteer && (
                    <span>Assigned: <strong style={{ color: 'var(--accent-cyan)' }}>{task.assigned_volunteer.name}</strong></span>
                  )}
                  {task.source_change_id && (
                    <span className="cc-badge neutral" style={{ fontSize: '9px' }}>
                      Follow-up from {task.source_change_id}
                    </span>
                  )}
                </div>

                {onUpdateTaskStatus && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {task.status !== 'in_progress' && (
                      <button
                        className="cc-btn cc-btn-secondary cc-btn-sm"
                        disabled={isUpdating}
                        onClick={() => onUpdateTaskStatus(task.id, 'in_progress')}
                        style={{ padding: '2px 5px', fontSize: '9px' }}
                      >
                        In Progress
                      </button>
                    )}
                    {task.status !== 'done' && (
                      <button
                        className="cc-btn cc-btn-primary cc-btn-sm"
                        disabled={isUpdating}
                        onClick={() => onUpdateTaskStatus(task.id, 'done')}
                        style={{ padding: '2px 5px', fontSize: '9px', backgroundColor: 'var(--accent-emerald)' }}
                      >
                        ✓ Done
                      </button>
                    )}
                    {task.status !== 'blocked' && (
                      <button
                        className="cc-btn cc-btn-secondary cc-btn-sm"
                        disabled={isUpdating}
                        onClick={() => onUpdateTaskStatus(task.id, 'blocked')}
                        style={{ padding: '2px 5px', fontSize: '9px', color: '#fb7185' }}
                      >
                        Blocked
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TaskList;
