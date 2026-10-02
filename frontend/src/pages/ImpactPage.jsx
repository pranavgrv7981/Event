import React, { useState, useEffect, useContext } from "react";
import {
  GitBranch,
  Zap,
  Building2,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { analyzeVenueChange } from "../services/api";
import PageHeader from "../components/common/PageHeader";
import StatusBadge from "../components/common/StatusBadge";
import { LoadingState } from "../components/common/StateViews";
import ImpactResultsView from "../components/workflow/ImpactResultsView";
import EntityDetailDrawer from "../components/common/EntityDetailDrawer";
import { useEntityDrawer } from "../hooks/useEntityDrawer";
import { EventContext } from "../context/EventContext";

export default function ImpactPage() {
  const {
    openVenueChangeModal,
    latestImpactAnalysis,
    setLatestImpactAnalysis,
  } = useContext(EventContext);

  const [loading, setLoading] = useState(!latestImpactAnalysis);
  const [impactData, setImpactData] = useState(latestImpactAnalysis);

  const {
    isOpen,
    entityType,
    entityData,
    openEntity,
    closeDrawer,
  } = useEntityDrawer();

  // Load verified default impact analysis on mount if none exists
  useEffect(() => {
    let ignore = false;
    async function loadInitialImpact() {
      if (latestImpactAnalysis) {
        setImpactData(latestImpactAnalysis);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await analyzeVenueChange("event_kbc_hackathon_2026", {
          old_value: "Auditorium A",
          new_value: "Auditorium B",
          session_title: "AI Workshop",
          reason: "HVAC cooling compressor failure detected; emergency thermal shutdown.",
        });
        if (!ignore) {
          setImpactData(data);
          setLatestImpactAnalysis(data);
        }
      } catch (err) {
        console.error("Failed to load initial impact data:", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadInitialImpact();
    return () => {
      ignore = true;
    };
  }, [latestImpactAnalysis, setLatestImpactAnalysis]);

  const handleRerun = async () => {
    try {
      setLoading(true);
      const data = await analyzeVenueChange("event_kbc_hackathon_2026", {
        old_value: impactData?.change?.old_value || "Auditorium A",
        new_value: impactData?.change?.new_value || "Auditorium B",
        session_title: "AI Workshop",
        reason: impactData?.change?.reason || "HVAC cooling compressor failure detected; emergency thermal shutdown.",
      });
      setImpactData(data);
      setLatestImpactAnalysis(data);
    } catch (err) {
      console.error("Failed to re-run impact analysis:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="impact-page-wrapper">
      <PageHeader
        title="Operational Impact Assessment"
        code="OPS-IMPACT"
        subtitle="Downstream entity cascade verification from field alterations, facility relocations, and schedule shifts."
        badge={
          <StatusBadge
            status="CASCADE ENGINE VERIFIED"
            variant="warning"
            pulse={true}
          />
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="btn btn-secondary text-xs flex items-center gap-1.5"
              onClick={handleRerun}
              disabled={loading}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-run Verification</span>
            </button>
            <button
              className="btn btn-primary text-xs flex items-center gap-1.5 font-semibold"
              onClick={() =>
                openVenueChangeModal({
                  currentVenue: impactData?.change?.old_value || "Auditorium A",
                  session: "AI Workshop",
                })
              }
            >
              <Zap className="w-3.5 h-3.5 text-warning" />
              <span>Launch Venue Change Workflow</span>
            </button>
          </div>
        }
      />

      {/* Simulator Quick Action Header */}
      <div className="impact-quick-simulator-bar">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary" />
          <span className="font-mono text-xs font-bold text-slate-200 uppercase">
            ACTIVE SIMULATION SCENARIO:
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="scenario-chip old">
            <Building2 className="w-3 h-3 text-danger inline mr-1" />
            <span>{impactData?.change?.old_value || "Auditorium A"}</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-warning" />
          <div className="scenario-chip new">
            <Building2 className="w-3 h-3 text-emerald-400 inline mr-1" />
            <span>{impactData?.change?.new_value || "Auditorium B"}</span>
          </div>
          <button
            className="btn btn-secondary text-3xs py-1 px-2.5 ml-2 font-mono"
            onClick={() =>
              openVenueChangeModal({
                currentVenue: impactData?.change?.old_value || "Auditorium A",
                session: "AI Workshop",
              })
            }
          >
            Adjust Parameters ⚙
          </button>
        </div>
      </div>

      {/* Main Results View */}
      {loading ? (
        <LoadingState message="Traversing P1 dependency DAG and aggregating downstream entity cascade..." />
      ) : (
        <ImpactResultsView
          impactData={impactData}
          onInspectEntity={(type, entity) => openEntity(type, entity)}
          onRerun={handleRerun}
          isModal={false}
        />
      )}

      {/* Reusable Entity Detail Drawer for interactive entity inspection */}
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
