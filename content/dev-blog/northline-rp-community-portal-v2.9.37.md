---
title: "Northline RP Community Portal v2.9.37"
date: "2026-05-06T20:45:00-04:00"
version: "2.9.37"
---

# v2.9.37 – Staff panel bot and bridge controls

## Added

- Added staff-panel controls for the Discord bot and server command bridge on `/staff/server`.
- Staff can start, stop, and restart both services without Remote Desktop.
- Staff can register Discord bot slash commands from the web panel.
- Added service status cards with process state, PID, log path, last updated time, recent log tail, and setup checklist.

## Under the hood

- Added web-managed process launch/stop support for the bot and bridge.
- Added dedicated log paths:
  - `NORTHLINE_BOT_LOG_PATH`
  - `NORTHLINE_SERVER_BRIDGE_LOG_PATH`
