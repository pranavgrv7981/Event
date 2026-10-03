# Event Operations Command Center - Official Frontend (frontend1)

This directory contains the **official P2 frontend** for the Event Operations Command Center. It runs against the FastAPI backend, which remains the source of truth for event data, dependency calculations, conflicts, and impact analysis.

---

## Architecture Overview

```text
P2 FRONTEND (frontend1/ - React + Vite)
     ↓ (HTTP / REST)
P1 BACKEND + AI (FastAPI + SQLAlchemy + SQLite)
     ↓
P3 NOTION (External Integrations)
```

The backend is the **sole source of truth**. All dependency calculations, conflict detection, and AI impact analysis are performed by the backend.

---

## Quick Start

### 1. Prerequisites
- Node.js >= 18 (Tested on v24.x)
- FastAPI backend running on `http://localhost:8000`

### 2. Configuration
Copy the environment template:

```bash
cp .env.example .env
```

Default configuration in `.env`:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Install & Start Development Server

```bash
cd frontend1
npm install
npm run dev
```

The application will be served at:
```text
http://localhost:5173
```

### 4. Build for Production

```bash
npm run build
npm run preview
```

### 5. Linting

```bash
npm run lint
```

---

## Key Views & Features

1. **Command Center Dashboard (`dashboard`)**:
   - Live KPI cards: Total Sessions, Active Conflicts, Open Tasks, High Risks, Recorded Changes.
   - Prominent conflict banner highlighting any schedule or double-booking collisions.
   - Upcoming program sessions overview with one-click change triggers.
   - Recent operational changes stream and urgent task/risk lists.

2. **Change Impact Studio (`demo`)**:
   - The primary demo flow sandbox.
   - Select any session, choose the change type (e.g. `venue_id`), select new venue, enter an operational reason.
   - Includes one-click demo presets (e.g., *Move Opening Ceremony to Auditorium B*).
   - Atomically applies changes via `POST /events/{event_id}/changes`.
   - Displays **Verified Impact** (deterministic numbers: sessions, speakers, volunteers, equipment, tasks, risks).
   - Displays **Conflicts Detected** (schedule overlaps, double-booked speakers or volunteers).
   - Requests and displays **AI Impact Analysis** (`POST /changes/{change_id}/analyze`) with priority banner, executive summary, key impacts, recommended actions, and warnings.

3. **Sessions & Schedule (`sessions`)**:
   - Complete schedule master with search and venue filtering.
   - Inspect assigned speakers, volunteers, and equipment.
   - Dependency traversal launcher for any session.

4. **Venues & Resources (`venues`)**:
   - Tabbed view for **Venues**, **Equipment**, **Speakers**, and **Volunteers**.
   - Inspect capacities, location details, hardware quantities, and contact details.

5. **Operational Tasks (`tasks`)**:
   - Track operational checklist with priority and status filters.
   - Update task status in real time (`open`, `in_progress`, `blocked`, `done`).
   - Create new event tasks via modal (`POST /events/{event_id}/tasks`).

6. **Risk Register (`risks`)**:
   - Monitor event hazards with severity and status filters.
   - Update mitigation status (`open`, `monitoring`, `mitigating`, `mitigated`).
   - Log new operational risks via modal (`POST /events/{event_id}/risks`).

7. **Change Audit Log (`changes`)**:
   - Immutable audit trail of all historical changes.
   - View generated follow-up tasks and conflict risks.
   - Trigger on-demand AI impact analysis on historical change records.

---

## Primary Demo Story

```text
1. Open the Command Center Dashboard (or Change Studio)
       ↓
2. Select Session: "Opening Ceremony" (Auditorium A)
       ↓
3. Choose Change: "Relocate Venue (venue_id)"
       ↓
4. Select Destination: "Auditorium B" (or click Demo 1 preset)
       ↓
5. Input Operational Reason: "Auditorium A technical check requires relocation."
       ↓
6. Click "⚡ Submit Operational Change"
       ↓
7. Backend atomically processes change in SQLite transaction
       ↓
8. Frontend displays:
   ├── Change Committed (Auditorium A → Auditorium B)
   ├── ⚠ CONFLICTS DETECTED (Overlap with existing sessions in Auditorium B)
   ├── VERIFIED IMPACT (Deterministic counts: 3 Sessions, 2 Speakers, 7 Volunteers, 4 Equipment, 6 Tasks, 1 Risk)
   ├── AI IMPACT ANALYSIS (Gemini / Fallback summary, priority, key impacts, recommended actions, warnings)
   └── NOTION SYNC (one-way backend dispatch; reports missing configuration when credentials or database IDs are absent)
```

---

## API Endpoints Consumed

- `GET /health`
- `GET /events`
- `GET /events/{event_id}`
- `GET /events/{event_id}/dashboard`
- `GET /sessions`
- `GET /venues`
- `GET /speakers`
- `GET /volunteers`
- `GET /equipment`
- `GET /events/{event_id}/tasks`
- `POST /events/{event_id}/tasks`
- `PATCH /tasks/{task_id}`
- `GET /events/{event_id}/risks`
- `POST /events/{event_id}/risks`
- `PATCH /risks/{risk_id}`
- `GET /dependencies/{entity_type}/{entity_id}`
- `POST /events/{event_id}/changes`
- `GET /events/{event_id}/changes`
- `GET /changes/{change_id}`
- `GET /changes/{change_id}/tasks`
- `GET /changes/{change_id}/risks`
- `POST /changes/{change_id}/analyze`
- `POST /changes/{change_id}/sync-notion`
