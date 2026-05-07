---
title: "Northline RP Community Portal v2.9.36"
date: "2026-05-06T20:15:00-04:00"
version: "2.9.36"
---

# v2.9.36 – Bot secret and command bridge

## Added

- Added the built-in server command bridge so website and Discord bot actions can reach the live S&box server console.
- Added `npm run server:bridge`.
- Added `scripts/server-bridge/Run-Northline-Server-Bridge.bat`.
- Added queue consumption from `NORTHLINE_SERVER_COMMAND_QUEUE_PATH`.
- Added console log capture through `NORTHLINE_SERVER_CONSOLE_LOG_PATH`.

## Configuration

- `NORTHLINE_BOT_API_SECRET` secures bot-to-website API calls.
- `NORTHLINE_SERVER_COMMAND_QUEUE_PATH` controls where queued commands are written.
- `NORTHLINE_START_SERVER_SCRIPT` tells the bridge how to start the game server.
- `NORTHLINE_BRIDGE_SKIP_EXISTING_QUEUE_ON_FIRST_RUN` prevents old queued commands from firing on first launch.

## Notes

- The bridge should own the game server process when kick, ban, and broadcast commands need to be sent into stdin.
