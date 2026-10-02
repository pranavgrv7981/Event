import React, { useState, useEffect } from "react";
import {
  X,
  Zap,
  ArrowDown,
  Building2,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { analyzeVenueChange } from "../../services/api";
import ImpactResultsView from "./ImpactResultsView";
import EntityDetailDrawer from "../common/EntityDetailDrawer";
import { useEntityDrawer } from "../../hooks/useEntityDrawer";

const ANALYSIS_STEPS = [
  "Analyzing dependency graph (P1 DAG Engine)...",
  "Checking affected sessions...",
  "Checking speakers & VIP logistics...",
  "Checking volunteers & crew duty assignments...",
  "Checking staged equipment & AV routing...",
  "Checking dependent tasks & operational risks...",
];

const AVAILABLE_VENUES = [
  { id: "venue_auditorium_b", name: "Auditorium B", capacity: 550, status: "Active · 550 Seats" },
  { id: "venue_hall_b", name: "Hall B", capacity: 550, status: "Active · 550 Seats" },
  { id: "venue_main_hall", name: "Main Hall", capacity: 800, status: "Active · 800 Seats" },
  { id: "venue_innovation_lab", name: "Innovation Lab", capacity: 120, status: "Active · 120 Seats" },
  { id: "venue_seminar_1", name: "Seminar Room 1", capacity: 90, status: "Active · 90 Seats" },
];

export default function VenueChangeModal({
  isOpen,
  onClose,
  initialData = null,
  onAnalysisSuccess = null,
}) {
  const [step, setStep] = useState("form"); // 'form' | 'analyzing' | 'results'
  const [sessionTitle, setSessionTitle] = useState("AI Workshop");
  const [currentVenue, setCurrentVenue] = useState("Auditorium A");
  const [newVenue, setNewVenue] = useState("Auditorium B");
  const [reason, setReason] = useState(
    "HVAC cooling compressor failure detected; emergency thermal shutdown."
  );

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [impactResult, setImpactResult] = useState(null);

  // Detail drawer for inspecting affected entities from results
  const {
    isOpen: isDrawerOpen,
    entityType: drawerType,
    entityData: drawerData,
    openEntity: openDrawerEntity,
    closeDrawer,
  } = useEntityDrawer();

  // Reset or initialize state when modal opens
  const [prevIsOpen, setPrevIsOpen] = useState(false);
  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
    if (initialData) {
      if (initialData.session) {
        setSessionTitle(
          typeof initialData.session === "string"
            ? initialData.session
            : initialData.session.title || "AI Workshop"
        );
      }
      if (initialData.currentVenue) {
        setCurrentVenue(initialData.currentVenue);
      } else if (initialData.venue) {
        setCurrentVenue(
          typeof initialData.venue === "string"
            ? initialData.venue
            : initialData.venue.name || "Auditorium A"
        );
      }
    } else {
      setSessionTitle("AI Workshop");
      setCurrentVenue("Auditorium A");
      setNewVenue("Auditorium B");
    }
    setStep("form");
    setActiveStepIndex(0);
    setImpactResult(null);
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
  }

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen && !isDrawerOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isDrawerOpen]);

  // Progressive analysis timer
  useEffect(() => {
    if (step !== "analyzing") return;
    let currentIdx = 0;
    const timer = setInterval(() => {
      currentIdx += 1;
      if (currentIdx < ANALYSIS_STEPS.length) {
        setActiveStepIndex(currentIdx);
      } else {
        clearInterval(timer);
      }
    }, 190);

    return () => clearInterval(timer);
  }, [step]);

  if (!isOpen) return null;

  const handleStartAnalysis = async () => {
    setStep("analyzing");
    setActiveStepIndex(0);

    try {
      // Trigger API call
      const payload = {
        old_value: currentVenue,
        new_value: newVenue,
        session_title: sessionTitle,
        reason: reason,
      };

      const [result] = await Promise.all([
        analyzeVenueChange("event_kbc_hackathon_2026", payload),
        // Guarantee minimal display time so user sees the intelligent sequential checks
        new Promise((resolve) => setTimeout(resolve, 1150)),
      ]);

      setImpactResult(result);
      setStep("results");
      if (onAnalysisSuccess) {
        onAnalysisSuccess(result);
      }
    } catch (err) {
      console.error("Failed to analyze venue change:", err);
      setStep("form");
    }
  };

  const handleReset = () => {
    setStep("form");
    setActiveStepIndex(0);
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} aria-modal="true" role="dialog">
        <div
          className={`modal-dialog ${step === "results" ? "wide" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="modal-header">
            <div className="flex items-center gap-2">
              <div className="modal-badge-icon">
                <Zap className="w-4 h-4 text-warning" />
              </div>
              <div>
                <h3 className="modal-title">CHANGE VENUE</h3>
                <span className="modal-sub">
                  Operational Relocation & Impact Cascade Analysis
                </span>
              </div>
            </div>
            <button
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close venue change dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="modal-body">
            {/* STEP 1: FORM */}
            {step === "form" && (
              <div className="modal-form-stack">
                <div className="modal-info-callout">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-2xs text-slate-300 leading-relaxed">
                    Initiating a facility shift triggers deterministic dependency evaluation across scheduled sessions, registered speakers, rostered volunteers, and staged equipment.
                  </p>
                </div>

                {/* Session Identification */}
                <div className="form-group">
                  <label className="form-label">AFFECTED SESSION</label>
                  <div className="session-select-badge">
                    <span className="font-semibold text-slate-100 text-xs">{sessionTitle}</span>
                    <span className="text-2xs text-slate-400 font-mono">10:00 — 11:00 · Keynote Track</span>
                  </div>
                </div>

                {/* CHANGE STATE: Visual Venue Comparison (Current Venue ↓ New Venue) */}
                <div className="form-group">
                  <label className="form-label">FACILITY RELOCATION PATH</label>
                  <div className="venue-change-card-flow">
                    {/* Current Venue */}
                    <div className="venue-flow-box current">
                      <span className="flow-box-tag danger">CURRENT VENUE</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Building2 className="w-4 h-4 text-danger shrink-0" />
                        <span className="font-mono text-sm font-bold text-slate-100">
                          {currentVenue}
                        </span>
                      </div>
                      <span className="text-3xs text-danger font-mono mt-1 block">
                        Status: Thermal cutoff tripped / Offline
                      </span>
                    </div>

                    {/* Important Down Arrow Graphic */}
                    <div className="venue-flow-connector">
                      <div className="flow-arrow-circle">
                        <ArrowDown className="w-5 h-5 text-warning animate-bounce" />
                      </div>
                      <span className="font-mono text-3xs text-warning uppercase font-bold tracking-widest mt-1">
                        RELOCATING TO
                      </span>
                    </div>

                    {/* New Venue Dropdown Selector */}
                    <div className="venue-flow-box target">
                      <span className="flow-box-tag target">NEW VENUE</span>
                      <div className="mt-1">
                        <select
                          className="form-select venue-select"
                          value={newVenue}
                          onChange={(e) => setNewVenue(e.target.value)}
                        >
                          {AVAILABLE_VENUES.map((v) => (
                            <option key={v.id} value={v.name}>
                              {v.name} ({v.status})
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="text-3xs text-emerald-400 font-mono mt-1 block">
                        Status: Available for immediate absorption
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reason Input */}
                <div className="form-group">
                  <label className="form-label">OPERATIONAL INCIDENT LOG / REASON</label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter dispatch reason or telemetry alert trigger..."
                  />
                </div>
              </div>
            )}

            {/* STEP 2: ANALYSIS LOADING STATE */}
            {step === "analyzing" && (
              <div className="modal-analyzing-box">
                <div className="scanner-radar-wrap">
                  <div className="radar-circle-pulse" />
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>

                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide mt-3 mb-1">
                  EVALUATING DEPENDENCY CASCADE
                </h4>
                <p className="text-2xs text-slate-400 font-mono mb-4">
                  Traversing operational entity graph for {currentVenue} → {newVenue}
                </p>

                {/* Progressive Checklist Steps */}
                <div className="analysis-steps-list">
                  {ANALYSIS_STEPS.map((stepText, idx) => {
                    const isDone = idx < activeStepIndex;
                    const isCurrent = idx === activeStepIndex;
                    return (
                      <div
                        key={idx}
                        className={`step-item ${isDone ? "done" : isCurrent ? "active" : "pending"}`}
                      >
                        <div className="step-icon-wrap">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-in zoom-in-75" />
                          ) : isCurrent ? (
                            <Loader2 className="w-4 h-4 text-warning animate-spin" />
                          ) : (
                            <span className="step-bullet" />
                          )}
                        </div>
                        <span className="step-text font-mono text-xs">{stepText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: IMPACT RESULTS */}
            {step === "results" && impactResult && (
              <ImpactResultsView
                impactData={impactResult}
                onInspectEntity={(type, entity) => openDrawerEntity(type, entity)}
                onRerun={handleReset}
                isModal={true}
              />
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            {step === "form" && (
              <div className="flex items-center justify-between w-full">
                <button className="btn btn-secondary text-xs" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary text-xs flex items-center gap-2"
                  onClick={handleStartAnalysis}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>ANALYZE IMPACT</span>
                </button>
              </div>
            )}

            {step === "analyzing" && (
              <div className="flex items-center justify-center w-full py-1">
                <span className="text-2xs font-mono text-slate-500 animate-pulse">
                  Querying backend dependency DAG...
                </span>
              </div>
            )}

            {step === "results" && (
              <div className="flex items-center justify-between w-full">
                <button
                  className="btn btn-secondary text-xs flex items-center gap-1.5"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Modify Parameters</span>
                </button>
                <button className="btn btn-primary text-xs" onClick={onClose}>
                  Confirm & Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reusable Entity Detail Drawer attached to this modal */}
      <EntityDetailDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        entityType={drawerType}
        entityData={drawerData}
        onSelectEntity={openDrawerEntity}
      />
    </>
  );
}
