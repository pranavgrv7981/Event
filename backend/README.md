# Event Operations Command Center API

This directory contains the FastAPI backend, SQLAlchemy models, SQLite database setup, deterministic development seed data, read APIs, deterministic dependency traversal, transactional change processing, and an on-demand AI analysis layer. The database and dependency engine remain the source of truth for operational facts; AI only interprets verified impact and falls back deterministically when Gemini is unavailable.

## Setup

From this directory, create and activate a virtual environment:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
python -m pip install -r requirements.txt
```

Optionally copy `.env.example` to `.env` and configure `DATABASE_URL`, `AI_PROVIDER`, and `GEMINI_API_KEY` before starting the server. `AI_PROVIDER` defaults to `fallback`; selecting Gemini without a key still uses fallback. The database default is `sqlite:///./event.db`, relative to the backend working directory.

## Run

```powershell
uvicorn app.main:app --reload
```

The server listens on `http://127.0.0.1:8000` by default.

To clear and repopulate the local development database with the deterministic KBC TechFest dataset, run from this directory:

```powershell
python seed.py
```

The script clears existing rows in dependency-safe table order before inserting the same fixed IDs and records. Use it only for the development database because existing data is replaced.

## Endpoints

- `GET /` returns the API name.
- `GET /health` returns the service health status.
- `GET /events` lists events.
- `GET /events/{event_id}` returns an event with its venues and sessions; sessions include their venue, speakers, volunteers, and equipment.
- `GET /venues` lists venues.
- `GET /sessions` lists sessions with their venue, speakers, volunteers, and equipment.
- `GET /speakers` lists speakers.
- `GET /volunteers` lists volunteers.
- `GET /equipment` lists equipment.
- `GET /tasks` lists tasks.
- `GET /risks` lists manually recorded risks.
- `GET /dependencies/{entity_type}/{entity_id}` returns deterministic related entities for `event`, `venue`, `session`, `speaker`, `volunteer`, `equipment`, `task`, or `risk` sources.
- `POST /events/{event_id}/changes` validates, applies, records, and analyzes an operational field change.
- `GET /events/{event_id}/changes` lists the event's change history.
- `GET /changes/{change_id}` returns one recorded change.
- `POST /changes/{change_id}/analyze` reconstructs verified impact from current database relationships and returns it separately from AI-generated analysis. The endpoint never stores AI output.
- `GET /events/{event_id}/tasks`, `GET /tasks/{task_id}`, `POST /events/{event_id}/tasks`, and `PATCH /tasks/{task_id}` provide event-scoped task management.
- `GET /changes/{change_id}/tasks` returns tasks attached to the change's affected sessions/venues; `GET /volunteers/{volunteer_id}/tasks` provides assigned tasks with session context.
- `GET /events/{event_id}/risks`, `GET /risks/{risk_id}`, `POST /events/{event_id}/risks`, and `PATCH /risks/{risk_id}` provide event-scoped risk management. `GET /changes/{change_id}/risks` returns risks related through affected sessions and venues.
- `GET /events/{event_id}/dashboard` reports live session/task/risk totals, recent changes, and currently detected conflicts.

## Database

SQLAlchemy is configured through `DATABASE_URL`, which defaults to `sqlite:///./event.db`. Application startup imports model metadata and creates missing tables. The schema includes events, venues, sessions, speakers, volunteers, equipment, tasks, risks, and changes, plus association tables connecting sessions with speakers, volunteers, and equipment. Sessions also reference their venue; tasks and risks can reference related sessions and venues.

The seed currently creates one KBC TechFest 2026 event, 7 venues, 11 sessions, 7 speakers, 22 volunteers, 13 equipment records, 17 tasks, 5 risks, and 1 change record. The SQLite database and Python cache/virtual environment files are local development artifacts and are ignored by Git.

## Dependency traversal

The dependency endpoint follows explicit SQLAlchemy relationships and returns unique results sorted by ID. Venue and session lookups include their linked sessions, people, equipment, tasks, and recorded risks; other source types return only the directly related records supported by their relationships.

Change processing validates ownership and writable fields, captures the old value from the database, and atomically applies the update with a `Change` record. Dependency and conflict analysis run in the same transaction; errors roll back both the update and record. The returned severity is deterministic: high for venue schedule or speaker overlaps, medium for equipment or volunteer overlaps or multiple affected tasks, and low otherwise. Reasons are machine-readable codes.

Conflict checks supported by the current schema are venue schedule overlap, speaker double-booking, volunteer double-booking, and concurrent equipment assignments beyond recorded quantity. The schema has no session attendance or required-capacity field, so capacity conflicts are not calculated. Changing a venue's display name does not relocate session foreign keys; to move a session, change its `venue_id`.

## AI impact analysis

Set `AI_PROVIDER=gemini` and provide `GEMINI_API_KEY` to enable Gemini analysis through Google's official `google-genai` SDK. Provider failures, missing credentials, malformed responses, and unsupported output fall back to deterministic local analysis. The API labels the verified backend impact separately from generated interpretation. No AI output is persisted.

## Operational follow-ups

Successful changes generate one deterministic follow-up per nonzero verified impact category, plus a session follow-up when the changed source is a session excluded from its own affected set. Generated tasks and conflict risks store a nullable direct `source_change_id`; an equivalent unresolved task for the same event and linked session (or venue when there is no session) is reused, and completed/cancelled tasks do not block a new follow-up. Risks are created only for confirmed venue, speaker, volunteer, or equipment conflicts, with severity assigned by a fixed backend mapping. Active risks are reused by event, conflict type, and related session or venue. Existing SQLite databases receive an additive migration for the nullable change links. Task/risk status values are lowercase to remain compatible with seeded records; `mitigating` remains accepted as a legacy risk status.

Historical impact is not snapshotted. AI analysis and pre-existing related task/risk lookup use current affected relationships; changes to those relationships after the original change can affect reconstructed results. Generated task/risk records have direct change links, but they do not preserve a historical impact snapshot. Persisted snapshots are deferred to a later hardening phase.

## Tests

Run the backend test suite from this directory:

```powershell
python -m pytest -q
```

The tests seed isolated temporary SQLite databases from `seed.py`; they do not clear or reseed the working development database. The Auditorium A change test derives expected affected records from the seeded ORM relationships.
