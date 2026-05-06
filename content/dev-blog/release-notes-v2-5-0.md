---
title: "Northline RP Community Portal v2.5.0"
date: "2026-05-06T16:42:12Z"
version: "2.5.0"
---

# Northline RP Community Portal v2.5.0

## Tweeter theme support

This release adds per-user Tweeter theme customization.

### Added
- Per-user Tweeter layout era setting:
  - Modern
  - Mid-2010s
  - Classic
- Per-user Tweeter color mode setting:
  - Dark
  - Light
  - Twitter Blue
- New Tweeter theme controls in Dashboard -> Profile Settings
- Tweeter layout wrapper that reads and applies the signed-in user's saved Tweeter preferences
- More Twitter-like navigation and icon styling using Font Awesome CDN
- Theme Studio panel inside Tweeter linking back to dashboard settings
- Legacy-style top navigation for Retro and Classic Tweeter themes
- Compatibility-safe defaults for users who do not yet have Tweeter preferences saved

### Updated
- Community profile data model now stores `tweeterTheme` and `tweeterMode`
- Profile settings API now accepts and persists Tweeter theme preferences
- Tweeter feed UI refreshed for stronger Twitter-inspired styling
- Version bumped to `2.5.0`

### Notes
- Tweeter still remains read-only for posting/replying/reposting until your secure game bridge is implemented.
- Likes continue to work from the website.
- Font Awesome is loaded from CDN in the site layout for Tweeter icon styling.
