import React, { useState, useEffect } from "react";
import { Wrench, Search, ListFilter } from "lucide-react";
import { getEquipment } from "../services/api";
import PageHeader from "../components/common/PageHeader";
import StatusBadge from "../components/common/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "../components/common/StateViews";
import EquipmentCard from "../components/equipment/EquipmentCard";
import EntityDetailDrawer from "../components/common/EntityDetailDrawer";
import { useEntityDrawer } from "../hooks/useEntityDrawer";

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  const { isOpen, entityType, entityData, openEntity, closeDrawer } = useEntityDrawer();

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        setLoading(true);
        setError(null);
        const data = await getEquipment();
        if (!ignore) {
          setEquipment(data);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load equipment:", err);
          setError(err.message || "Failed to load equipment assets");
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

  const types = ["all", ...new Set(equipment.map((eq) => eq.type).filter(Boolean))];

  const filteredEquipment = equipment.filter((eq) => {
    const matchesSearch =
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (eq.assignedSessionTitle && eq.assignedSessionTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (eq.code && eq.code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === "all" || eq.type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading && equipment.length === 0) {
    return <LoadingState message="Synchronizing hardware inventory and AV telemetry..." />;
  }

  if (error && equipment.length === 0) {
    return <ErrorState message={error} onRetry={loadEquipment} />;
  }

  return (
    <div className="equipment-page-container">
      <PageHeader
        title="Equipment & AV Assets"
        code="OPS-EQUP"
        subtitle="Hardware allocations, stage projectors, audio gear, GPU workstations, and power distribution."
        badge={
          <StatusBadge
            status={`${equipment.length} ASSETS LOGGED`}
            variant="neutral"
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
            placeholder="Search equipment, venue, or session..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-select-wrap">
          <ListFilter className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
          <span className="font-mono text-2xs text-slate-400">Category:</span>
          <select
            className="ops-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All Categories" : t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Equipment Grid */}
      {filteredEquipment.length === 0 ? (
        <EmptyState
          title="No Equipment Found"
          message="No hardware assets match the current filter parameters."
          icon={Wrench}
        />
      ) : (
        <div className="entity-cards-grid">
          {filteredEquipment.map((item) => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              onClick={(eq) => openEntity("equipment", eq)}
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
