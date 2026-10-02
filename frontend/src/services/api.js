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

/**
 * Perform Mock Impact Analysis for Venue Change Workflow
 * Matches expected P1 backend structure (VerifiedImpactResponse)
 */
export async function analyzeVenueChange(eventId = "event_kbc_hackathon_2026", payload = {}) {
  // Simulate rapid async processing delay
  await simulateDelay(250);

  const oldValue = payload.old_value || "Auditorium A";
  const newValue = payload.new_value || "Auditorium B";
  const reason = payload.reason || "HVAC cooling compressor failure detected; emergency thermal shutdown.";

  return {
    change_id: "change_001",
    change: {
      id: "change_001",
      event_id: eventId,
      entity_type: "venue",
      entity_id: payload.venue_id || "venue_auditorium_b",
      field_name: "venue_id",
      old_value: oldValue,
      new_value: newValue,
      reason: reason,
      created_by: "Ops Command Desk (Desk 01)",
      created_at: new Date().toISOString(),
    },
    impact_summary: {
      counts: {
        sessions: 4,
        speakers: 3,
        volunteers: 8,
        equipment: 2,
        tasks: 3,
        risks: 1,
      },
      conflict_count: 0,
      severity: "high",
      reasons: ["venue_relocation", "schedule_shift", "attendee_rebalancing"],
    },
    affected: {
      sessions: [
        {
          id: "sess_01",
          title: "AI Workshop",
          time: "10:00 — 11:00",
          speaker: "Rahul",
          speakerId: "speaker_01",
          track: "Deep Learning & LLMs",
          venue: newValue,
          venueId: "venue_hall_b",
          originalVenue: oldValue,
          isRelocated: true,
          status: "In Progress",
          statusType: "live",
          attendeeEstimate: 280,
          description: "Hands-on model fine-tuning with local agents, prompt pipelines, and multi-modal tool use.",
        },
        {
          id: "sess_02",
          title: "ML Panel",
          time: "11:00 — 12:00",
          speaker: "Priya",
          speakerId: "speaker_02",
          track: "Engineering & Architecture",
          venue: newValue,
          venueId: "venue_hall_b",
          originalVenue: oldValue,
          isRelocated: true,
          status: "Up Next",
          statusType: "warning",
          attendeeEstimate: 500,
          description: "Production ML scaling challenges, latency optimizations, and GPU cost management.",
        },
        {
          id: "sess_04",
          title: "Computer Vision Talk",
          time: "14:00 — 15:30",
          speaker: "Rahul",
          speakerId: "speaker_01",
          track: "Mentorship",
          venue: newValue,
          venueId: "venue_hall_b",
          originalVenue: oldValue,
          isRelocated: true,
          status: "Scheduled",
          statusType: "info",
          attendeeEstimate: 70,
          description: "Architectural consultation for multimodal vision pipelines and real-time edge processing.",
        },
        {
          id: "sess_06",
          title: "Closing Session",
          time: "17:00 — 18:00",
          speaker: "Arjun",
          speakerId: "speaker_07",
          track: "Security & Cloud",
          venue: newValue,
          venueId: "venue_hall_b",
          originalVenue: oldValue,
          isRelocated: true,
          status: "Scheduled",
          statusType: "info",
          attendeeEstimate: 220,
          description: "Secret management, token hygiene, and vulnerability triage for hackathon apps.",
        },
      ],
      speakers: [
        {
          id: "speaker_01",
          name: "Rahul",
          fullName: "Rahul Sharma",
          role: "AI Research Lead",
          organization: "NeuralWorks",
          session: "AI Workshop",
          sessionId: "sess_01",
          phone: "+91 98765 00001",
          status: "On Stage",
          requirements: "Wireless headset mic, dual screen mirror, local GPU workstation patch",
        },
        {
          id: "speaker_02",
          name: "Priya",
          fullName: "Priya Patel",
          role: "Staff ML Engineer",
          organization: "Databricks India",
          session: "ML Panel",
          sessionId: "sess_02",
          phone: "+91 98765 00002",
          status: "In Green Room",
          requirements: "Panel lapel mic, 4 handheld audience mics, timer confidence monitor",
        },
        {
          id: "speaker_07",
          name: "Arjun",
          fullName: "Arjun Iyer",
          role: "Product Design Lead",
          organization: "Atlassian",
          session: "Closing Session",
          sessionId: "sess_06",
          phone: "+91 98765 00007",
          status: "Checked In",
          requirements: "Figma interactive display link, USB-C projection hub, sticky boards",
        },
      ],
      volunteers: [
        {
          id: "vol_01",
          name: "Aarav Shah",
          role: "Stage Operations Lead",
          station: newValue,
          venueId: "venue_hall_b",
          phone: "+91 98765 43210",
          shift: "Full Day (08:30 — 18:30)",
          status: "On Station",
        },
        {
          id: "vol_02",
          name: "Diya Nair",
          role: "Speaker Escort & Support",
          station: newValue,
          venueId: "venue_hall_b",
          phone: "+91 98765 43211",
          shift: "Morning Shift (08:30 — 13:30)",
          status: "On Station",
        },
        {
          id: "vol_03",
          name: "Kabir Joshi",
          role: "Access & Registration",
          station: "Main Lobby / Wayfinding",
          venueId: "venue_main_hall",
          phone: "+91 98765 43212",
          shift: "Morning Shift (08:00 — 13:00)",
          status: "On Station",
        },
        {
          id: "vol_04",
          name: "Ishaan Patel",
          role: "Lead Audio Visual Tech",
          station: newValue,
          venueId: "venue_hall_b",
          phone: "+91 98765 43213",
          shift: "Full Day (08:30 — 19:00)",
          status: "Dispatched",
        },
        {
          id: "vol_05",
          name: "Sara Thomas",
          role: "Crowd Flow Coordinator",
          station: `${newValue} Entrance`,
          venueId: "venue_hall_b",
          phone: "+91 98765 43214",
          shift: "Morning Shift (09:00 — 14:00)",
          status: "On Station",
        },
        {
          id: "vol_06",
          name: "Vivaan Rao",
          role: "Room Coordinator",
          station: newValue,
          venueId: "venue_hall_b",
          phone: "+91 98765 43215",
          shift: "Afternoon Shift (12:00 — 18:30)",
          status: "Ready",
        },
        {
          id: "vol_07",
          name: "Aanya Kapoor",
          role: "VIP / Green Room Support",
          station: "Green Room",
          venueId: "venue_hall_b",
          phone: "+91 98765 43216",
          shift: "Full Day (09:00 — 18:00)",
          status: "On Station",
        },
        {
          id: "vol_08",
          name: "Advik Reddy",
          role: "AV Support Tech",
          station: `${newValue} Backstage`,
          venueId: "venue_hall_b",
          phone: "+91 98765 43217",
          shift: "Morning Shift (08:30 — 13:30)",
          status: "On Station",
        },
      ],
      equipment: [
        {
          id: "eq_02",
          name: "Laser Projector B",
          code: "EQ-PRJ-02",
          type: "Projection",
          quantity: 1,
          venue: newValue,
          venueId: "venue_hall_b",
          assignedSessionTitle: "AI Workshop",
          status: "Operational",
        },
        {
          id: "eq_03",
          name: "Wireless Mic Kit B (4x)",
          code: "EQ-AUD-02",
          type: "Audio",
          quantity: 4,
          venue: newValue,
          venueId: "venue_hall_b",
          assignedSessionTitle: "ML Panel",
          status: "Operational",
        },
      ],
      tasks: [
        {
          id: "task_01",
          title: "Notify Speaker Rahul",
          priority: "HIGH",
          owner: "Event Manager",
          deadline: "Today 6:00 PM",
          status: "Pending",
          context: "Confirm Hall B arrival, mic check, and revised presentation podium location.",
        },
        {
          id: "task_02",
          title: "Reroute Hall A AV cabling & audio checks",
          priority: "HIGH",
          owner: "AV Lead Ishaan",
          deadline: "Today 10:45 AM",
          status: "In Progress",
          context: "Move backup wireless receivers from Hall A control booth to Hall B stage.",
        },
        {
          id: "task_03",
          title: "Reposition 8 crowd flow volunteers",
          priority: "HIGH",
          owner: "Volunteer Lead Sara",
          deadline: "Today 11:00 AM",
          status: "Pending",
          context: "Station volunteers at Hall A junctions to redirect attendees to Hall B 1st floor.",
        },
      ],
    },
    conflicts: [],
    ai_summary: "",
  };
}

