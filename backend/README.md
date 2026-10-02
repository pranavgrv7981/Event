# Event Operations Command Center API

This directory contains the Phase 1 backend foundation: a FastAPI application and a configurable SQLAlchemy database connection using SQLite by default. No event domain models or operational behavior are implemented yet.

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

Optionally copy `.env.example` to `.env` and change `DATABASE_URL`. The application reads environment variables from the process environment; load `.env` values in your shell or development environment before starting the server.

## Run

```powershell
uvicorn app.main:app --reload
```

The server listens on `http://127.0.0.1:8000` by default.

## Endpoints

- `GET /` returns the API name.
- `GET /health` returns the service health status.

## Database

SQLAlchemy is configured through `DATABASE_URL`, which defaults to `sqlite:///./event.db`. When the application starts, it initializes the database and creates tables declared by imported model modules. The models package is currently empty, so no domain tables are created in this phase. SQLite creates `event.db` in the backend working directory when the engine first connects.
