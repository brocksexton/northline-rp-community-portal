---
title: "Northline RP Community Portal v2.9.34"
date: "2026-05-06T23:59:11Z"
version: "2.9.34"
---

# Northline RP Community Portal v2.9.34

## Server console diagnostics and web-managed capture

- Added console hook diagnostics to `/staff/server` so staff can see which log file paths are checked, whether they exist, their size, and their last modified time.
- Added a clearer explanation when console output is not changing: the website cannot attach to an already-open Windows CMD window and must tail a log file.
- Added a default console log target: `C:\Servers\northline-data\server-console.log`.
- Updated web Start/Restart actions to launch the configured server script through a web-managed wrapper that redirects output to the console log.
- Added clearer warnings when kick, ban, or broadcast actions are only queued because no command bridge is configured.
- Updated `docs/server-web-admin.md` and `.env.example` with the logging behavior and setup notes.
