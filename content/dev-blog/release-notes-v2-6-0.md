---
title: "Northline RP Community Portal v2.6.0"
date: "2026-05-06T16:42:12Z"
version: "2.6.0"
---

# Northline RP Community Portal v2.6.0

## Main website visual refresh

This release gives the non-Tweeter Northline website a cleaner, calmer presentation while keeping Tweeter as its own themed experience.

### Homepage
- Rebuilt the homepage around a simpler hero, shortcut grid, and compact live snapshot.
- Reduced the busy multi-card layout from earlier builds.
- Added signed-in personalization:
  - signed-out users see a Steam connect / city status hero,
  - signed-in users see a welcome-back hero with dashboard, profile, Tweeter, and Steam-aware identity details.
- Moved server/player stats into quieter supporting cards instead of dominating the page.
- Kept public-safe moderation, economy, status, and Tweeter previews, but made them less visually noisy.

### Header
- Header now reacts to signed-in users with an avatar/name/role pill linking to the dashboard.
- Steam sign-in remains prominent for guests.
- Main navigation label changed from `Feed` to `Tweeter` for clarity.
- Desktop nav styling was softened into a rounded app-navigation shell.

### Styling
- Added a main-site design refresh layer in `app/globals.css`.
- Added root CSS aliases so older shared classes using `--tw-text` / `--tw-muted` render correctly outside Tweeter.
- Reduced background grid intensity and made the main site feel more like a polished community portal.

### Notes
- Tweeter-specific styling and theme logic remain intact.
- This package does not include `node_modules`, `.next`, `package-lock.json`, or TypeScript build info.
