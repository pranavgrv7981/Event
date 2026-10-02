# Event Operations Command Center API

This directory contains the FastAPI backend, SQLAlchemy models, SQLite database setup, deterministic development seed data, and basic read APIs for the Event Operations Command Center. The database is the source of truth for the operational records and their explicit relationships. No dependency or impact engine is implemented in this phase.

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

## Database

SQLAlchemy is configured through `DATABASE_URL`, which defaults to `sqlite:///./event.db`. Application startup imports model metadata and creates missing tables. The schema includes events, venues, sessions, speakers, volunteers, equipment, tasks, risks, and changes, plus association tables connecting sessions with speakers, volunteers, and equipment. Sessions also reference their venue; tasks and risks can reference related sessions and venues.

The seed currently creates one KBC TechFest 2026 event, 7 venues, 11 sessions, 7 speakers, 22 volunteers, 13 equipment records, 17 tasks, 5 risks, and 1 change record. The SQLite database and Python cache/virtual environment files are local development artifacts and are ignored by Git.
