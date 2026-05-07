---
title: "Northline RP Community Portal v2.9.42"
date: "2026-05-07T01:50:00-04:00"
version: "2.9.42"
---

# v2.9.42 – Discord bot startup and bridge hotfix

## Fixed

- Added the missing `scripts/shared/load-env.mjs` helper used by the Discord bot and server bridge.
- The Discord bot, command registration script, and server bridge now load `.env` and `.env.local` when run outside Next.js.
- Staff-panel bot/bridge startup now checks whether the launched process is still alive shortly after start.
- If the bot exits immediately, the staff panel now reports recent log output instead of only saying the process started.
- The Discord bot now uses safe Gateway intents by default so missing privileged intent configuration does not prevent it from coming online.

## Added

- Added a visible version marker to the main site footer and Tweeter footer.
- Added bot/bridge troubleshooting notes.
