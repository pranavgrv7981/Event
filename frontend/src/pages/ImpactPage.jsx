import React from "react";
import { Link } from "react-router-dom";
import {
  GitBranch,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Users,
  HeartHandshake,
  Clock,
} from "lucide-react";
import PlaceholderPage from "../components/common/PlaceholderPage";
import { MOCK_CHANGES } from "../mock/eventData";

export default function ImpactPage() {
  const primaryChange = MOCK_CHANGES[0];

  return (
    <PlaceholderPage
      title="Operational Impact Assessment"
      code="MOD-IMPACT"
      subtitle="Entity relationship cascade and affected downstream assets from field changes."
      icon={GitBranch}
      phaseTarget="Phase 2 — Dependency Tree & Verified Impact Engine"
      statSummary={[
        { count: "4", label: "Affected Sessions" },
        { count: "3", label: "Affected Speakers" },
        { count: "8", label: "Affected Volunteers" },
        { count: "5", label: "Affected Devices" },
      ]}
    >
      <div className="impact-view-container">
        {/* Source Change Alert Banner */}
        <div className="impact-source-banner">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-danger" />
              <span className="font-mono font-semibold text-danger text-sm">
                TRIGGER: VENUE CHANGE DETECTED
              </span>
              <span className="text-slate-400 font-mono text-xs">
                (ID: {primaryChange.id})
              </span>
            </div>
            <span className="text-slate-400 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 inline mr-1" />
              {primaryChange.timestamp}
            </span>
          </div>

          <div className="source-relocation-display">
            <span className="source-from">{primaryChange.fromVenue}</span>
            <ArrowRight className="w-4 h-4 text-danger mx-2 inline" />
            <span className="source-to">{primaryChange.toVenue}</span>
          </div>
          <p className="text-xs text-slate-300 mt-2 font-mono">
            {primaryChange.reason}
          </p>
        </div>

        {/* Note on Architecture */}
        <div className="impact-ownership-note">
          <span className="font-semibold text-primary">ARCHITECTURE NOTE:</span> Deterministic dependency calculation is maintained by P1 backend service (`GET /dependencies/{'{entity_type}'}/{'{entity_id}'}`). The frontend displays verified affected sets with zero client-side calculation overhead.
        </div>

        {/* Affected Entities Breakdown Columns */}
        <div className="impact-cascade-grid">
          {/* Affected Sessions */}
          <div className="cascade-panel">
            <div className="cascade-panel-header">
              <Calendar className="w-4 h-4 text-primary" />
              <h4 className="cascade-panel-title">4 Affected Sessions</h4>
            </div>
            <div className="cascade-panel-body">
              {primaryChange.affectedSessions.map((s) => (
                <div key={s.id} className="cascade-item">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-slate-100 text-xs">{s.title}</span>
                    <span className="font-mono text-2xs text-primary">{s.time}</span>
                  </div>
                  <span className="text-2xs text-slate-400">Speaker: {s.speaker}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Affected Speakers */}
          <div className="cascade-panel">
            <div className="cascade-panel-header">
              <Users className="w-4 h-4 text-warning" />
              <h4 className="cascade-panel-title">3 Affected Speakers</h4>
            </div>
            <div className="cascade-panel-body">
              {primaryChange.affectedSpeakers.map((spk, idx) => (
                <div key={idx} className="cascade-item">
                  <span className="font-medium text-slate-100 text-xs">{spk}</span>
                  <span className="text-2xs text-slate-400 block">Relocation alert SMS queued</span>
                </div>
              ))}
            </div>
          </div>

          {/* Affected Volunteers */}
          <div className="cascade-panel">
            <div className="cascade-panel-header">
              <HeartHandshake className="w-4 h-4 text-emerald-400" />
              <h4 className="cascade-panel-title">8 Affected Volunteers</h4>
            </div>
            <div className="cascade-panel-body">
              {primaryChange.affectedVolunteers.map((vol, idx) => (
                <div key={idx} className="cascade-item">
                  <span className="font-medium text-slate-100 text-xs">{vol}</span>
                  <span className="text-2xs text-emerald-400 block font-mono">Duty reassigned to Hall B</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Direct Action Backlink */}
        <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-end">
          <Link to="/" className="btn btn-secondary text-xs">
            Return to Command Center
          </Link>
        </div>
      </div>
    </PlaceholderPage>
  );
}
