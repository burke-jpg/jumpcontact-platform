<p align="center">
  <img src="public/logo.png" alt="JumpContact" width="120" />
</p>

<h1 align="center">JumpContact Platform</h1>

<p align="center">
  <strong>Real-time call center operations dashboard</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Overview

JumpContact Platform is an internal operations dashboard for monitoring call center performance in real time. It aggregates data from **Twilio** (call logs, recordings, worker stats) and **Google Sheets** (conversions, missed calls, speed metrics) into a unified interface built for daily standups, team reviews, and live monitoring.

## Features

- **Live Dashboard** — Real-time KPIs with 60-second auto-refresh: conversions, calls answered, missed calls, average speed-to-answer, and agent rankings
- **Call Log** — Searchable call history with inline recording playback, agent/direction filters, CSV export, and bulk recording download
- **Meeting Presenter** — 6-step carousel for daily standups covering calls, talk time, speed grades, conversions, MTD race, and a Slack-ready morning report
- **MTD Race** — Month-to-date sales leaderboard with ring chart visualization, daily conversion heatmap grid, and projected end-of-month totals
- **Speed Grading** — Automatic grading system (A+ through C) based on agent answer times
- **Slack Integration** — One-click copy of pre-formatted morning reports for Slack distribution

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | TypeScript 5 |
| **UI** | React 19, Tailwind CSS 4, Lucide Icons |
| **Data Sources** | Twilio API, Google Sheets API |
| **Deployment** | Vercel |

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** 9+
- A **Twilio** account with call recording enabled
- A **Google Cloud** service account with Sheets API access

### Installation

```bash
# Clone the repository
git clone https://github.com/burke-jpg/jumpcontact-platform.git
cd jumpcontact-platform

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Google Sheets API
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Twilio API
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WORKSPACE_SID=WSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Development

```bash
# Start development server (port 3003)
npm run dev

# Verify backend connections
npm run verify

# Lint the codebase
npm run lint

# Production build
npm run build
```

The app will be available at [http://localhost:3003](http://localhost:3003).

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── calls/          # Call log & recording proxy endpoints
│   │   └── data/           # Main dashboard data aggregation
│   ├── calls/              # Call Log page
│   ├── meeting/            # Meeting Presenter page
│   ├── race/               # MTD Race page
│   └── page.tsx            # Live Now (home)
├── components/
│   ├── LiveNowPage.tsx     # Real-time KPI dashboard
│   ├── CallsPage.tsx       # Call log with recording player
│   ├── MeetingPage.tsx     # 6-step standup carousel
│   ├── RacePage.tsx        # MTD sales race visualization
│   ├── NavBar.tsx          # Top navigation
│   └── Card.tsx            # Reusable glass-morphism card
├── data/
│   └── clients.json        # Phone number → client name mapping
└── lib/
    ├── constants.ts        # Colors, agents, grading, helpers
    └── getDashboard.ts     # Data aggregation layer
```

### API Routes

| Endpoint | Description |
|----------|-------------|
| `GET /api/data` | Returns complete dashboard data (today, yesterday, weekend) |
| `GET /api/calls?date=YYYY-MM-DD` | Call logs for a specific date with recording metadata |
| `GET /api/calls/recording?sid=...` | Proxied Twilio recording stream (MP3) |

### Data Flow

```
Google Sheets ──┐
                ├──▶ /api/data ──▶ Dashboard Components
Twilio API ─────┘
```

## Deployment

The platform is designed for **Vercel** deployment:

1. Connect your GitHub repository to Vercel
2. Add environment variables in the Vercel dashboard
3. Deploy — the app builds and deploys automatically on push

For more details, see the [Deployment Guide](docs/deployment.md).

## Documentation

- [Architecture Overview](docs/architecture.md)
- [API Reference](docs/api.md)
- [Deployment Guide](docs/deployment.md)

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ☕ by the JumpContact team
</p>
