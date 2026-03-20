# Architecture Overview

## System Design

JumpContact Platform is a **Next.js App Router** application that aggregates data from external services into a unified operations dashboard.

```
┌─────────────────────────────────────────────────┐
│                    Browser                       │
│  ┌───────────┬──────────┬──────────┬──────────┐ │
│  │ Live Now  │ Call Log │ Meeting  │   Race   │ │
│  └─────┬─────┴────┬─────┴────┬─────┴────┬─────┘ │
└────────┼──────────┼──────────┼──────────┼────────┘
         │          │          │          │
         ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────┐
│              Next.js API Routes                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ /api/data│  │/api/calls│  │/api/calls/rec │ │
│  └────┬─────┘  └────┬─────┘  └──────┬────────┘ │
└───────┼─────────────┼───────────────┼────────────┘
        │             │               │
        ▼             ▼               ▼
  ┌───────────┐ ┌───────────┐  ┌───────────┐
  │  Google   │ │  Twilio   │  │  Twilio   │
  │  Sheets   │ │  CDR API  │  │ Recording │
  └───────────┘ └───────────┘  └───────────┘
```

## Data Sources

### Google Sheets

Three sheets are read via the Google Sheets API using a service account:

| Sheet | Data | Used By |
|-------|------|---------|
| Conversions | Timestamp, agent, account | Dashboard KPIs, Meeting, Race |
| Missed Calls | Date, account | Dashboard, Meeting |
| Ytica Speed | Agent, speed (H:M:S) | Meeting speed stats |

### Twilio

| API | Data | Used By |
|-----|------|---------|
| Calls (CDR) | Call records, duration, direction | Call Log, Dashboard |
| Recordings | Audio files (MP3) | Call Log player |
| TaskRouter Workers | Avg task acceptance, cleanup time | Dashboard, Meeting |

## Key Design Decisions

### Server-Side Data Aggregation

All external API calls happen server-side in Next.js API routes. The client never contacts Twilio or Google directly. This:
- Keeps API credentials secure
- Allows data transformation and aggregation before delivery
- Enables caching at the API layer

### Timezone Handling

The app is hardcoded to `America/Edmonton` (Mountain Time). All date comparisons and display formatting convert from UTC (Twilio/Vercel) to MST/MDT. This is intentional — the call center operates in a single timezone.

### Recording Proxy

Call recordings are served through `/api/calls/recording?sid=...` rather than directly from Twilio. This avoids exposing Twilio credentials in the browser and handles CORS.

### Client-Side Rendering with API Fetching

Pages use client components that fetch data from API routes on mount. This was chosen over server components because:
- The dashboard auto-refreshes every 60 seconds
- Users interact with filters, sorts, and audio players
- The meeting presenter requires keyboard navigation state

## Component Architecture

```
layout.tsx (dark theme, fonts, NavBar)
├── page.tsx → <LiveNowPage />
│   └── Fetches /api/data → KPI cards + agent table + recent calls
├── calls/page.tsx → <CallsPage />
│   └── Fetches /api/calls → filterable call list + recording player
├── meeting/page.tsx → <MeetingPage />
│   └── Fetches /api/data → 6-step carousel presentation
└── race/page.tsx → <RacePage />
    └── Fetches /api/data → ring chart + daily grid + leaderboard
```

## File Organization

| Directory | Purpose |
|-----------|---------|
| `src/app/` | Next.js pages and API routes |
| `src/components/` | React UI components |
| `src/lib/` | Shared utilities, constants, data fetching |
| `src/data/` | Static data (client phone mappings) |
| `public/` | Static assets (logo, icons) |
| `scripts/` | CLI tools (environment verification) |
