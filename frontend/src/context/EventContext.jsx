import React, { createContext, useState, useEffect } from "react";
import { getEvents, getEvent, getRoles } from "../services/api";

const EventContext = createContext(null);

export function EventProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [currentEventId, setCurrentEventId] = useState("event_kbc_hackathon_2026");
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentRole, setCurrentRole] = useState("lead");
  const [roles, setRoles] = useState([]);
  const [isLive, setIsLive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        const [eventList, roleList] = await Promise.all([getEvents(), getRoles()]);
        setEvents(eventList);
        setRoles(roleList);
        const active = await getEvent(currentEventId);
        setCurrentEvent(active);
        setIsLive(active.status === "LIVE");
      } catch (err) {
        console.error("Failed to initialize event context:", err);
        setError(err.message || "Failed to load events");
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [currentEventId, refreshTrigger]);

  const changeEvent = async (newEventId) => {
    setCurrentEventId(newEventId);
    try {
      const active = await getEvent(newEventId);
      setCurrentEvent(active);
      setIsLive(active.status === "LIVE");
    } catch (err) {
      console.error("Failed to switch event:", err);
    }
  };

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const toggleLiveStatus = () => {
    setIsLive((prev) => !prev);
  };

  return (
    <EventContext.Provider
      value={{
        events,
        currentEventId,
        currentEvent,
        setCurrentEventId: changeEvent,
        currentRole,
        setCurrentRole,
        roles,
        isLive,
        toggleLiveStatus,
        isLoading,
        error,
        refreshData,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export { EventContext };

