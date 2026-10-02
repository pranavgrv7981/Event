import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  CheckSquare,
  AlertTriangle,
  Users,
  Clock,
  RefreshCw,
  Flame,
  Activity,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { useEvent } from "../hooks/useEvent";
import { useDashboardData } from "../hooks/useDashboardData";
import StatusBadge from "../components/common/StatusBadge";
import { LoadingState, ErrorState } from "../components/common/StateViews";
import StatCard from "../components/dashboard/StatCard";
import DashboardSection from "../components/dashboard/DashboardSection";
import SessionItem from "../components/dashboard/SessionItem";
import ChangeAlert from "../components/dashboard/ChangeAlert";
import TaskItem from "../components/dashboard/TaskItem";
import RiskItem from "../components/dashboard/RiskItem";

export default function DashboardPage() {
  const { currentEvent, isLive, refreshData } = useEvent();
  const { data, loading, error, refetch } = useDashboardData();
  const navigate = useNavigate();

  if (loading && !data) {
    return <LoadingState message="Synchronizing command center telemetry..." />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  const summary = data?.summary || { sessions: 24, tasks: 31, risks: 3, people: 48 };
  const breakdown = data?.breakdown || {};
  const upcomingSessions = data?.upcomingSessions || [];
  const recentChanges = data?.recentChanges || [];
  const priorityTasks = data?.priorityTasks || [];
  const activeRisks = data?.activeRisks || [];
  const primaryChange = recentChanges[0];

  return (
    <div className="dashboard-container">
      {/* 1. EVENT HEADER */}
      <section className="event-command-header-panel">
        <div className="header-meta-primary">
          <div className="header-title-block">
            <div className="flex items-center gap-2">
              <span className="command-sub-badge">COMMAND CENTER · PHASE 1</span>
              <span className="last-sync-time">
                <Clock className="w-3 h-3 inline mr-1" />
                Updated {data?.lastUpdated || "Just now"}
              </span>
            </div>
            <h1 className="event-display-name">{currentEvent?.name || "KBC Hackathon 2026"}</h1>
            <p className="event-tagline-text">
              {currentEvent?.tagline || "Intelligent Operations & Rapid Prototyping"}
            </p>
          </div>

          <div className="header-status-controls">
            {/* Date Display */}
            <div className="event-date-pill">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-mono text-xs">{currentEvent?.date || "November 15, 2026"}</span>
            </div>

            {/* Current Event Badge */}
            <div className="current-event-pill">
              <Layers className="w-4 h-4 text-warning" />
              <span className="text-xs font-mono">{currentEvent?.code || "KBCH-26"}</span>
            </div>

            {/* LIVE Status Badge */}
            <div className="event-live-status-pill">
              <StatusBadge
                status={isLive ? "LIVE OPERATIONS" : "STANDBY"}
                variant={isLive ? "success" : "neutral"}
                pulse={isLive}
                size="md"
              />
            </div>

            {/* Quick Refresh Button */}
            <button
              className="btn btn-icon refresh-btn"
              onClick={() => {
                refreshData();
                refetch();
              }}
              title="Refresh Telemetry Stream"
              aria-label="Refresh Telemetry Stream"
            >
              <RefreshCw className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>

        {/* Operational Priority Ticker / Sub-banner */}
        <div className="operational-ticker-banner">
          <div className="ticker-label">
            <Flame className="w-3.5 h-3.5 text-danger animate-pulse" />
            <span className="ticker-label-text">ATTENTION:</span>
          </div>
          <div className="ticker-message">
            Hall A HVAC failure detected · All sessions redirected to Hall B · 4 sessions & 3 speakers affected
          </div>
          <button
            className="ticker-action-link"
            onClick={() => navigate("/impact")}
          >
            Review Impact Assessment →
          </button>
        </div>
      </section>

      {/* 2. SUMMARY CARDS */}
      <section className="summary-cards-grid">
        {/* Sessions */}
        <StatCard
          title="Sessions"
          value={summary.sessions}
          subtext="Total Scheduled"
          icon={Calendar}
          variant="primary"
          onClick={() => navigate("/sessions")}
          breakdown={[
            { count: breakdown.sessionsActive || 2, label: "Active", variant: "success" },
            { count: breakdown.sessionsUpcoming || 20, label: "Upcoming", variant: "neutral" },
            { count: breakdown.sessionsCompleted || 2, label: "Done", variant: "neutral" },
          ]}
        />

        {/* Tasks */}
        <StatCard
          title="Tasks"
          value={summary.tasks}
          subtext="Operational Actions"
          icon={CheckSquare}
          variant="info"
          onClick={() => navigate("/tasks")}
          breakdown={[
            { count: breakdown.tasksOpen || 14, label: "Open", variant: "warning" },
            { count: breakdown.tasksInProgress || 8, label: "In Prog", variant: "primary" },
            { count: breakdown.tasksBlocked || 2, label: "Blocked", variant: "danger" },
          ]}
        />

        {/* Risks */}
        <StatCard
          title="Risks"
          value={summary.risks}
          subtext="Recorded Threats"
          icon={AlertTriangle}
          variant="danger"
          onClick={() => navigate("/risks")}
          breakdown={[
            { count: breakdown.risksCritical || 1, label: "Critical", variant: "danger" },
            { count: breakdown.risksHigh || 1, label: "High", variant: "warning" },
            { count: breakdown.risksMedium || 1, label: "Medium", variant: "neutral" },
          ]}
        />

        {/* People */}
        <StatCard
          title="People"
          value={summary.people}
          subtext="Speakers & Staff"
          icon={Users}
          variant="success"
          onClick={() => navigate("/volunteers")}
          breakdown={[
            { count: breakdown.speakersCount || 16, label: "Speakers", variant: "primary" },
            { count: breakdown.volunteersCount || 32, label: "Volunteers", variant: "success" },
          ]}
        />
      </section>

      {/* 3. RECENT CHANGES (HIGH PRIORITY OPERATIONAL SECTION) */}
      <section className="dashboard-change-section">
        <DashboardSection
          title="Recent Operational Changes"
          subtitle="Real-time venue & schedule modifications affecting ongoing operations"
          icon={Activity}
          badge={
            <span className="badge-danger text-2xs px-2 py-0.5 rounded font-mono font-semibold">
              CRITICAL CHANGE DETECTED
            </span>
          }
          actions={
            <Link to="/changes" className="section-header-link">
              View Change Log ({recentChanges.length})
            </Link>
          }
        >
          {primaryChange ? (
            <ChangeAlert change={primaryChange} />
          ) : (
            <div className="p-4 text-center text-slate-400">No active changes recorded.</div>
          )}
        </DashboardSection>
      </section>

      {/* TWO COLUMN GRID FOR SESSIONS & PRIORITY STREAMS */}
      <div className="dashboard-split-grid">
        {/* LEFT COLUMN: UPCOMING SESSIONS */}
        <div className="grid-col-left">
          <DashboardSection
            title="Upcoming Sessions"
            subtitle="Chronological track schedule and venue allocations"
            icon={Calendar}
            actions={
              <Link to="/sessions" className="section-header-link">
                Full Schedule →
              </Link>
            }
          >
            <div className="sessions-list-wrapper">
              {upcomingSessions.slice(0, 6).map((session) => (
                <SessionItem key={session.id} session={session} />
              ))}
            </div>
          </DashboardSection>
        </div>

        {/* RIGHT COLUMN: PRIORITY TASKS & ACTIVE RISKS */}
        <div className="grid-col-right">
          {/* 5. PRIORITY TASKS */}
          <DashboardSection
            title="Priority Operational Tasks"
            subtitle="Immediate action items requiring lead or coordinator attention"
            icon={CheckSquare}
            actions={
              <Link to="/tasks" className="section-header-link">
                View All ({summary.tasks})
              </Link>
            }
          >
            <div className="tasks-list-wrapper">
              {priorityTasks.slice(0, 4).map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </DashboardSection>

          {/* 6. ACTIVE RISKS */}
          <DashboardSection
            title="Active Operational Risks"
            subtitle="Live incidents and bottlenecks under active mitigation"
            icon={ShieldAlert}
            actions={
              <Link to="/risks" className="section-header-link">
                Risk Matrix ({activeRisks.length})
              </Link>
            }
          >
            <div className="risks-list-wrapper">
              {activeRisks.map((risk) => (
                <RiskItem key={risk.id} risk={risk} />
              ))}
            </div>
          </DashboardSection>
        </div>
      </div>
    </div>
  );
}
