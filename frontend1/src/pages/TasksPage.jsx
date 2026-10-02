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
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueTime, setDueTime] = useState('');
  const [assignedVolunteerId, setAssignedVolunteerId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
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

      await api.createTask(eventId, payload);
      setIsSubmitting(false);
      setShowCreate(false);
      setTitle('');
      setDescription('');
      if (onRefreshTasks) onRefreshTasks();
    } catch (err) {
      setIsSubmitting(false);
      setError(err?.detail || err?.message || 'Task creation failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800 }}>Operational Tasks & Checklist</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            Stage logistics, equipment moves, speaker briefs, and automated change follow-ups.
          </p>
        </div>
        <button className="cc-btn cc-btn-primary" onClick={() => setShowCreate(true)}>
          + Create Task
        </button>
      </div>

      <TaskList
        tasks={tasks}
        onUpdateTaskStatus={onUpdateTaskStatus}
        isUpdating={isUpdating}
      />

      {/* Creation Modal */}
      {showCreate && (
        <div className="cc-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="cc-modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="cc-modal-head">
              <div style={{ fontSize: '13px', fontWeight: 800 }}>NEW OPERATIONAL TASK</div>
              <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="cc-modal-body">
                {error && (
                  <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '6px', padding: '8px 12px', color: '#fecdd3', fontSize: '11px', marginBottom: '12px' }}>
                    {error}
                  </div>
                )}
                <div style={{ marginBottom: '12px' }}>
                  <label className="cc-form-label">Task Title</label>
                  <input
                    type="text"
                    className="cc-input"
                    placeholder="e.g. Test projector deck"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label className="cc-form-label">Description</label>
                  <textarea
                    className="cc-textarea"
                    placeholder="Operational instructions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    style={{ minHeight: '70px' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label className="cc-form-label">Priority</label>
                    <select className="cc-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="cc-form-label">Due Time</label>
                    <input
                      type="datetime-local"
                      className="cc-input"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label className="cc-form-label">Assign Volunteer</label>
                    <select className="cc-select" value={assignedVolunteerId} onChange={(e) => setAssignedVolunteerId(e.target.value)}>
                      <option value="">-- None --</option>
                      {volunteers.map((v) => (
                        <option key={v.id} value={v.id}>{v.name} ({v.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="cc-form-label">Linked Session</label>
                    <select className="cc-select" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                      <option value="">-- None --</option>
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="cc-form-label">Related Venue</label>
                  <select className="cc-select" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                    <option value="">-- None --</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="cc-modal-foot">
                <button type="button" className="cc-btn cc-btn-secondary cc-btn-sm" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="cc-btn cc-btn-primary cc-btn-sm" disabled={isSubmitting}>
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
