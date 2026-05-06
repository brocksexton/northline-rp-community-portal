---
title: "Northline RP Community Portal v2.6.8"
date: "2026-03-20"
version: "2.6.8"
---

# Northline RP Community Portal v2.6.8

## Focus

Polish pass for the Rules and Players pages, plus session/auth hardening for Cloudflare/Caddy deployments.

## Changed

### Players page

- Reworded the directory so it feels like a public citizen board, not an explanation of implementation details.
- Removed awkward end-user copy such as save-file/dump wording.
- Fixed citizen card layering so avatars sit cleanly above the banner.
- Improved card spacing, hover polish, and empty-bio handling.
- Kept the privacy behavior: private profiles and unclaimed saves do not appear.

### Rules page

- Improved contrast on cards and rule sections.
- Strengthened readability for scenario answers, accordion content, and dark website styles.
- Preserved the interactive handbook direction.

### Auth/session

- Added a secure `__Host-northline_steam_session` cookie when running on HTTPS.
- Kept legacy session cookie fallback for existing sessions.
- Added global no-store middleware to prevent Cloudflare/browser caching stale signed-in/signed-out HTML.
- Added CDN/Cloudflare no-store headers to API responses.
- Trimmed accidental whitespace from `SESSION_SECRET` before signing cookies.
- Added `/api/auth/session` for quick auth diagnostics.
- Added `docs/AUTH_TROUBLESHOOTING.md`.

## Not changed

- Tweeter pages/components were not modified.
