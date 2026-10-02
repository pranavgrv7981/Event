import React, { useState } from 'react';

export function VenuesPage({
  venues = [],
  equipment = [],
  speakers = [],
  volunteers = [],
  onInspectDependencies,
}) {
  const [activeTab, setActiveTab] = useState('venues');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800 }}>Venues & Campus Resources</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            Physical auditoriums, AV equipment, speakers, and volunteer staff.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-panel)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-dim)' }}>
          <button
            className={`cc-btn cc-btn-sm ${activeTab === 'venues' ? 'cc-btn-primary' : 'cc-btn-secondary'}`}
            onClick={() => setActiveTab('venues')}
          >
            🏢 Venues ({venues.length})
          </button>
          <button
            className={`cc-btn cc-btn-sm ${activeTab === 'equipment' ? 'cc-btn-primary' : 'cc-btn-secondary'}`}
            onClick={() => setActiveTab('equipment')}
          >
            📦 Equipment ({equipment.length})
          </button>
          <button
            className={`cc-btn cc-btn-sm ${activeTab === 'speakers' ? 'cc-btn-primary' : 'cc-btn-secondary'}`}
            onClick={() => setActiveTab('speakers')}
          >
            🎤 Speakers ({speakers.length})
          </button>
          <button
            className={`cc-btn cc-btn-sm ${activeTab === 'volunteers' ? 'cc-btn-primary' : 'cc-btn-secondary'}`}
            onClick={() => setActiveTab('volunteers')}
          >
            🤝 Volunteers ({volunteers.length})
          </button>
        </div>
      </div>

      {/* Venues View */}
      {activeTab === 'venues' && (
        <div className="cc-card">
          <div className="cc-card-header">
            <div className="cc-card-title">
              <span>🏢</span>
              <span>Campus Venues ({venues.length})</span>
            </div>
          </div>
          <div className="cc-table-wrapper">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Venue Name</th>
                  <th>Location</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Dependencies</th>
                </tr>
              </thead>
              <tbody>
                {venues.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{v.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{v.id}</div>
                    </td>
                    <td>{v.location}</td>
                    <td><strong>{v.capacity}</strong> attendees</td>
                    <td>
                      <span className={`cc-badge ${v.status === 'confirmed' ? 'green' : 'cyan'}`}>
                        {v.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="cc-btn cc-btn-secondary cc-btn-sm"
                        onClick={() => onInspectDependencies && onInspectDependencies('venue', v.id)}
                      >
                        🔗 Traversal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Equipment View */}
      {activeTab === 'equipment' && (
        <div className="cc-card">
          <div className="cc-card-header">
            <div className="cc-card-title">
              <span>📦</span>
              <span>Hardware & AV Equipment ({equipment.length})</span>
            </div>
          </div>
          <div className="cc-table-wrapper">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Assigned Venue</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Dependencies</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((eq) => (
                  <tr key={eq.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{eq.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{eq.id}</div>
                    </td>
                    <td><span className="cc-badge neutral">{eq.category}</span></td>
                    <td><strong>{eq.quantity}</strong> units</td>
                    <td>{eq.venue_id ? <span style={{ color: 'var(--accent-cyan)' }}>{eq.venue_id}</span> : 'Unassigned'}</td>
                    <td>
                      <span className={`cc-badge ${eq.status === 'tested' ? 'green' : 'amber'}`}>
                        {eq.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="cc-btn cc-btn-secondary cc-btn-sm"
                        onClick={() => onInspectDependencies && onInspectDependencies('equipment', eq.id)}
                      >
                        🔗 Traversal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Speakers View */}
      {activeTab === 'speakers' && (
        <div className="cc-card">
          <div className="cc-card-header">
            <div className="cc-card-title">
              <span>🎤</span>
              <span>Invited Speakers ({speakers.length})</span>
            </div>
          </div>
          <div className="cc-table-wrapper">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Speaker Name</th>
                  <th>Title</th>
                  <th>Organization</th>
                  <th>Email</th>
                  <th style={{ textAlign: 'right' }}>Dependencies</th>
                </tr>
              </thead>
              <tbody>
                {speakers.map((sp) => (
                  <tr key={sp.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{sp.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{sp.id}</div>
                    </td>
                    <td>{sp.title}</td>
                    <td><strong style={{ color: 'var(--accent-cyan)' }}>{sp.organization}</strong></td>
                    <td><code>{sp.email}</code></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="cc-btn cc-btn-secondary cc-btn-sm"
                        onClick={() => onInspectDependencies && onInspectDependencies('speaker', sp.id)}
                      >
                        🔗 Traversal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Volunteers View */}
      {activeTab === 'volunteers' && (
        <div className="cc-card">
          <div className="cc-card-header">
            <div className="cc-card-title">
              <span>🤝</span>
              <span>Volunteer Workforce ({volunteers.length})</span>
            </div>
          </div>
          <div className="cc-table-wrapper">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Volunteer Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Availability</th>
                  <th style={{ textAlign: 'right' }}>Dependencies</th>
                </tr>
              </thead>
              <tbody>
                {volunteers.map((vol) => (
                  <tr key={vol.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{vol.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{vol.id}</div>
                    </td>
                    <td><span className="cc-badge neutral">{vol.role}</span></td>
                    <td><code>{vol.email}</code></td>
                    <td>
                      <span className={`cc-badge ${vol.availability === 'assigned' ? 'cyan' : 'green'}`}>
                        {vol.availability}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="cc-btn cc-btn-secondary cc-btn-sm"
                        onClick={() => onInspectDependencies && onInspectDependencies('volunteer', vol.id)}
                      >
                        🔗 Traversal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default VenuesPage;
