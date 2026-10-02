import React, { useState } from 'react';

export function SessionTable({ sessions = [], venues = [], onInitiateChange, onInspectDependencies }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVenue, setSelectedVenue] = useState('all');
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  const formatTime = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return isoString;
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = 
      s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.speakers?.some(sp => sp.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesVenue = selectedVenue === 'all' || s.venue_id === selectedVenue;
    return matchesSearch && matchesVenue;
  });

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="card-title">
          <span>📅</span>
          <span>Program Sessions ({filteredSessions.length} / {sessions.length})</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search sessions or speakers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '220px', padding: '6px 10px', fontSize: '12px' }}
          />
          <select
            className="form-select"
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
            style={{ width: '160px', padding: '6px 10px', fontSize: '12px' }}
          >
            <option value="all">All Venues</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Venue</th>
              <th>Time Slot</th>
              <th>Speakers</th>
              <th>Resources</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No sessions match current search criteria.
                </td>
              </tr>
            ) : (
              filteredSessions.map((session) => {
                const isExpanded = expandedSessionId === session.id;
                return (
                  <React.Fragment key={session.id}>
                    <tr>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {session.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          ID: {session.id}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: '#93c5fd' }}>
                          {session.venue?.name || session.venue_id}
                        </div>
                        {session.venue?.capacity && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Cap: {session.venue.capacity}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </div>
                      </td>
                      <td>
                        {session.speakers && session.speakers.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {session.speakers.map((sp) => (
                              <div key={sp.id} style={{ fontSize: '12px' }}>
                                <strong>{sp.name}</strong>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                  ({sp.organization})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <span className="badge neutral" title={`${session.volunteers?.length || 0} Volunteers`}>
                            🤝 {session.volunteers?.length || 0}
                          </span>
                          <span className="badge neutral" title={`${session.equipment?.length || 0} Equipment`}>
                            📦 {session.equipment?.length || 0}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${session.status === 'scheduled' ? 'emerald' : session.status === 'delayed' ? 'amber' : 'blue'}`}>
                          {session.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                            title="Toggle details"
                          >
                            {isExpanded ? '▲' : '▼'}
                          </button>
                          {onInspectDependencies && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => onInspectDependencies('session', session.id)}
                              title="Deterministic dependencies"
                            >
                              🔗
                            </button>
                          )}
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => onInitiateChange && onInitiateChange(session)}
                            style={{ fontWeight: 600 }}
                          >
                            ⚡ Change
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded details row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan="7" style={{ backgroundColor: 'rgba(10, 15, 25, 0.9)', padding: '16px 20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                            <div>
                              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                                Session Description
                              </div>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {session.description || 'No description provided.'}
                              </p>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                                Assigned Volunteers ({session.volunteers?.length || 0})
                              </div>
                              <div className="chip-container">
                                {session.volunteers && session.volunteers.length > 0 ? (
                                  session.volunteers.map(v => (
                                    <span key={v.id} className="chip">
                                      {v.name} ({v.role})
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>None assigned</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                                Assigned Equipment ({session.equipment?.length || 0})
                              </div>
                              <div className="chip-container">
                                {session.equipment && session.equipment.length > 0 ? (
                                  session.equipment.map(eq => (
                                    <span key={eq.id} className="chip">
                                      {eq.name} (Qty: {eq.quantity})
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No equipment</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SessionTable;
