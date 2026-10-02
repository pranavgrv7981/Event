import React, { useState } from 'react';
import TaskList from '../components/TaskList';
import api from '../services/api';

export function TasksPage({
  eventId,
  tasks = [],
  volunteers = [],
  sessions = [],
  venues = [],
  onRefreshTasks,
  onUpdateTaskStatus,
  isUpdating = false,
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueTime, setDueTime] = useState('');
  const [assignedVolunteerId, setAssignedVolunteerId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setCreateError('Title and description are required.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      // Backend due_time expects ISO string datetime
      const isoDueTime = dueTime ? new Date(dueTime).toISOString() : new Date().toISOString();
      const payload = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status: 'open',
        due_time: isoDueTime,
        assigned_volunteer_id: assignedVolunteerId || null,
        session_id: sessionId || null,
        venue_id: venueId || null,
      };

      await api.createEventTask(eventId, payload);
      setIsSubmitting(false);
      setShowCreateModal(false);
      // Reset form
      setTitle('');
      setDescription('');
      if (onRefreshTasks) onRefreshTasks();
    } catch (err) {
      setIsSubmitting(false);
      setCreateError(err?.detail || err?.message || 'Failed to create task');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Operational Tasks & Checklist</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Track stage setups, volunteer assignments, technical rehearsals, and change follow-ups.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          style={{ fontWeight: 700 }}
        >
          + Create Operational Task
        </button>
      </div>

      <TaskList
        tasks={tasks}
        isUpdating={isUpdating}
        onUpdateTaskStatus={onUpdateTaskStatus}
      />

      {/* Task Creation Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ fontSize: '14px', fontWeight: 700 }}>CREATE OPERATIONAL TASK</div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="modal-body">
                {createError && (
                  <div className="alert-banner danger" style={{ marginBottom: '16px' }}>
                    <div className="alert-title">Creation Failed</div>
                    <div className="alert-description">{createError}</div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Task Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Test Auditorium A projector"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Detailed operational steps..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Time</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Assign Volunteer (Optional)</label>
                    <select className="form-select" value={assignedVolunteerId} onChange={(e) => setAssignedVolunteerId(e.target.value)}>
                      <option value="">-- Unassigned --</option>
                      {volunteers.map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.role})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Linked Session (Optional)</label>
                    <select className="form-select" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                      <option value="">-- None --</option>
                      {sessions.map(s => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Related Venue (Optional)</label>
                  <select className="form-select" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                    <option value="">-- None --</option>
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TasksPage;
