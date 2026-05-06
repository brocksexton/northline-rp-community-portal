---
title: "Northline RP Community Portal v2.9.26"
date: "2026-05-06T21:15:08Z"
version: "2.9.26"
---

# Northline RP Community Portal v2.9.26

## Staff status studio

- Added a staff-facing Status Studio on `/staff/status` for public server notices.
- Staff can create, edit, delete, color, and tone public status updates without manually editing files.
- Notices continue to appear on the public status page and homepage noticeboard.

## Metrics history

- Added a staff-only metric history panel with page-style tabs for RAM, CPU, query latency, and bandwidth.
- RAM and CPU graphs are constrained to 0–100% where applicable.
- Query latency samples are captured from the live server query diagnostics when available.
- Bandwidth graph page is scaffolded for future network-counter samples while keeping the UI ready.

## Status sampling

- Status API and staff diagnostics now capture metric samples after the live server runtime check so latency can be stored with the same sample history.
