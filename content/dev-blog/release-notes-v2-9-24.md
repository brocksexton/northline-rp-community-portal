---
title: "Northline RP Community Portal v2.9.24"
date: "2026-05-06T20:50:38Z"
version: "2.9.24"
---

# Northline RP Community Portal v2.9.24

## Server status refresh and staff diagnostics

### Fixed
- Stale `server_status.json` heartbeat data no longer forces the public status page to stay offline when the server has come back up.
- Status routes are explicitly dynamic/no-store so the public page, navbar pill, and `/api/status` do not reuse stale runtime results.
- The server reachability check now tries configured query host plus local fallback hosts, useful when the website and game server run on the same Windows server and public-IP hairpin routing fails.
- Added local process fallback checks so the portal can treat the server as online/quiet when the game process is running but UDP query is blocked.

### Changed
- Removed technical query-method/source wording from the public status page.
- Public status now stays focused on simple availability, player count, CPU/RAM, and last checked information.

### Added
- Added `/staff/status` with private diagnostics for staff:
  - heartbeat freshness
  - server query attempts
  - configured and fallback hosts
  - local process match details
  - data path health
  - host CPU/RAM/web uptime
- Added status config options for `fallbackQueryHosts` and `processNames`.
