import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { EventProvider } from "./context/EventContext";
import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import SessionsPage from "./pages/SessionsPage";
import VenuesPage from "./pages/VenuesPage";
import SpeakersPage from "./pages/SpeakersPage";
import VolunteersPage from "./pages/VolunteersPage";
import EquipmentPage from "./pages/EquipmentPage";
import TasksPage from "./pages/TasksPage";
import RisksPage from "./pages/RisksPage";
import ChangesPage from "./pages/ChangesPage";
import ImpactPage from "./pages/ImpactPage";

export default function App() {
  return (
    <EventProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="venues" element={<VenuesPage />} />
            <Route path="speakers" element={<SpeakersPage />} />
            <Route path="volunteers" element={<VolunteersPage />} />
            <Route path="equipment" element={<EquipmentPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="risks" element={<RisksPage />} />
            <Route path="changes" element={<ChangesPage />} />
            <Route path="impact" element={<ImpactPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </EventProvider>
  );
}
