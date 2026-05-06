---
title: "Northline RP Community Portal v2.5.1"
date: "2026-05-06T16:42:12Z"
version: "2.5.1"
---

# Northline RP Community Portal v2.5.1

## Tweeter + profile preferences hotfix

### Fixed
- Profile/theme preference saves now include a short-lived signed profile edit token from the dashboard.
- `/api/profile/settings` can verify the active session cookie or the signed edit token, which makes saves more resilient behind Caddy/reverse-proxy cookie edge cases.
- The package is now shipped without `node_modules`, `.next`, or generated install artifacts.

### Tweeter homepage cleanup
- Removed the right-rail City Pulse panel.
- Removed the right-rail Theme Studio panel.
- Removed the read-only bridge warning text from the composer.
- Removed the extra safety explainer text below the composer.
- Clicking/focusing the “What’s happening?” composer now displays:
  > Sorry, this feature doesn't currently work on the web. Please post from within the game for now.
- Added a 6-second abort timeout to live refresh so the sync pill does not stay stuck indefinitely if the feed read stalls.

### Notes
- Web posting remains intentionally disabled until a signed game bridge exists.
- Website likes are still safe and web-side only.
