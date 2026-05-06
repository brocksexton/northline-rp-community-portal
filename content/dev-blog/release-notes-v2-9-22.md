---
title: "Northline RP Community Portal v2.9.22"
date: "2026-05-06T20:12:58Z"
version: "2.9.22"
---

# Northline RP Community Portal v2.9.22

## Server status query hotfix

- Fixed the TypeScript build error in `lib/ape-data.ts` caused by an impossible narrowed status comparison.
- Added a direct UDP Source/S&Box server query fallback for `203.0.113.10:27015`.
- When `server_status.json` is unavailable or not decisive, the portal now checks the game server query port directly.
- If the query times out or fails, the portal treats the game server as offline instead of showing a misleading `0 online` state.
- Added environment overrides for server query host, port, and timeout.
- Updated status API notes and status page source wording for direct server query checks.
