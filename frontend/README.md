# Event Operations Command Center - Frontend (P2)

The **Event Operations Command Center** frontend is a high-density, mission-critical operations dashboard built with **React**, **Vite**, and **vanilla CSS**.

It serves as the **presentation and interaction layer (P2)**, communicating with the FastAPI backend (P1) while preserving the backend as the sole source of truth. The frontend does **not** compute impacts, double-booking conflicts, or AI analysis locally—it presents backend-verified facts and AI insights.

---

## Architecture Overview

```text
P2 FRONTEND (React + Vite)
     ↓ (HTTP / REST)
P1 BACKEND + AI (FastAPI + SQLAlchemy + SQLite)
     ↓
P3 NOTION (External Integrations)
```

---

## Quick Start

### 1. Prerequisites
- Node.js >= 18 (Tested on Node v24.x)
- Running FastAPI backend on `http://localhost:8000`

### 2. Configuration
Copy the environment template:

```bash
cp .env.example .env
```

Default configuration:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Install & Start Development Server

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

The application will be live at:
```text
http://localhost:5173
```

### 4. Build for Production

```bash
npm run build
npm run preview
```

### 5. Code Quality Check

```bash
npm run lint
```

---

## Key Pages & Views

| Route / View | Name | Description |
|---|---|---|
| `dashboard` | **Command Center** | High-level operations overview with active conflict alerts, live KPI metric counters, program sessions overview, and urgent tasks/risks. |
| `demo` | **Change Impact Studio** | Dedicated interactive sandbox for the primary demo flow: test session relocation, conflict generation, deterministic verified impact, and Gemini AI analysis. |
| `sessions` | **Sessions & Schedule** | Complete schedule master with venue filters, search, speaker bios, and direct change triggers. |
| `venues` | **Venues & Spaces** | Campus facilities, capacities, locations, and deterministic dependency links. |
| `people` | **Speakers & Staff** | Keynote speakers, session leads, and volunteer workforce availability. |
| `equipment` | **Equipment & AV** | Audio/visual assets, projector allocations, computing hardware, and status. |
| `tasks` | **Operational Tasks** | Task tracking, volunteer assignments, status updates (`open`, `in_progress`, `blocked`, `done`), and new task logging. |
| `risks` | **Risk Register** | Hazard assessment, crowd monitoring, severity levels (`critical`, `high`, `medium`, `low`), and status transitions. |
| `changes` | **Change History** | Immutable audit log of operational changes with follow-up task inspection and on-demand AI impact analysis. |

---

## Primary Demo Story: Operational Relocation Workflow

To showcase the system during a demo:

1. Open the **Command Center** or navigate to **Change Studio**.
2. Select a session (e.g. *Opening Ceremony* in Auditorium A).
3. Select a change field (e.g. `Relocate Venue (venue_id)`).
4. Choose destination venue (e.g. *Auditorium B*). Or click the preset button: **Demo 1: Move Opening Ceremony → Aud B**.
5. Provide the operational reason (e.g. *Stage technical check requires relocation*).
6. Click **⚡ Submit Operational Change**.
7. The backend applies the change atomically and returns:
   - **Change Committed**: Target entity, field, delta (Auditorium A → Auditorium B).
   - **Conflicts Detected**: Prominent red banner detailing overlapping sessions and double-booked speakers.
   - **Verified Impact**: Deterministic backend counts for affected Sessions, Speakers, Volunteers, Equipment, Tasks, and Risks.
   - **AI Impact Analysis**: Google Gemini / Fallback operational synthesis, priority level, key impacts, recommended action checklist, and warnings.

---

## Endpoints Consumed

- `GET /health` - API connectivity check
- `GET /events` - Active event discovery
- `GET /events/{event_id}/dashboard` - Live KPI stats, active conflicts, recent changes
- `GET /sessions` - Program sessions with speaker & resource relations
- `GET /venues` - Campus venues
- `GET /speakers` - Speaker roster
- `GET /volunteers` - Operational volunteers
- `GET /equipment` - Technical hardware assets
- `GET /events/{event_id}/tasks` & `POST /events/{event_id}/tasks` - Event task management
- `PATCH /tasks/{task_id}` - Update task status
- `GET /events/{event_id}/risks` & `POST /events/{event_id}/risks` - Risk register
- `PATCH /risks/{risk_id}` - Update risk status
- `GET /dependencies/{entity_type}/{entity_id}` - Deterministic dependency graph traversal
- `POST /events/{event_id}/changes` - Transactional change processing & impact verification
- `GET /events/{event_id}/changes` - Change audit trail
- `GET /changes/{change_id}/tasks` - Tasks spawned by change
- `GET /changes/{change_id}/risks` - Risks identified by change
- `POST /changes/{change_id}/analyze` - On-demand AI impact analysis
