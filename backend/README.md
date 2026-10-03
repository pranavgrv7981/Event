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

## Notion operational sync

Notion is an optional one-way operational view. The backend database remains authoritative; dependency traversal, conflict detection, impact severity, and record selection are calculated by the backend. Notion edits are never read back into the backend.

Create a Notion internal integration with read-content, insert-content, and update-content capabilities. Share each of the four source databases with it. Set these variables in the backend process environment (the `.env.example` file lists them):

The application reads the process environment; it does not load a `.env` file itself. Export the values in the shell or configure them through the process manager that starts Uvicorn.

- `NOTION_API_KEY`
- `NOTION_PARENT_PAGE_ID` (setup only): the page where the integration may create the four databases
- `NOTION_SESSIONS_DATABASE_ID`, `NOTION_TASKS_DATABASE_ID`, `NOTION_RISKS_DATABASE_ID`, and `NOTION_CHANGES_DATABASE_ID` (optional after setup)

The application reads the process environment; it does not load a `.env` file. Put the token in the backend process environment or secret manager, never in the repository or command history. After setup, database IDs can be read from an ignored local file at `backend/.notion-databases.json`; explicit database ID environment variables override those local IDs. The file contains only a parent page ID and database IDs, never credentials.

### Automated workspace setup

The integration contract in `app/integrations/notion/databases.py` is authoritative. From `backend/`, run:

```powershell
python -m app.integrations.notion.setup
```

The command authenticates, searches for exact-name `Sessions`, `Tasks`, `Risks`, and `Changes` databases under `NOTION_PARENT_PAGE_ID`, reuses one exact match, and creates missing databases with the required property schemas. It adds missing properties and backend select options while preserving existing select options. It does not change incompatible existing property types or delete unrelated properties; it stops with an actionable error instead. Duplicate exact-name databases beneath the parent are reported rather than guessed between. Successful setup stores only the generated IDs in the ignored local JSON file, which the existing sync client reads as a fallback to the four optional database ID environment variables.

The setup operation itself creates databases and may update their schemas, so the integration needs insert/update content access to the shared parent and databases. It then runs the existing preflight and reports credentials, database/data-source discovery, schema, and read access. A read-only preflight cannot prove page-write permissions. To explicitly test page create/update/read/trash permissions, add:

```powershell
python -m app.integrations.notion.setup --verify-write
```

For the full sync and idempotence test, use:

```powershell
python -m app.integrations.notion.setup --verify-sync
```

This runs the existing backend `sync_change_to_notion` service twice using uniquely marked records in an isolated in-memory SQLite database, verifies one session/task/risk/change create followed by four updates, and moves only those run-specific Notion pages to trash. It does not use or modify operational backend records. `--verify-sync` also enables the temporary page-write preflight. Trash is reversible in Notion; the API does not permanently delete these probe pages. Run write verification in a staging workspace first. If cleanup fails, the report identifies the marked backend record ID that needs manual cleanup. Setup never deletes pre-existing pages.

The one-command flow requires `NOTION_API_KEY` and `NOTION_PARENT_PAGE_ID`; the integration must be granted access to that parent page. The command prints non-secret database IDs in its JSON report and persists them locally for the runtime sync. Do not paste the token into chat.

Each configured database must resolve to exactly one **active** data source. Archived secondary sources are ignored; zero or multiple active sources fail preflight. The integration verifies credentials through the current-user endpoint, retrieves each database and data-source schema, and issues a one-row data-source query to verify read access.

### Database properties

Property names below preserve the existing backend integration contract. The setup CLI deliberately follows this contract rather than introducing the alternate labels from external setup notes. Types and names must match exactly; select options cover the supported backend values and the values currently present in the backend database.

| Database | Title property | Additional properties |
|---|---|---|
| Sessions | `Name` (title) | `Session ID` (rich text), `Venue` (rich text), `Start Time` (date), `End Time` (date), `Speaker` (rich text), `Status` (select) |
| Tasks | `Title` (title) | `Task ID` (rich text), `Status` (select), `Priority` (select), `Owner` (rich text), `Due Time` (date), `Description` (rich text), `Source Change` (rich text) |
| Risks | `Title` (title) | `Risk ID` (rich text), `Severity` (select), `Status` (select), `Description` (rich text), `Source Change` (rich text) |
| Changes | `Title` (title) | `Change ID` (rich text), `Entity` (rich text), `Field` (rich text), `Old Value` (rich text), `New Value` (rich text), `Status` (select), `Severity` (select), `Created Time` (date), `AI Recommended Actions` (rich text) |

Select properties must include task status `open`, `todo`, `in_progress`, `blocked`, `done`, `cancelled`; task priority and risk severity `low`, `medium`, `high`, `critical`; risk status `open`, `monitoring`, `mitigating`, `mitigated`, `closed`; the current session status values in the backend database (including the default `scheduled`); and change status `Recorded` plus change severity `low`, `medium`, `high`. Changes have no persisted status/severity; `Recorded` denotes the immutable change record and severity comes from verified backend impact. The task description is supported by the backend model. Risks have no owner field, so no owner property is mapped. The setup follows the current contract names `Due Time`, `Source Change`, `Created Time`, and `Source Change`; it does not invent a Risk `Owner` field.

