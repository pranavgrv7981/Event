import React, { useState, useEffect, useCallback } from 'react';
import api from './services/api';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { LoadingState, ErrorState } from './components/LoadingState';
import ChangePanel from './components/ChangePanel';
import DependencyModal from './components/DependencyModal';

import DashboardPage from './pages/DashboardPage';
import ChangeStudioPage from './pages/ChangeStudioPage';
import SessionsPage from './pages/SessionsPage';
import VenuesPage from './pages/VenuesPage';
import TasksPage from './pages/TasksPage';
import RisksPage from './pages/RisksPage';
import ChangesPage from './pages/ChangesPage';

export function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');

  const [event, setEvent] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [venues, setVenues] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [risks, setRisks] = useState([]);
  const [changes, setChanges] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [currentRole, setCurrentRole] = useState('operations');
  const [changeModal, setChangeModal] = useState({ isOpen: false, session: null });
  const [depModal, setDepModal] = useState({ isOpen: false, type: null, id: null });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        const events = await api.getEvents();
        if (!active) return;
        if (!events || events.length === 0) {
          throw new Error('No events found. Please initialize the database with seed.py.');
        }

        const activeEvent = events[0];
        setEvent(activeEvent);
        const eventId = activeEvent.id;

        const [
          dashRes,
          sessRes,
          venRes,
          spkRes,
          volRes,
          eqRes,
          taskRes,
          riskRes,
          chRes,
        ] = await Promise.all([
          api.getEventDashboard(eventId).catch(() => null),
          api.getSessions().catch(() => []),
          api.getVenues().catch(() => []),
          api.getSpeakers().catch(() => []),
          api.getVolunteers().catch(() => []),
          api.getEquipment().catch(() => []),
          api.getEventTasks(eventId).catch(() => []),
          api.getEventRisks(eventId).catch(() => []),
          api.getEventChanges(eventId).catch(() => []),
        ]);

        if (!active) return;
        setDashboard(dashRes);
        setSessions(sessRes);
        setVenues(venRes);
        setSpeakers(spkRes);
        setVolunteers(volRes);
        setEquipment(eqRes);
        setTasks(taskRes);
        setRisks(riskRes);
        setChanges(chRes);
      } catch (err) {
        if (active) setError(err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, [refreshTrigger]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    setIsUpdating(true);
    try {
      await api.updateTask(taskId, { status: newStatus });
      triggerRefresh();
      showToast(`Task status updated to ${newStatus}`, 'green');
    } catch (err) {
      showToast(err?.detail || err?.message || 'Task update failed', 'rose');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateRiskStatus = async (riskId, newStatus) => {
    setIsUpdating(true);
    try {
      await api.updateRisk(riskId, { status: newStatus });
      triggerRefresh();
      showToast(`Risk status updated to ${newStatus}`, 'green');
    } catch (err) {
      showToast(err?.detail || err?.message || 'Risk update failed', 'rose');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangeSuccess = (result) => {
    triggerRefresh();
    showToast(`Operational change recorded. ${result?.conflicts?.length || 0} conflicts detected.`, 'cyan');
  };

  const activeConflicts = dashboard?.active_conflicts || [];
  const openTasks = tasks.filter((t) => t.status === 'open' || t.status === 'todo').length;
  const highRisks = risks.filter((r) => r.severity === 'high' || r.severity === 'critical').length;

  const counts = {
    conflicts: activeConflicts.length,
    sessions: sessions.length,
    venues: venues.length,
    speakers: speakers.length,
    volunteers: volunteers.length,
    equipment: equipment.length,
    openTasks,
    highRisks,
    changes: changes.length,
  };

  if (isLoading) {
    return (
      <div className="cc-app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState message="Connecting to Event Operations Backend..." />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="cc-app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ErrorState
          error={error}
          onRetry={() => {
            setIsLoading(true);
            setError(null);
            triggerRefresh();
          }}
          message="Unable to reach Event Operations Backend"
        />
      </div>
    );
  }

  return (
    <div className="cc-app">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        counts={counts}
      />

      {/* Main Shell */}
      <div className="cc-main-shell">
        <Header
          activeEvent={event}
          activeConflictsCount={activeConflicts.length}
          onOpenChangeModal={(s) => setChangeModal({ isOpen: true, session: s || null })}
          currentRole={currentRole}
          onSelectRole={setCurrentRole}
        />

        {/* Global Toast */}
        {toast && (
          <div style={{ padding: '0 28px', marginTop: '12px' }}>
            <div style={{ backgroundColor: 'rgba(14, 165, 233, 0.15)', border: '1px solid rgba(14, 165, 233, 0.4)', borderRadius: '6px', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span>{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '13px' }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <main className="cc-content">
          {currentTab === 'dashboard' && (
            <DashboardPage
              event={event}
              dashboard={dashboard}
              sessions={sessions}
              venues={venues}
              tasks={tasks}
              risks={risks}
              recentChanges={changes}
              volunteers={volunteers}
              equipment={equipment}
              speakers={speakers}
              currentRole={currentRole}
              onSelectRole={setCurrentRole}
              onInitiateChange={(s) => setChangeModal({ isOpen: true, session: s || null })}
              onInspectDependencies={(type, id) => setDepModal({ isOpen: true, type, id })}
              onNavigateTab={setCurrentTab}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onUpdateRiskStatus={handleUpdateRiskStatus}
              isUpdating={isUpdating}
            />
          )}

          {currentTab === 'demo' && (
            <ChangeStudioPage
              event={event}
              eventId={event?.id}
              sessions={sessions}
              venues={venues}
              onSuccess={handleChangeSuccess}
            />
          )}

          {currentTab === 'sessions' && (
            <SessionsPage
              sessions={sessions}
              venues={venues}
              onInitiateChange={(s) => setChangeModal({ isOpen: true, session: s || null })}
              onInspectDependencies={(type, id) => setDepModal({ isOpen: true, type, id })}
            />
          )}

          {currentTab === 'venues' && (
            <VenuesPage
              venues={venues}
              equipment={equipment}
              speakers={speakers}
              volunteers={volunteers}
              onInspectDependencies={(type, id) => setDepModal({ isOpen: true, type, id })}
            />
          )}

          {currentTab === 'people' && (
            <VenuesPage
              venues={venues}
              equipment={equipment}
              speakers={speakers}
              volunteers={volunteers}
              onInspectDependencies={(type, id) => setDepModal({ isOpen: true, type, id })}
            />
          )}

          {currentTab === 'equipment' && (
            <VenuesPage
              venues={venues}
              equipment={equipment}
              speakers={speakers}
              volunteers={volunteers}
              onInspectDependencies={(type, id) => setDepModal({ isOpen: true, type, id })}
            />
          )}

          {currentTab === 'tasks' && (
            <TasksPage
              eventId={event?.id}
              tasks={tasks}
              volunteers={volunteers}
              sessions={sessions}
              venues={venues}
              onRefreshTasks={triggerRefresh}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              isUpdating={isUpdating}
            />
          )}

          {currentTab === 'risks' && (
            <RisksPage
              eventId={event?.id}
              risks={risks}
              sessions={sessions}
              venues={venues}
              onRefreshRisks={triggerRefresh}
              onUpdateRiskStatus={handleUpdateRiskStatus}
              isUpdating={isUpdating}
            />
          )}

          {currentTab === 'changes' && (
            <ChangesPage
              changes={changes}
              onInitiateChange={(s) => setChangeModal({ isOpen: true, session: s || null })}
              onRefreshChanges={triggerRefresh}
            />
          )}
        </main>
      </div>

      {/* Operational Change Modal */}
      {changeModal.isOpen && (
        <div className="cc-modal-backdrop" onClick={() => setChangeModal({ isOpen: false, session: null })}>
          <ChangePanel
            key={changeModal.session?.id || 'new-change'}
            eventId={event?.id}
            sessions={sessions}
            venues={venues}
            preselectedSession={changeModal.session}
            isModal={true}
            onClose={() => setChangeModal({ isOpen: false, session: null })}
            onSuccess={handleChangeSuccess}
          />
        </div>
      )}

      {/* Dependency Modal */}
      {depModal.isOpen && (
        <DependencyModal
          entityType={depModal.type}
          entityId={depModal.id}
          onClose={() => setDepModal({ isOpen: false, type: null, id: null })}
        />
      )}
    </div>
  );
}

export default App;
