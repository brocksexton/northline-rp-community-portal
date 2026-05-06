---
title: "Northline RP Community Portal v2.6.2"
date: "2026-03-14"
version: "2.6.2"
---

# Northline RP Community Portal v2.6.2

## Main website control-center pass

Tweeter routes/components were left untouched. This release focuses on the main Northline website.

### Added
- Per-user main website style preference:
  - Civic Clean
  - Control Center
  - Northline Glass
- Website style selector in Dashboard -> Profile settings.
- Signed-in layout support for applying the selected website style across the main site.

### Changed
- Reworked `/status` into a simpler public control center with player count, clear service state, staff notices, and community-friendly summary cards.
- Removed public exposure of low-level host details from `/status` such as process RAM, disk utilization, data path, and machine uptime.
- Rebuilt `/staff` into a more legible staff-only control center with cleaner panels and better contrast.
- Restored the older, stronger Ban List visual direction while keeping the current data model and no additional package dependencies.
- Improved main-site color variables, light/dark/glass contrast, header legibility, cards, panels, and preference controls.

### Notes
- No files under `app/tweeter` were modified.
- `components/TweeterClient.tsx` and `components/TweeterLikeButton.tsx` were not modified.
- This package intentionally excludes `node_modules`, `.next`, `package-lock.json`, and TypeScript build cache files.
