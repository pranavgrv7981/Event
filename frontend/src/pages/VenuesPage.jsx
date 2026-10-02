import React, { useState, useEffect } from "react";
import { Building2, Search, AlertTriangle } from "lucide-react";
import { getVenues } from "../services/api";
import PageHeader from "../components/common/PageHeader";
import StatusBadge from "../components/common/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "../components/common/StateViews";
import VenueCard from "../components/venues/VenueCard";
import EntityDetailDrawer from "../components/common/EntityDetailDrawer";
import { useEntityDrawer } from "../hooks/useEntityDrawer";

export default function VenuesPage() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { isOpen, entityType, entityData, openEntity, closeDrawer } = useEntityDrawer();

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        setLoading(true);
        setError(null);
        const data = await getVenues();
        if (!ignore) {
          setVenues(data);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load venues:", err);
          setError(err.message || "Failed to load venues data");
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

  const filteredVenues = venues.filter((v) => {
    return (
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.building.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.statusReason && v.statusReason.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const maintenanceCount = venues.filter((v) => v.status === "MAINTENANCE").length;

  if (loading && venues.length === 0) {
    return <LoadingState message="Synchronizing venue telemetry and capacity allocations..." />;
  }

  if (error && venues.length === 0) {
    return <ErrorState message={error} onRetry={loadVenues} />;
  }

  return (
    <div className="venues-page-container">
      <PageHeader
        title="Venues & Room Command"
        code="OPS-VENU"
        subtitle="Facility allocations, capacity safety thresholds, HVAC status, and staged session schedules."
        badge={
          <StatusBadge
            status={`${venues.length} FACILITIES MONITORED`}
            variant="neutral"
          />
        }
        actions={
          maintenanceCount > 0 && (
            <div className="warning-pill-banner">
              <AlertTriangle className="w-3.5 h-3.5 text-danger mr-1" />
              <span className="font-mono text-2xs text-danger font-bold">
                {maintenanceCount} FACILITY UNDER MAINTENANCE (HALL A)
              </span>
            </div>
          )
        }
      />

      {/* Filter and Search Bar */}
      <div className="ops-toolbar-strip">
        <div className="search-input-wrap">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            className="ops-search-input"
            placeholder="Search venue name, building, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="toolbar-stats-count font-mono text-2xs text-slate-400">
          Showing {filteredVenues.length} of {venues.length} facilities
        </div>
      </div>

      {/* Venues Grid */}
      {filteredVenues.length === 0 ? (
        <EmptyState
          title="No Venues Found"
          message="No venues match the specified search query."
          icon={Building2}
        />
      ) : (
        <div className="entity-cards-grid">
          {filteredVenues.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              onClick={(v) => openEntity("venue", v)}
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
