/**
 * Centralized API Service for Event Operations Command Center (Backup Implementation)
 * Communicates exclusively with the FastAPI backend.
 * Base URL defaults to http://localhost:8000 (configurable via VITE_API_BASE_URL).
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message, status = 0, detail = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);

    if (!res.ok) {
      let detail = null;
      try {
        const body = await res.json();
        detail = body.detail || body.message || body;
      } catch {
        detail = await res.text();
      }
      const message = typeof detail === 'string' ? detail : JSON.stringify(detail);
      throw new ApiError(message || `Request failed with status ${res.status}`, res.status, detail);
    }

    if (res.status === 204) return null;
    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      `Unable to reach backend at ${BASE_URL}. Ensure FastAPI is running.`,
      0,
      err.message
    );
  }
}

export const api = {
  getBaseUrl: () => BASE_URL,
  getHealth: () => request('/health'),

  // Event & Dashboard
  getEvents: () => request('/events'),
  getEvent: (eventId) => request(`/events/${eventId}`),
  getEventDashboard: (eventId) => request(`/events/${eventId}/dashboard`),

  // Core entities
  getVenues: () => request('/venues'),
  getSessions: () => request('/sessions'),
  getSpeakers: () => request('/speakers'),
  getVolunteers: () => request('/volunteers'),
  getEquipment: () => request('/equipment'),

  // Tasks
  getTasks: () => request('/tasks'),
  getEventTasks: (eventId) => request(`/events/${eventId}/tasks`),
  getTask: (taskId) => request(`/tasks/${taskId}`),
  createTask: (eventId, data) => request(`/events/${eventId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateTask: (taskId, updates) => request(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }),
  getVolunteerTasks: (volunteerId) => request(`/volunteers/${volunteerId}/tasks`),

  // Risks
  getRisks: () => request('/risks'),
  getEventRisks: (eventId) => request(`/events/${eventId}/risks`),
  getRisk: (riskId) => request(`/risks/${riskId}`),
  createRisk: (eventId, data) => request(`/events/${eventId}/risks`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateRisk: (riskId, updates) => request(`/risks/${riskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }),

  // Deterministic Dependencies (Phase 3)
  getDependencies: (entityType, entityId) => request(`/dependencies/${entityType}/${entityId}`),

  // Operational Changes & Impacts (Phase 4)
  createChange: (eventId, changeData) => request(`/events/${eventId}/changes`, {
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

  // P3 Notion Integration Architecture (Ready for P3 Backend Adapter)
  // Contract prepared for dispatching verified impact + AI synthesis to Notion databases once P3 backend adapter is activated.
  syncToNotion: (changeId) => request(`/changes/${changeId}/sync-notion`, {
    method: 'POST',
  }),
};

export default api;
