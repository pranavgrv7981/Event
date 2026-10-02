import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  Users,
  HeartHandshake,
  Wrench,
  Clock,
  ExternalLink,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { EventContext } from "../../context/EventContext";

export default function ChangeAlert({ change }) {
  const navigate = useNavigate();
  const { openVenueChangeModal } = useContext(EventContext);

  if (!change) return null;

  return (
    <div className="change-alert-card">
      {/* Alert Ribbon Header */}
      <div className="change-alert-banner">
        <div className="change-banner-left">
          <span className="pulse-danger-indicator" />
          <ShieldAlert className="w-4 h-4 text-danger animate-pulse" />
          <span className="change-banner-type">{change.type || "VENUE CHANGE DETECTED"}</span>
        </div>
        <div className="change-banner-right">
          <span className="change-timestamp">
            <Clock className="w-3 h-3 inline mr-1" />
            {change.timestamp}
          </span>
        </div>
      </div>

      {/* Headline: Hall A -> Hall B */}
      <div className="change-alert-headline-box">
        <div className="change-transfer-flow">
          <div className="venue-node from-node">
            <span className="venue-node-tag">PREVIOUS</span>
            <span className="venue-node-name">{change.fromVenue}</span>
          </div>

          <div className="transfer-arrow-wrapper">
            <ArrowRight className="w-5 h-5 text-danger" />
            <span className="transfer-label">RELOCATED</span>
          </div>

          <div className="venue-node to-node">
            <span className="venue-node-tag">NEW ACTIVE VENUE</span>
            <span className="venue-node-name">{change.toVenue}</span>
          </div>
        </div>

        <div className="change-reason-box">
          <span className="reason-label">REASON:</span>
          <p className="reason-text">{change.reason}</p>
        </div>
      </div>

      {/* Affected Entity Metric Grid */}
      <div className="affected-entities-grid">
        <div className="affected-stat-block">
          <div className="affected-icon-wrap">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div className="affected-count-wrap">
            <span className="affected-count">{change.affected?.sessionsCount || 4}</span>
            <span className="affected-label">sessions affected</span>
          </div>
        </div>

        <div className="affected-stat-block">
          <div className="affected-icon-wrap">
            <Users className="w-4 h-4 text-warning" />
          </div>
          <div className="affected-count-wrap">
            <span className="affected-count">{change.affected?.speakersCount || 3}</span>
            <span className="affected-label">speakers affected</span>
          </div>
        </div>

        <div className="affected-stat-block">
          <div className="affected-icon-wrap">
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="affected-count-wrap">
            <span className="affected-count">{change.affected?.volunteersCount || 8}</span>
            <span className="affected-label">volunteers affected</span>
          </div>
        </div>

        <div className="affected-stat-block">
          <div className="affected-icon-wrap">
            <Wrench className="w-4 h-4 text-slate-400" />
          </div>
          <div className="affected-count-wrap">
            <span className="affected-count">{change.affected?.equipmentCount || 5}</span>
            <span className="affected-label">equipment affected</span>
          </div>
        </div>
      </div>

      {/* Action Bar with [ VIEW IMPACT ] */}
      <div className="change-alert-actions">
        <div className="authorized-tag">
          Authorized by <span className="font-mono text-slate-300">{change.authorizedBy}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="btn btn-warning text-xs font-semibold flex items-center gap-1.5"
            onClick={() =>
              openVenueChangeModal({
                currentVenue: change.fromVenue || "Auditorium A",
                session: "AI Workshop",
              })
            }
            title="Launch Change Venue Workflow"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>CHANGE VENUE</span>
          </button>

          <button
            className="btn btn-primary impact-action-btn"
            onClick={() => navigate("/impact")}
            title="Open Impact Assessment"
          >
            <span>VIEW IMPACT</span>
            <ExternalLink className="w-4 h-4 ml-1.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
