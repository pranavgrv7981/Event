import React, { useState, useEffect, useContext } from "react";
import { Calendar, Clock, LayoutGrid, ListFilter, Search } from "lucide-react";
import { getSessions } from "../services/api";
import PageHeader from "../components/common/PageHeader";
import StatusBadge from "../components/common/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "../components/common/StateViews";
import SessionCard from "../components/sessions/SessionCard";
import Timeline from "../components/timeline/Timeline";
import EntityDetailDrawer from "../components/common/EntityDetailDrawer";
import { useEntityDrawer } from "../hooks/useEntityDrawer";
import { EventContext } from "../context/EventContext";

export default function SessionsPage() {
  const { openVenueChangeModal } = useContext(EventContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("timeline"); // 'timeline' | 'cards'
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVenue, setFilterVenue] = useState("all");

  const { isOpen, entityType, entityData, openEntity, closeDrawer } = useEntityDrawer();

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        setLoading(true);
        setError(null);
        const data = await getSessions();
        if (!ignore) {
          setSessions(data);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load sessions:", err);
          setError(err.message || "Failed to load sessions schedule");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  // Unique venues for filtering
  const venues = ["all", ...new Set(sessions.map((s) => s.venue).filter(Boolean))];

  // Filtered sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.speaker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.track && s.track.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesVenue = filterVenue === "all" || s.venue === filterVenue;
    return matchesSearch && matchesVenue;
  });

  if (loading && sessions.length === 0) {
    return <LoadingState message="Synchronizing session schedule and timeline..." />;
  }

  if (error && sessions.length === 0) {
    return <ErrorState message={error} onRetry={loadSessions} />;
  }

  return (
    <div className="sessions-page-container">
      {/* Page Header */}
      <PageHeader
        title="Event Sessions & Timeline"
        code="OPS-SESS"
        subtitle="Operational run of show, room allocations, speaker pairings, and equipment dispatch."
        badge={
          <StatusBadge
            status={`${sessions.length} SESSIONS ACTIVE`}
            variant="success"
            pulse={true}
          />
        }
        actions={
          <div className="view-mode-toggle-group">
            <button
              className={`view-mode-btn ${viewMode === "timeline" ? "active" : ""}`}
              onClick={() => setViewMode("timeline")}
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              <span>Timeline View</span>
            </button>
            <button
              className={`view-mode-btn ${viewMode === "cards" ? "active" : ""}`}
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
              <span>Cards View</span>
            </button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="ops-toolbar-strip">
        <div className="search-input-wrap">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            className="ops-search-input"
            placeholder="Search sessions, speakers, or tracks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-select-wrap">
          <ListFilter className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
          <span className="font-mono text-2xs text-slate-400">Venue:</span>
          <select
            className="ops-select"
            value={filterVenue}
            onChange={(e) => setFilterVenue(e.target.value)}
          >
            {venues.map((v) => (
              <option key={v} value={v}>
                {v === "all" ? "All Venues" : v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main View Area */}
      {filteredSessions.length === 0 ? (
        <EmptyState
          title="No Sessions Found"
          message="No scheduled sessions match the current search or venue filter."
          icon={Calendar}
        />
      ) : viewMode === "timeline" ? (
        <Timeline
          sessions={filteredSessions}
          onSelectSession={(session) => openEntity("session", session)}
        />
      ) : (
        <div className="entity-cards-grid">
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onClick={(sess) => openEntity("session", sess)}
            />
          ))}
        </div>
      )}

      {/* Reusable Entity Detail Slide-over Drawer with Cross-linking */}
      <EntityDetailDrawer
        isOpen={isOpen}
        onClose={closeDrawer}
        entityType={entityType}
        entityData={entityData}
        onSelectEntity={openEntity}
        onOpenVenueChange={openVenueChangeModal}
      />
    </div>
  );
}
