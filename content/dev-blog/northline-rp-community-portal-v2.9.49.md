---
title: "Northline RP Community Portal v2.9.49"
date: "2026-05-07T12:35:00-04:00"
version: "2.9.49"
---

# v2.9.49 – Discord live-feed polish and control notices

## Changed

- Removed the extra `Status` field from player join embeds.
- Server **kill** and **restart** staff-panel actions now post user-facing live-feed messages to the same channel used for join/leave/server-start notices.

## Added

- Added `/api/game-events/death` so death tracking can work even when deaths are not written to the server console.
- Direct death events are appended to the configured death events JSONL file and can post incident embeds to Discord.
