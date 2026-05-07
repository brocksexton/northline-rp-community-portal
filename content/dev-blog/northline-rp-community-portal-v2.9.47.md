---
title: "Northline RP Community Portal v2.9.47"
date: "2026-05-07T08:35:00-04:00"
version: "2.9.47"
---

# v2.9.47 – Discord server-start notice cleanup

## Fixed

- The Discord bot no longer treats `Connected to Steam` as an unknown player joining.
- `Connected to Steam` now posts a server-started embed instead:
  - “The server has started and should appear in the server browser shortly.”
- Player join/leave notices now require a SteamID64 in the log line.

## Changed

- Removed the user-facing `Detected from server-console.log` field from Discord connection embeds.
