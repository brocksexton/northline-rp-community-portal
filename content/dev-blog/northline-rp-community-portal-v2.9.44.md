---
title: "Northline RP Community Portal v2.9.44"
date: "2026-05-06T22:45:00-04:00"
version: "2.9.44"
---

# v2.9.44 – Server bridge resilience and diagnostics

## Fixed

- The server command bridge no longer exits just because the S&box server process exits immediately.
- Queued moderation/broadcast commands are no longer consumed while the bridge does not own a live server stdin.
- Added clearer bridge logs for Windows launch mode, server exit code, and console-log tail after a server exit.

## Added

- `NORTHLINE_BRIDGE_EXIT_WITH_SERVER=false` as the safer default behavior.
- Optional retry settings for bridge-managed server launch attempts.
- Additional troubleshooting documentation for bridge startup failures.

## Notes

If the bridge starts but the game server exits with code `1`, the bridge will stay online and show the most recent console output so the real S&box-side failure is visible from the staff panel.
