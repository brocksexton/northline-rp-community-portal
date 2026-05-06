---
title: "Northline RP Community Portal v2.9.23"
date: "2026-04-30"
version: "2.9.23"
---

# Northline RP Community Portal v2.9.23

## Status and metrics overhaul

- Rebuilt `/status` into a cleaner operational dashboard with smaller, contained typography so labels like `Offline` no longer overflow their cards.
- Added a concise metrics section for CPU load, RAM usage, website uptime, and status query source.
- Reduced noisy status data and grouped the page into four useful areas: current server state, server metrics, quick facts, and recent activity/notices.
- Hid stale online-player lists while the server is offline so the page does not imply people are connected when the query says the server is unreachable.
- Updated the navbar server pill to show `Offline` or `Checking` when the runtime status is not online, instead of displaying `0 online` for an offline server.

## Files changed

- `app/status/page.tsx`
- `app/globals.css`
- `components/Header.tsx`
- `components/HeaderNavClient.tsx`
- `lib/host-metrics.ts`
- `package.json`
