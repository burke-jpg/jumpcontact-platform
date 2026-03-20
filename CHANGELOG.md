# Changelog

All notable changes to JumpContact Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-20

### Added

- **Live Now Dashboard** — Real-time KPIs with auto-refresh: conversions, calls answered, missed calls, average speed, agent rankings
- **Call Log** — Searchable call history with inline recording playback, agent/direction filters, CSV export, and bulk download
- **Meeting Presenter** — 6-step carousel for daily standups (Calls, Talk Time, Speed, Conversions, MTD Race, Slack Post)
- **MTD Race** — Month-to-date sales leaderboard with ring chart, daily heatmap grid, and projected totals
- **API Routes** — Dashboard data aggregation, call log retrieval, and Twilio recording proxy
- **Backend Health Checker** — `verify-env` script to validate API connections
- **Slack Morning Report** — One-click copy of pre-formatted standup reports
- **Speed Grading System** — Automatic A+ through C grading based on answer times
- **Timezone Handling** — MST/MDT-aware date processing for Vercel deployment
