---
title: "Northline RP Community Portal v2.5.3"
date: "2026-03-10"
version: "2.5.3"
---

# Northline RP Community Portal v2.5.3

## Focus
Auth/session hardening, Tweeter theme legibility, Steam profile integration, and profile/social polish.

## Fixed
- Rebuilt the missing v2.5.2 work into this package so the prior inaccessible ZIP is superseded.
- Improved Light and Twitter Blue Tweeter theme contrast.
- Made Mid-2010s and Classic Tweeter themes visually distinct.
- Fixed verified badges by rendering a consistent CSS-backed blue check instead of depending on icon-font rendering.
- Fixed the trends panel so hashtags and counts do not clip when only one tag exists.
- Removed the Tweeter `About this feed` panel.
- Hardened session handling across authenticated actions:
  - Steam login now uses shared cookie helpers.
  - Successful profile/theme saves refresh the session cookie.
  - Successful Tweeter likes refresh the session cookie.
  - Successful staff status updates refresh the session cookie.
  - Logout remains the only route that intentionally clears the Steam session.

## Added
- `View Steam Profile` button on public website profiles when the profile is not private.
- `View Steam Profile` button/link on Tweeter profiles when the profile is not private.
- Font Awesome Steam icon on Steam sign-in and Steam profile links.

## Packaging
- No `node_modules`.
- No `.next`.
- No `package-lock.json`.
- No `tsconfig.tsbuildinfo`.
