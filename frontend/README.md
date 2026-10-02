# Mira — Intelligent Team Operations & Event Command Center (Frontend)

Phase 1 Application Shell and Command Dashboard for live event operations, dispatch, and impact tracking.

## Architecture

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/         # Reusable StatusBadge, PageHeader, StateViews, PlaceholderPage
│   │   ├── dashboard/      # StatCard, DashboardSection, SessionItem, ChangeAlert, TaskItem, RiskItem
│   │   └── layout/         # TopBar, Sidebar, AppLayout
│   ├── context/            # EventContext (Event selection, Live/Standby mode, Role selector)
│   ├── hooks/              # useEvent, useDashboardData
│   ├── mock/               # eventData.js (Realistic operational dataset for KBC Hackathon 2026)
│   ├── pages/              # DashboardPage, SessionsPage, VenuesPage, SpeakersPage, VolunteersPage,
│   │                       # EquipmentPage, TasksPage, RisksPage, ChangesPage, ImpactPage
│   ├── services/           # api.js (Central async API abstraction layer)
│   ├── utils/              # formatters.js (Status, priority, and severity style helpers)
│   ├── App.jsx             # React Router routing hierarchy
│   ├── main.jsx            # Entry mount point
│   └── index.css           # High-density dark-slate command center design system
├── index.html
├── package.json
└── vite.config.js
```

## Available Scripts

From the `frontend/` directory:

- `npm run dev`: Launch the Vite development server with HMR.
- `npm run build`: Build production assets with tree-shaking into `dist/`.
- `npm run lint`: Run Oxlint across the frontend codebase.
- `npm run preview`: Preview the production build locally.

## Features Built in Phase 1

- **Tactical TopBar**: Product lockup, event switcher (`KBC Hackathon 2026` / `KBC TechFest 2026`), LIVE status beacon, role switcher (`Event Lead`, `Operations Manager`, `Stage & AV Coordinator`, `Volunteer Lead`), operational notifications, and operator profile.
- **Hierarchical Sidebar**: Primary entry point for Command Dashboard, categorized navigation into Core Operations and Command & Control, with real-time risk/task badges.
- **Command Dashboard**:
  - Live Event Header with timestamp and attention ticker
  - Summary metrics: Sessions (24), Tasks (31), Risks (3), People (48) with status breakdowns
  - High-priority Venue Change Alert (`Hall A → Hall B`) showing affected counts (4 sessions, 3 speakers, 8 volunteers) and `[ VIEW IMPACT ]` action button
  - Chronological Upcoming Sessions schedule with relocation badges
  - Priority Operational Tasks list with owner, priority, and deadline
  - Active Operational Risks with severity ratings and mitigation tracking
- **Safe Routing Hierarchy**: Minimal professional placeholder views for `/sessions`, `/venues`, `/speakers`, `/volunteers`, `/equipment`, `/tasks`, `/risks`, `/changes`, and `/impact`.
- **Decoupled API Abstraction**: `services/api.js` ready for seamless swap with P1's FastAPI backend in subsequent phases.
