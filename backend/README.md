# Event Operations Command Center API

This directory contains the FastAPI backend, SQLAlchemy models, SQLite database setup, deterministic development seed data, read APIs, deterministic dependency traversal, and transactional change processing. The database is the source of truth for operational records and explicit relationships. Impact results contain database-derived facts only; no AI layer is implemented.

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

Optionally copy `.env.example` to `.env` and set `DATABASE_URL` in your shell or development environment before starting the server. The default is `sqlite:///./event.db`, relative to the backend working directory.

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

## Database

SQLAlchemy is configured through `DATABASE_URL`, which defaults to `sqlite:///./event.db`. Application startup imports model metadata and creates missing tables. The schema includes events, venues, sessions, speakers, volunteers, equipment, tasks, risks, and changes, plus association tables connecting sessions with speakers, volunteers, and equipment. Sessions also reference their venue; tasks and risks can reference related sessions and venues.

The seed currently creates one KBC TechFest 2026 event, 7 venues, 11 sessions, 7 speakers, 22 volunteers, 13 equipment records, 17 tasks, 5 risks, and 1 change record. The SQLite database and Python cache/virtual environment files are local development artifacts and are ignored by Git.

## Dependency traversal

The dependency endpoint follows explicit SQLAlchemy relationships and returns unique results sorted by ID. Venue and session lookups include their linked sessions, people, equipment, tasks, and recorded risks; other source types return only the directly related records supported by their relationships.

Change processing validates ownership and writable fields, captures the old value from the database, and atomically applies the update with a `Change` record. Dependency and conflict analysis run in the same transaction; errors roll back both the update and record. The returned severity is deterministic: high for venue schedule or speaker overlaps, medium for equipment or volunteer overlaps or multiple affected tasks, and low otherwise. Reasons are machine-readable codes.

Conflict checks supported by the current schema are venue schedule overlap, speaker double-booking, volunteer double-booking, and concurrent equipment assignments beyond recorded quantity. The schema has no session attendance or required-capacity field, so capacity conflicts are not calculated. Changing a venue's display name does not relocate session foreign keys; to move a session, change its `venue_id`.

## Tests

Run the backend test suite from this directory:

```powershell
python -m pytest -q
```

The tests seed isolated temporary SQLite databases from `seed.py`; they do not clear or reseed the working development database. The Auditorium A change test derives expected affected records from the seeded ORM relationships.
