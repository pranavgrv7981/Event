import React, { useState } from 'react';

export function TaskList({ tasks = [], onUpdateTaskStatus, isUpdating = false }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'critical': return 'rose';
      case 'high': return 'rose';
      case 'medium': return 'amber';
      case 'low': return 'blue';
      default: return 'neutral';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'done': return 'emerald';
      case 'in_progress': return 'blue';
      case 'blocked': return 'rose';
      case 'open':
      case 'todo': return 'amber';
      default: return 'neutral';
    }
  };

  const formatDueTime = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="card-title">
          <span>✅</span>
          <span>Operational Tasks ({filteredTasks.length} / {tasks.length})</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '130px', padding: '5px 8px', fontSize: '12px' }}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>
          <select
            className="form-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ width: '130px', padding: '5px 8px', fontSize: '12px' }}
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No operational tasks match filters.
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {task.description}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
                    {task.priority?.toUpperCase()}
                  </span>
                  <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                    {task.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>Due: <strong style={{ color: 'var(--text-primary)' }}>{formatDueTime(task.due_time)}</strong></span>
                  {task.assigned_volunteer && (
                    <span>Assigned: <strong style={{ color: '#93c5fd' }}>{task.assigned_volunteer.name}</strong></span>
                  )}
                  {task.session && (
                    <span>Session: <strong>{task.session.title}</strong></span>
                  )}
                  {task.venue && (
                    <span>Venue: <strong>{task.venue.name}</strong></span>
                  )}
                  {task.source_change_id && (
                    <span className="badge neutral" style={{ fontSize: '10px' }}>
                      Follow-up from {task.source_change_id}
                    </span>
                  )}
                </div>

                {onUpdateTaskStatus && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>Mark:</span>
                    {task.status !== 'in_progress' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={isUpdating}
                        onClick={() => onUpdateTaskStatus(task.id, 'in_progress')}
                        style={{ padding: '2px 6px', fontSize: '10px' }}
                      >
                        In Progress
                      </button>
                    )}
                    {task.status !== 'done' && (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={isUpdating}
                        onClick={() => onUpdateTaskStatus(task.id, 'done')}
                        style={{ padding: '2px 6px', fontSize: '10px', backgroundColor: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)' }}
                      >
                        ✓ Done
                      </button>
                    )}
                    {task.status !== 'blocked' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={isUpdating}
                        onClick={() => onUpdateTaskStatus(task.id, 'blocked')}
                        style={{ padding: '2px 6px', fontSize: '10px', color: '#f87171' }}
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
