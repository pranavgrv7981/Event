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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Venues & Campus Resources</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Physical spaces, AV hardware, academic speakers, and operational volunteer workforce.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--bg-surface)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <button
            className={`btn btn-sm ${activeTab === 'venues' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('venues'); setSearchTerm(''); }}
          >
            🏢 Venues ({venues.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'equipment' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('equipment'); setSearchTerm(''); }}
          >
            📦 Equipment ({equipment.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'speakers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('speakers'); setSearchTerm(''); }}
          >
            🎤 Speakers ({speakers.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'volunteers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('volunteers'); setSearchTerm(''); }}
          >
            🤝 Volunteers ({volunteers.length})
          </button>
        </div>
      </div>

      {/* Subtab 1: Venues */}
      {activeTab === 'venues' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>🏢</span>
              <span>Campus Venues ({venues.length})</span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
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
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{v.id}</div>
                    </td>
                    <td>{v.location}</td>
                    <td>
                      <strong>{v.capacity}</strong> attendees
                    </td>
                    <td>
                      <span className={`badge ${v.status === 'confirmed' ? 'emerald' : 'blue'}`}>
                        {v.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
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

      {/* Subtab 2: Equipment */}
      {activeTab === 'equipment' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>📦</span>
              <span>Equipment & Technical Assets ({equipment.length})</span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
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
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{eq.id}</div>
                    </td>
                    <td><span className="badge neutral">{eq.category}</span></td>
                    <td><strong>{eq.quantity}</strong> units</td>
                    <td>{eq.venue_id ? <span style={{ color: '#93c5fd' }}>{eq.venue_id}</span> : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                    <td>
                      <span className={`badge ${eq.status === 'tested' ? 'emerald' : eq.status === 'available' ? 'blue' : 'amber'}`}>
                        {eq.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
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

      {/* Subtab 3: Speakers */}
      {activeTab === 'speakers' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>🎤</span>
              <span>Keynote & Session Speakers ({speakers.length})</span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Speaker Name</th>
                  <th>Title & Role</th>
                  <th>Organization</th>
                  <th>Contact Email</th>
                  <th style={{ textAlign: 'right' }}>Dependencies</th>
                </tr>
              </thead>
              <tbody>
                {speakers.map((sp) => (
                  <tr key={sp.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sp.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{sp.id}</div>
                    </td>
                    <td>{sp.title}</td>
                    <td><strong style={{ color: '#93c5fd' }}>{sp.organization}</strong></td>
                    <td><code style={{ fontSize: '11px' }}>{sp.email}</code></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
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

      {/* Subtab 4: Volunteers */}
      {activeTab === 'volunteers' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>🤝</span>
              <span>Event Volunteers & Operations Staff ({volunteers.length})</span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Volunteer Name</th>
                  <th>Operational Role</th>
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
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{vol.id}</div>
                    </td>
                    <td><span className="badge neutral">{vol.role}</span></td>
                    <td><code style={{ fontSize: '11px' }}>{vol.email}</code></td>
                    <td>
                      <span className={`badge ${vol.availability === 'assigned' ? 'blue' : 'emerald'}`}>
                        {vol.availability}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
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
