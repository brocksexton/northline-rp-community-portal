---
title: "Northline RP Community Portal v2.9.32"
date: "2026-05-06T23:15:10Z"
version: "2.9.32"
---

# Northline RP Community Portal v2.9.32

## Staff server administration

- Added a staff-only server control room at `/staff/server`.
- Added live console-output viewing from a configured server log path.
- Added connected-player list with a player moderation popup.
- Added safe kick and ban command generation with SteamID prefilled from the selected player.
- Added quick broadcast support through the same server command bridge.
- Added server power actions for start, kill, restart, and update.
- Wired start/update defaults to `C:\Servers\Scripts\Run-NorthboundRP.bat` and `C:\Servers\Scripts\update_sbox.bat`.
- Added secure server-side Discord webhook support for web-originated server actions and in-game kick/ban action detection.
- Added a local command queue fallback when no direct console command bridge script is configured.
- Added `docs/server-web-admin.md` with setup details.
