---
title: "Northline RP Community Portal v2.9.48"
date: "2026-05-07T09:10:00-04:00"
version: "2.9.48"
---

# v2.9.48 – Discord avatar embeds and death tracking

## Added

- Discord join/leave embeds now try to include the player's Steam avatar.
- Join/leave embeds have a little more Northline-style presentation without adding noisy user-facing debug fields.
- Added Discord death/fatality notice tracking.
- Death notices can detect:
  - who died
  - how they died
  - whether another player was involved
- Death events are appended to a JSONL file for later analysis.

## New environment settings

```env
NORTHLINE_BOT_STEAM_PROFILE_CACHE_MS=900000
NORTHLINE_BOT_DEATH_NOTICES=false
NORTHLINE_BOT_DEATH_CHANNEL_ID=
NORTHLINE_BOT_DEATH_LOG_PATH=C:\Servers\northline-data\server-console.log
NORTHLINE_BOT_DEATH_POLL_MS=2000
NORTHLINE_BOT_DEATH_DEDUPE_MS=45000
NORTHLINE_BOT_DEATH_INCLUDE_STEAMID=true
NORTHLINE_BOT_DEATH_EVENTS_PATH=C:\Servers\northline-data\death-events.jsonl
```

## Notes

- Steam avatars require `STEAM_API_KEY`.
- Death parsing is intentionally defensive and focuses on lines that include SteamID64 values.
