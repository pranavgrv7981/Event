import React, { useState, useContext } from "react";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import VenueChangeModal from "../workflow/VenueChangeModal";
import { EventContext } from "../../context/EventContext";

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    isVenueChangeModalOpen,
    closeVenueChangeModal,
    venueChangeInitialData,
    setLatestImpactAnalysis,
  } = useContext(EventContext);

  return (
    <div className="app-shell-root">
      {/* Top Bar fixed at the top */}
      <TopBar
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        mobileMenuOpen={mobileMenuOpen}
      />

      <div className="app-body-container">
        {/* Navigation Sidebar */}
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Primary Content Viewport */}
        <main className="main-content-viewport">
          <div className="content-container">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Venue Change Workflow Modal */}
      <VenueChangeModal
        isOpen={isVenueChangeModalOpen}
        onClose={closeVenueChangeModal}
        initialData={venueChangeInitialData}
        onAnalysisSuccess={(result) => setLatestImpactAnalysis(result)}
      />
    </div>
  );
}
