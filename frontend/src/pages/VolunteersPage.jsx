import React, { useState, useEffect } from "react";
import { HeartHandshake, Search, ListFilter } from "lucide-react";
import { getVolunteers } from "../services/api";
import PageHeader from "../components/common/PageHeader";
import StatusBadge from "../components/common/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "../components/common/StateViews";
import VolunteerCard from "../components/volunteers/VolunteerCard";
import EntityDetailDrawer from "../components/common/EntityDetailDrawer";
import { useEntityDrawer } from "../hooks/useEntityDrawer";

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVenue, setFilterVenue] = useState("all");

  const { isOpen, entityType, entityData, openEntity, closeDrawer } = useEntityDrawer();

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        setLoading(true);
        setError(null);
        const data = await getVolunteers();
        if (!ignore) {
          setVolunteers(data);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load volunteers:", err);
          setError(err.message || "Failed to load volunteers roster");
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

  const venues = ["all", ...new Set(volunteers.map((v) => v.assignedVenue).filter(Boolean))];

  const filteredVolunteers = volunteers.filter((vol) => {
    const matchesSearch =
      vol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vol.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vol.assignedVenue.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVenue = filterVenue === "all" || vol.assignedVenue === filterVenue;
    return matchesSearch && matchesVenue;
  });

  if (loading && volunteers.length === 0) {
    return <LoadingState message="Synchronizing field volunteer rosters and radio stations..." />;
  }

  if (error && volunteers.length === 0) {
    return <ErrorState message={error} onRetry={loadVolunteers} />;
  }

  return (
    <div className="volunteers-page-container">
      <PageHeader
        title="Volunteers & Field Crew"
        code="OPS-VOLN"
        subtitle="Live shift deployments, station rosters, crowd control distribution, and team leads."
        badge={
          <StatusBadge
            status={`${volunteers.length} CREW DEPLOYED`}
            variant="success"
            pulse={true}
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
            placeholder="Search volunteer name, role, or station..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-select-wrap">
          <ListFilter className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
          <span className="font-mono text-2xs text-slate-400">Station:</span>
          <select
            className="ops-select"
            value={filterVenue}
            onChange={(e) => setFilterVenue(e.target.value)}
          >
            {venues.map((v) => (
              <option key={v} value={v}>
                {v === "all" ? "All Stations" : v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Volunteers Grid */}
      {filteredVolunteers.length === 0 ? (
        <EmptyState
          title="No Volunteers Found"
          message="No field crew matches the current search or station filter."
          icon={HeartHandshake}
        />
      ) : (
        <div className="entity-cards-grid">
          {filteredVolunteers.map((volunteer) => (
            <VolunteerCard
              key={volunteer.id}
              volunteer={volunteer}
              onClick={(vol) => openEntity("volunteer", vol)}
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
