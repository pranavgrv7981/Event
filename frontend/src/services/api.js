/**
 * Mira Event Command Center - API & Data Service Abstraction
 * 
 * Central data layer providing consistent async access to event operations data.
 * In Phase 1 & 2, this returns internally consistent mock data.
 * In later phases, these functions easily swap to P1's FastAPI endpoints.
 */

import {
  MOCK_EVENTS,
  MOCK_VENUES,
  MOCK_SPEAKERS,
  MOCK_VOLUNTEERS,
  MOCK_EQUIPMENT,
  MOCK_SESSIONS,
  MOCK_CHANGES,
  MOCK_TASKS,
  MOCK_RISKS,
  MOCK_ROLES,
} from "../mock/eventData";

// Simulated network latency helper
const simulateDelay = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch available events or a specific event by ID
 */
export async function getEvents() {
  await simulateDelay();
  return [...MOCK_EVENTS];
}

export async function getEvent(eventId = "event_kbc_hackathon_2026") {
  await simulateDelay();
  const event = MOCK_EVENTS.find((e) => e.id === eventId) || MOCK_EVENTS[0];
  if (!event) {
    throw new Error(`Event with ID '${eventId}' not found.`);
  }
  return { ...event };
}

/**
 * Fetch consolidated dashboard metrics, recent changes, upcoming sessions, priority tasks, and risks
 */
export async function getDashboard(eventId = "event_kbc_hackathon_2026") {
  await simulateDelay();
  const event = await getEvent(eventId);
  
  return {
    event,
    summary: event.stats,
    breakdown: event.breakdown,
    recentChanges: [...MOCK_CHANGES],
    upcomingSessions: [...MOCK_SESSIONS],
    priorityTasks: [...MOCK_TASKS],
    activeRisks: [...MOCK_RISKS],
    lastUpdated: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }),
  };
}

/**
 * Fetch all sessions for the active event
 */
export async function getSessions(_eventId = "event_kbc_hackathon_2026") {
  await simulateDelay();
  return [...MOCK_SESSIONS];
}

/**
 * Fetch a single session by ID
 */
export async function getSessionById(sessionId) {
  await simulateDelay();
  const session = MOCK_SESSIONS.find((s) => s.id === sessionId);
  if (!session) {
    throw new Error(`Session with ID '${sessionId}' not found.`);
  }
  return { ...session };
}

/**
 * Fetch chronological event timeline
 */
export async function getTimeline(_eventId = "event_kbc_hackathon_2026") {
  await simulateDelay();
  // Sort chronologically by startTime
  const sorted = [...MOCK_SESSIONS].sort((a, b) => a.startTime.localeCompare(b.startTime));
  return sorted;
}

/**
 * Fetch all venues with their linked sessions
 */
export async function getVenues(_eventId = "event_kbc_hackathon_2026") {
  await simulateDelay();
  return MOCK_VENUES.map((venue) => {
    // Find sessions assigned to this venue
    const sessions = MOCK_SESSIONS.filter(
      (s) => s.venueId === venue.id || (s.isRelocated && s.originalVenue === venue.name)
    );
    return {
      ...venue,
      scheduledSessions: sessions,
      scheduledCount: sessions.length,
    };
  });
}

/**
 * Fetch a single venue by ID
 */
export async function getVenueById(venueId) {
  await simulateDelay();
  const venue = MOCK_VENUES.find((v) => v.id === venueId);
  if (!venue) {
    throw new Error(`Venue with ID '${venueId}' not found.`);
  }
  const sessions = MOCK_SESSIONS.filter(
    (s) => s.venueId === venue.id || (s.isRelocated && s.originalVenue === venue.name)
  );
  return {
    ...venue,
    scheduledSessions: sessions,
    scheduledCount: sessions.length,
  };
}

/**
 * Fetch all speakers
 */
export async function getSpeakers(_eventId = "event_kbc_hackathon_2026") {
  await simulateDelay();
  return [...MOCK_SPEAKERS];
}

/**
 * Fetch a single speaker by ID
 */
export async function getSpeakerById(speakerId) {
  await simulateDelay();
  const speaker = MOCK_SPEAKERS.find((sp) => sp.id === speakerId);
  if (!speaker) {
    throw new Error(`Speaker with ID '${speakerId}' not found.`);
  }
  return { ...speaker };
}

/**
 * Fetch all volunteers
 */
export async function getVolunteers(_eventId = "event_kbc_hackathon_2026") {
  await simulateDelay();
  return [...MOCK_VOLUNTEERS];
}

/**
 * Fetch a single volunteer by ID
 */
export async function getVolunteerById(volunteerId) {
  await simulateDelay();
  const volunteer = MOCK_VOLUNTEERS.find((vol) => vol.id === volunteerId);
  if (!volunteer) {
    throw new Error(`Volunteer with ID '${volunteerId}' not found.`);
  }
  return { ...volunteer };
}

/**
 * Fetch equipment inventory
 */
export async function getEquipment(_eventId = "event_kbc_hackathon_2026") {
  await simulateDelay();
  return [...MOCK_EQUIPMENT];
}

/**
 * Fetch a single equipment item by ID
 */
export async function getEquipmentById(equipmentId) {
  await simulateDelay();
  const item = MOCK_EQUIPMENT.find((eq) => eq.id === equipmentId);
  if (!item) {
    throw new Error(`Equipment with ID '${equipmentId}' not found.`);
  }
  return { ...item };
}

/**
 * Fetch all operational tasks
 */
export async function getTasks(_eventId = "event_kbc_hackathon_2026") {
  await simulateDelay();
  return [...MOCK_TASKS];
}

/**
 * Fetch all recorded risks
 */
export async function getRisks(_eventId = "event_kbc_hackathon_2026") {
  await simulateDelay();
  return [...MOCK_RISKS];
}

/**
 * Fetch recent operational changes
 */
export async function getChanges(_eventId = "event_kbc_hackathon_2026") {
  await simulateDelay();
  return [...MOCK_CHANGES];
}

/**
 * Fetch user roles for the role selector
 */
export async function getRoles() {
  return [...MOCK_ROLES];
}
