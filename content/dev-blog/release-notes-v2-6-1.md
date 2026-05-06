---
title: "Northline RP Community Portal v2.6.1"
date: "2026-03-13"
version: "2.6.1"
---

# Northline RP Community Portal v2.6.1

## Main-site styling merge

Base: `v2.6.0-main-site-refresh`.

Reference researched: `northline-rp-community-suite-v1.0.1-depsfix`.

### Important
- Tweeter was intentionally left untouched.
- No files under `app/tweeter` were modified.
- No Tweeter-specific CSS selectors were changed.

### Added / changed
- Restored the older build's premium operations styling language on the main website.
- Refreshed the main site background from dark/noisy to a cleaner light civic-ops look.
- Updated cards, buttons, header, homepage hero, homepage shortcut cards, and general panels to better match the stronger old-build visual identity.
- Rebuilt `/status` into a more polished operations dashboard:
  - dark Northline Ops hero
  - population status card
  - overview metric cards
  - staff notices as operation banners
  - host telemetry tiles
  - RAM trend chart area
  - data path / uptime detail cards
  - recent connection list
- Kept all current profile/auth/dashboard/Tweeter code from the latest base.

### Clean package
The ZIP excludes:
- `node_modules`
- `.next`
- `package-lock.json`
- `tsconfig.tsbuildinfo`
