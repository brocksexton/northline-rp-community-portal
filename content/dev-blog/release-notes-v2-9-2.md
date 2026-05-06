---
title: "Northline RP Community Portal v2.9.2"
date: "2026-04-09"
version: "2.9.2"
---

# Northline RP Community Portal v2.9.2

## Maintenance mode

- Added a Developer-controlled maintenance mode in the Staff panel.
- Maintenance mode blocks normal page viewing and shows a polished public downtime screen.
- Developer accounts can still sign in and browse the site while maintenance is active.
- Added custom maintenance headline, message, optional countdown, accent color, Discord button toggle, and theme presets.
- Added `/api/staff/maintenance` for saving the maintenance settings.
- Maintenance settings are saved to `.northline-data/site-maintenance.json` or `NORTHLINE_DATA_PATH/site-maintenance.json`.

## Daily cases

- Added an animated case-opening sequence.
- Opening a case now plays a rolling reward reel before revealing the reward.
- Rewards are still saved safely to the website case inventory and do not write directly into game save files.
