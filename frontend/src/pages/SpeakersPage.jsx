import React, { useState, useEffect } from "react";
import { Users, Search, ListFilter } from "lucide-react";
import { getSpeakers } from "../services/api";
import PageHeader from "../components/common/PageHeader";
import StatusBadge from "../components/common/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "../components/common/StateViews";
import SpeakerCard from "../components/speakers/SpeakerCard";
import EntityDetailDrawer from "../components/common/EntityDetailDrawer";
import { useEntityDrawer } from "../hooks/useEntityDrawer";

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { isOpen, entityType, entityData, openEntity, closeDrawer } = useEntityDrawer();

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        setLoading(true);
        setError(null);
        const data = await getSpeakers();
        if (!ignore) {
          setSpeakers(data);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load speakers:", err);
          setError(err.message || "Failed to load speakers directory");
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

  const statuses = ["all", ...new Set(speakers.map((sp) => sp.status).filter(Boolean))];

  const filteredSpeakers = speakers.filter((sp) => {
    const matchesSearch =
      sp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sp.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sp.sessionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sp.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || sp.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading && speakers.length === 0) {
    return <LoadingState message="Synchronizing speaker readiness and green room telemetry..." />;
  }

  if (error && speakers.length === 0) {
    return <ErrorState message={error} onRetry={loadSpeakers} />;
  }

  return (
    <div className="speakers-page-container">
      <PageHeader
        title="Speakers & VIP Directorate"
        code="OPS-SPKR"
        subtitle="Keynote briefings, green room readiness, presentation riders, and escort assignments."
        badge={
          <StatusBadge
            status={`${speakers.length} SPEAKERS ROSTERED`}
            variant="primary"
          />
        }
      />

      {/* Filter and Search Bar */}
      <div className="ops-toolbar-strip">
        <div className="search-input-wrap">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            className="ops-search-input"
            placeholder="Search speaker name, company, or session..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-select-wrap">
          <ListFilter className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
          <span className="font-mono text-2xs text-slate-400">Status:</span>
          <select
            className="ops-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {statuses.map((st) => (
              <option key={st} value={st}>
                {st === "all" ? "All Statuses" : st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Speakers Grid */}
      {filteredSpeakers.length === 0 ? (
        <EmptyState
          title="No Speakers Found"
          message="No speakers match the current filter criteria."
          icon={Users}
        />
      ) : (
        <div className="entity-cards-grid">
          {filteredSpeakers.map((speaker) => (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              onClick={(spk) => openEntity("speaker", spk)}
            />
          ))}
        </div>
      )}

      {/* Reusable Entity Detail Drawer with Cross-linking */}
      <EntityDetailDrawer
        isOpen={isOpen}
        onClose={closeDrawer}
        entityType={entityType}
        entityData={entityData}
        onSelectEntity={openEntity}
      />
    </div>
  );
}
