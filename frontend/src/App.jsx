import React, { useState, useEffect, useCallback } from 'react';
import api from './services/api';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { LoadingState, ErrorState } from './components/LoadingState';
import ChangePanel from './components/ChangePanel';
import DependencyModal from './components/DependencyModal';

import DashboardPage from './pages/DashboardPage';
import SessionsPage from './pages/SessionsPage';
import VenuesPage from './pages/VenuesPage';
import TasksPage from './pages/TasksPage';
import RisksPage from './pages/RisksPage';
import ChangesPage from './pages/ChangesPage';
import ChangeStudioPage from './pages/ChangeStudioPage';

export function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  
  // Data states
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

  // UI / Async states
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Modals
  const [changeModal, setChangeModal] = useState({ isOpen: false, session: null });
  const [dependencyModal, setDependencyModal] = useState({ isOpen: false, entityType: null, entityId: null });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadOperationsData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      try {
        const events = await api.getEvents();
        if (ignore) return;
        if (!events || events.length === 0) {
          throw new Error('No events found in backend database. Run seed.py to populate.');
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

        if (ignore) return;
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
        if (!ignore) {
          console.error('Failed to load event operations data:', err);
          setError(err);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      ignore = true;
    };
  }, [refreshTrigger]);

  // Status updates
  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    setIsUpdating(true);
    try {
      await api.updateTask(taskId, { status: newStatus });
      await loadOperationsData(false);
      showNotification(`Task marked as ${newStatus}`, 'success');
    } catch (err) {
      showNotification(err?.detail || err?.message || 'Failed to update task', 'danger');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateRiskStatus = async (riskId, newStatus) => {
    setIsUpdating(true);
    try {
      await api.updateRisk(riskId, { status: newStatus });
      await loadOperationsData(false);
      showNotification(`Risk marked as ${newStatus}`, 'success');
    } catch (err) {
      showNotification(err?.detail || err?.message || 'Failed to update risk', 'danger');
    } finally {
      setIsUpdating(false);
    }
  };

  const showNotification = (msg, type = 'info') => {
    setNotification({ message: msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleOpenChangeModal = (session = null) => {
    setChangeModal({ isOpen: true, session });
  };

  const handleCloseChangeModal = () => {
    setChangeModal({ isOpen: false, session: null });
  };

  const handleOpenDependencyModal = (entityType, entityId) => {
    setDependencyModal({ isOpen: true, entityType, entityId });
  };

  const handleCloseDependencyModal = () => {
    setDependencyModal({ isOpen: false, entityType: null, entityId: null });
  };

  const handleChangeProcessed = async (impactResult) => {
    await loadOperationsData(false);
    showNotification(`Change processed! ${impactResult?.conflicts?.length || 0} conflicts detected.`, 'info');
  };

  // Compute counts for navigation badges
  const activeConflicts = dashboard?.active_conflicts || [];
  const openTasks = tasks.filter(t => t.status === 'open' || t.status === 'todo').length;
  const highRisks = risks.filter(r => r.severity === 'high' || r.severity === 'critical').length;

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
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState message="Connecting to Event Operations Backend..." />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ErrorState
          error={error}
          onRetry={() => loadOperationsData(true)}
          message="Unable to connect to Event Operations API"
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        counts={counts}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Header
          activeEvent={event}
          activeConflictsCount={activeConflicts.length}
          onOpenChangeModal={() => handleOpenChangeModal()}
        />

        {/* Global Toast Notification */}
        {notification && (
          <div style={{ padding: '0 32px', marginTop: '16px' }}>
            <div className={`alert-banner ${notification.type}`} style={{ margin: 0, padding: '10px 16px' }}>
              <span className="alert-icon">ℹ️</span>
              <div className="alert-content">
                <div className="alert-description" style={{ fontSize: '13px' }}>
                  {notification.message}
                </div>
              </div>
              <button
                onClick={() => setNotification(null)}
                style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <main className="main-content">
          {currentTab === 'dashboard' && (
            <DashboardPage
              event={event}
              dashboard={dashboard}
              sessions={sessions}
              venues={venues}
              tasks={tasks}
              risks={risks}
              recentChanges={changes}
              onInitiateChange={handleOpenChangeModal}
              onInspectDependencies={handleOpenDependencyModal}
              onNavigateTab={setCurrentTab}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onUpdateRiskStatus={handleUpdateRiskStatus}
              isUpdating={isUpdating}
            />
          )}

          {currentTab === 'demo' && (
            <ChangeStudioPage
              eventId={event?.id}
              sessions={sessions}
              venues={venues}
              onSuccess={handleChangeProcessed}
            />
          )}

          {currentTab === 'sessions' && (
            <SessionsPage
              sessions={sessions}
              venues={venues}
              onInitiateChange={handleOpenChangeModal}
              onInspectDependencies={handleOpenDependencyModal}
            />
          )}

          {currentTab === 'venues' && (
            <VenuesPage
              venues={venues}
              equipment={equipment}
              speakers={speakers}
              volunteers={volunteers}
              onInspectDependencies={handleOpenDependencyModal}
            />
          )}

          {currentTab === 'people' && (
            <VenuesPage
              venues={venues}
              equipment={equipment}
              speakers={speakers}
              volunteers={volunteers}
              onInspectDependencies={handleOpenDependencyModal}
            />
          )}

          {currentTab === 'equipment' && (
            <VenuesPage
              venues={venues}
              equipment={equipment}
              speakers={speakers}
              volunteers={volunteers}
              onInspectDependencies={handleOpenDependencyModal}
            />
          )}

          {currentTab === 'tasks' && (
            <TasksPage
              eventId={event?.id}
              tasks={tasks}
              volunteers={volunteers}
              sessions={sessions}
              venues={venues}
              onRefreshTasks={() => loadOperationsData(false)}
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
              onRefreshRisks={() => loadOperationsData(false)}
              onUpdateRiskStatus={handleUpdateRiskStatus}
              isUpdating={isUpdating}
            />
          )}

          {currentTab === 'changes' && (
            <ChangesPage
              changes={changes}
              onInitiateChange={() => handleOpenChangeModal()}
              onRefreshChanges={() => loadOperationsData(false)}
            />
          )}
        </main>
      </div>

      {/* Operational Change Modal */}
      {changeModal.isOpen && (
        <div className="modal-overlay" onClick={handleCloseChangeModal}>
          <ChangePanel
            eventId={event?.id}
            sessions={sessions}
            venues={venues}
            preselectedSession={changeModal.session}
            isModal={true}
            onClose={handleCloseChangeModal}
            onSuccess={(result) => {
              handleChangeProcessed(result);
            }}
          />
        </div>
      )}

      {/* Deterministic Dependency Graph Modal */}
      {dependencyModal.isOpen && (
        <DependencyModal
          entityType={dependencyModal.entityType}
          entityId={dependencyModal.entityId}
          onClose={handleCloseDependencyModal}
        />
      )}
    </div>
  );
}

export default App;
