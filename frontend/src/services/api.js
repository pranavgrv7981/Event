/**
 * Mira Event Command Center - API & Data Service Abstraction
 * 
 * Central data layer providing consistent async access to event operations data.
 * In Phase 1, this returns internally consistent mock data.
 * In later phases, these functions easily swap to P1's FastAPI endpoints:
 *   - GET /events/{event_id}
 *   - GET /events/{event_id}/dashboard
 *   - GET /sessions
 *   - GET /venues
 *   - GET /speakers
 *   - GET /volunteers
 *   - GET /equipment
 *   - GET /events/{event_id}/tasks
 *   - GET /events/{event_id}/risks
 *   - GET /events/{event_id}/changes
 */

import {
  MOCK_EVENTS,
  MOCK_VENUES,
  MOCK_SPEAKERS,
  MOCK_VOLUNTEERS,
  MOCK_SESSIONS,
  MOCK_CHANGES,
  MOCK_TASKS,
  MOCK_RISKS,
  MOCK_ROLES,
} from "../mock/eventData";

// Simulated network latency helper
const simulateDelay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

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
 * Fetch all venues
 */
export async function getVenues(_eventId = "event_kbc_hackathon_2026") {
  await simulateDelay();
  return [...MOCK_VENUES];
}

/**
 * Fetch all speakers
 */
export async function getSpeakers(_eventId = "event_kbc_hackathon_2026") {
  await simulateDelay();
  return [...MOCK_SPEAKERS];
}

/**
 * Fetch all volunteers
 */
export async function getVolunteers(_eventId = "event_kbc_hackathon_2026") {
  await simulateDelay();
  return [...MOCK_VOLUNTEERS];
}

/**
 * Fetch equipment inventory
 */
export async function getEquipment(_eventId = "event_kbc_hackathon_2026") {
  await simulateDelay();
  // Return equipment array derived from venues and mock inventory
  return [
    { id: "eq_01", name: "Laser Projector A", type: "Projection", quantity: 1, venue: "Hall A", status: "Under Check" },
    { id: "eq_02", name: "Laser Projector B", type: "Projection", quantity: 1, venue: "Hall B", status: "Operational" },
    { id: "eq_03", name: "Wireless Mic Kit B (4x)", type: "Audio", quantity: 4, venue: "Hall B", status: "Operational" },
    { id: "eq_04", name: "Dual Stage Monitors", type: "Audio", quantity: 2, venue: "Hall B", status: "Operational" },
    { id: "eq_05", name: "GPU Workstation Cluster (16x)", type: "Computing", quantity: 16, venue: "Innovation Lab", status: "Operational" },
    { id: "eq_06", name: "High-Lumen Projector C", type: "Projection", quantity: 2, venue: "Main Hall", status: "Operational" },
    { id: "eq_07", name: "Heavy Duty Extension Board Set", type: "Power", quantity: 20, venue: "Main Hall / Lab", status: "In Use" },
    { id: "eq_08", name: "Automated External Defibrillator", type: "Safety", quantity: 1, venue: "Central Corridor", status: "Inspected" },
  ];
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
