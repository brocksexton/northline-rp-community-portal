---
title: "Northline RP Community Portal v2.9.7"
date: "2026-04-14"
version: "2.9.7"
---

# Northline RP Community Portal v2.9.7

## Maintenance gate hardening

- Added a client-side maintenance access guard that re-checks access after client-side navigation.
- Added `/api/maintenance/access` so already-open Tweeter sessions cannot navigate into the main site while maintenance mode is active.
- Converted Tweeter's direct "Back to Northline" links to normal full-page anchors so the server-side maintenance page is enforced immediately.
- Keeps the existing behavior where Tweeter can remain available during main-site maintenance when that setting is enabled.

This fixes the case where a user could open Tweeter while it was allowed through maintenance mode, then use client-side navigation to view other Northline pages until refreshing.