### Preflight and live verification

Run the read-only preflight from the `backend/` directory after exporting the environment variables:

```powershell
python -m app.integrations.notion.preflight
```

It validates credentials, database access, the active data source, property types, select options, and query/read access. It deliberately reports write permissions as `not_checked`: Notion exposes no read-only capability-inspection endpoint. The overall result is not `ready` until write permissions have been verified.

To verify insert/update access, run the explicit probe **only against staging/test databases**:

```powershell
python -m app.integrations.notion.preflight --verify-write-permissions
```

This creates one uniquely marked temporary page per database, updates it, then moves it to Notion trash. If cleanup fails, the diagnostic includes the page ID and instructs the operator to trash it manually. Do not run this mode against production databases unless archived probe records are acceptable.

For real workspace verification, use a staging Notion workspace and a test change in a staging backend database. Confirm the preflight passes; call `POST /changes/{change_id}/sync-notion`; verify the returned per-type counts and inspect the synced session, task, risk, and change pages. Call it again and confirm the same pages are updated, not duplicated, and changed backend values appear in Notion. Also verify access-denied behavior by temporarily removing a staging database share and verify rate-limit/API failure reporting without using production data. Never paste or print the integration token.

### Sync behavior and limitations

The endpoint reconstructs verified impact from backend state, obtains the existing AI analysis/fallback, then upserts relevant sessions, tasks, risks, and the change. AI output contributes only the change-page `AI Recommended Actions`; it never supplies dependency, conflict, impact, or selection facts. Notion remains one-way and is never read as an operational authority.

Upsert identity is the backend ID property (`Session ID`, `Task ID`, `Risk ID`, `Change ID`). A single match is updated; no match is created; multiple matches produce an explicit `duplicate_match` failure and are not arbitrarily updated. The response includes created/updated totals, per-type synced counts, analysis provider, and per-record failure category/status. One failed record does not stop attempts for other records, and any per-record failure keeps overall `success` false. The official SDK retries rate limits and server errors three times with bounded exponential backoff; final rate limits are reported per record.

Sequential repeated syncs are idempotent. Notion does not enforce uniqueness on these rich-text backend ID properties, so concurrent sync requests can race between query and create; strict concurrency-safe deduplication is not guaranteed. Duplicate existing matches are detected and reported. No delete/reconciliation pass is performed.

Actual Notion Relation properties are deferred. Backend IDs remain in rich-text `Source Change` fields, while the sync selects related records from verified backend relationships. Notion Relations would require schema changes, related-page lookups, and more failure modes; they are not needed for the four-database sync contract. No relation links are currently written.

The SDK uses Notion API version `2025-09-03`, which introduced the database/data-source split used by `databases.retrieve/create`, `data_sources.retrieve/update/query`, and page creation under a data source. Official docs confirm database creation accepts an `initial_data_source` schema and data-source updates add properties; select option updates replace the full option list, so setup explicitly retains existing options before adding backend values. Current Notion docs list `2026-03-11` as the latest version; this integration keeps the existing pinned version to avoid an unverified migration. Review the official [database creation](https://developers.notion.com/reference/create-a-database), [data-source schema updates](https://developers.notion.com/reference/update-data-source-properties), and [versioning guide](https://developers.notion.com/reference/versioning) before changing it and rerun staging verification.

Without Notion configured, the API and other backend features still start normally. The sync endpoint returns a structured unsuccessful result listing missing variable names; it does not require a Notion token for backend startup or tests. Automated tests use fake SDK clients and make no Notion network calls. Preflight and mocked tests do not prove a live workspace is ready; only the staging procedure above does.

## Operational follow-ups

Successful changes generate one deterministic follow-up per nonzero verified impact category, plus a session follow-up when the changed source is a session excluded from its own affected set. Generated tasks and conflict risks store a nullable direct `source_change_id`; an equivalent unresolved task for the same event and linked session (or venue when there is no session) is reused, and completed/cancelled tasks do not block a new follow-up. Risks are created only for confirmed venue, speaker, volunteer, or equipment conflicts, with severity assigned by a fixed backend mapping. Active risks are reused by event, conflict type, and related session or venue. Existing SQLite databases receive an additive migration for the nullable change links. Task/risk status values are lowercase to remain compatible with seeded records; `mitigating` remains accepted as a legacy risk status.

Historical impact is not snapshotted. AI analysis and pre-existing related task/risk lookup use current affected relationships; changes to those relationships after the original change can affect reconstructed results. Generated task/risk records have direct change links, but they do not preserve a historical impact snapshot. Persisted snapshots are deferred to a later hardening phase.

## Tests

Run the backend test suite from this directory:

```powershell
python -m pytest -q
```

The tests seed isolated temporary SQLite databases from `seed.py`; they do not clear or reseed the working development database. The Auditorium A change test derives expected affected records from the seeded ORM relationships.
