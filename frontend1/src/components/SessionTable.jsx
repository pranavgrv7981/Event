import React, { useState } from 'react';

export function SessionTable({ sessions = [], venues = [], onInitiateChange, onInspectDependencies }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [venueFilter, setVenueFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const formatTime = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return iso;
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      s.title?.toLowerCase().includes(term) ||
      s.description?.toLowerCase().includes(term) ||
      s.speakers?.some((sp) => sp.name.toLowerCase().includes(term));
    const matchesVenue = venueFilter === 'all' || s.venue_id === venueFilter;
    return matchesSearch && matchesVenue;
  });

  return (
    <div className="cc-card">
      <div className="cc-card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div className="cc-card-title">
          <span>📅</span>
          <span>Event Sessions ({filteredSessions.length} / {sessions.length})</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            className="cc-input"
            placeholder="Search sessions or speakers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '200px' }}
          />
          <select
            className="cc-select"
            value={venueFilter}
            onChange={(e) => setVenueFilter(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="all">All Venues</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="cc-table-wrapper">
        <table className="cc-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Venue</th>
              <th>Time</th>
              <th>Speakers</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No sessions match current filter criteria.
                </td>
              </tr>
            ) : (
              filteredSessions.map((session) => {
                const isExpanded = expandedId === session.id;
                return (
                  <React.Fragment key={session.id}>
                    <tr>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{session.title}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {session.id}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>
                          {session.venue?.name || session.venue_id}
                        </div>
                        {session.venue?.capacity && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            Cap: {session.venue.capacity}
                          </div>
                        )}
                      </td>
                      <td>
                        <div>{formatTime(session.start_time)} - {formatTime(session.end_time)}</div>
                      </td>
                      <td>
                        {session.speakers && session.speakers.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {session.speakers.map((sp) => (
                              <div key={sp.id} style={{ fontSize: '11px' }}>
                                <strong>{sp.name}</strong> <span style={{ opacity: 0.6, fontSize: '10px' }}>({sp.organization})</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        <span className={`cc-badge ${session.status === 'scheduled' ? 'green' : 'amber'}`}>
                          {session.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="cc-btn cc-btn-secondary cc-btn-sm"
                            onClick={() => setExpandedId(isExpanded ? null : session.id)}
                            title="Toggle details"
                          >
                            {isExpanded ? '▲' : '▼'}
                          </button>
                          {onInspectDependencies && (
                            <button
                              className="cc-btn cc-btn-secondary cc-btn-sm"
                              onClick={() => onInspectDependencies('session', session.id)}
                              title="Inspect dependencies"
                            >
                              🔗
                            </button>
                          )}
                          <button
                            className="cc-btn cc-btn-primary cc-btn-sm"
                            onClick={() => onInitiateChange && onInitiateChange(session)}
                          >
                            ⚡ Change
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Detailed Accordion Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan="6" style={{ backgroundColor: 'rgba(9, 13, 22, 0.95)', padding: '14px 18px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                            <div>
                              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                                Overview
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                {session.description || 'No description provided.'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                                Assigned Volunteers ({session.volunteers?.length || 0})
                              </div>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {session.volunteers?.map((v) => (
                                  <span key={v.id} className="cc-badge neutral">
                                    {v.name} ({v.role})
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                                Assigned Equipment ({session.equipment?.length || 0})
                              </div>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {session.equipment?.map((eq) => (
                                  <span key={eq.id} className="cc-badge neutral">
                                    {eq.name} (Qty: {eq.quantity})
                                  </span>
                                ))}
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
