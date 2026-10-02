/**
 * Centralized API Service for Event Operations Command Center
 * Communicates with FastAPI backend.
 * Base URL is configured via VITE_API_BASE_URL (defaults to http://localhost:8000).
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(message, status, detail = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      let errorDetail = null;
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || errorJson.message || errorJson;
      } catch {
        errorDetail = await response.text();
      }
      const message = typeof errorDetail === 'string' 
        ? errorDetail 
        : (errorDetail?.detail || `HTTP error ${response.status}`);
      throw new ApiError(message, response.status, errorDetail);
    }

    // Return empty for 204 No Content
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network errors (e.g. backend down)
    throw new ApiError(
      `Unable to reach backend at ${BASE_URL}. Ensure the FastAPI server is running.`,
      0,
      error.message
    );
  }
}

export const api = {
  // Base & Health
  getBaseUrl: () => BASE_URL,
  getHealth: () => request('/health'),

  // Events
  getEvents: () => request('/events'),
  getEvent: (eventId) => request(`/events/${eventId}`),
  getEventDashboard: (eventId) => request(`/events/${eventId}/dashboard`),

  // Venues, Speakers, Volunteers, Equipment
  getVenues: () => request('/venues'),
  getSessions: () => request('/sessions'),
  getSpeakers: () => request('/speakers'),
  getVolunteers: () => request('/volunteers'),
  getEquipment: () => request('/equipment'),

  // Tasks
  getTasks: () => request('/tasks'),
  getEventTasks: (eventId) => request(`/events/${eventId}/tasks`),
  createEventTask: (eventId, taskData) => request(`/events/${eventId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(taskData),
  }),
  getTask: (taskId) => request(`/tasks/${taskId}`),
  updateTask: (taskId, updates) => request(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }),
  getVolunteerTasks: (volunteerId) => request(`/volunteers/${volunteerId}/tasks`),

  // Risks
  getRisks: () => request('/risks'),
  getEventRisks: (eventId) => request(`/events/${eventId}/risks`),
  createEventRisk: (eventId, riskData) => request(`/events/${eventId}/risks`, {
    method: 'POST',
    body: JSON.stringify(riskData),
  }),
  getRisk: (riskId) => request(`/risks/${riskId}`),
  updateRisk: (riskId, updates) => request(`/risks/${riskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }),

  // Dependencies (Phase 3 Deterministic Engine)
  getDependencies: (entityType, entityId) => 
    request(`/dependencies/${entityType}/${entityId}`),

  // Operational Changes & Impact (Phase 4)
  createEventChange: (eventId, changeData) => request(`/events/${eventId}/changes`, {
    method: 'POST',
    body: JSON.stringify(changeData),
  }),
  getEventChanges: (eventId) => request(`/events/${eventId}/changes`),
  getChange: (changeId) => request(`/changes/${changeId}`),
  getChangeTasks: (changeId) => request(`/changes/${changeId}/tasks`),
  getChangeRisks: (changeId) => request(`/changes/${changeId}/risks`),

  // AI Impact Analysis (Phase 5)
  analyzeChange: (changeId) => request(`/changes/${changeId}/analyze`, {
    method: 'POST',
  }),
};

export default api;
