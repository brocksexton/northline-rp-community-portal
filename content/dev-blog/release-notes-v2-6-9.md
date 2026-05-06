---
title: "Northline RP Community Portal v2.6.9"
date: "2026-05-06T16:42:12Z"
version: "2.6.9"
---

# Northline RP Community Portal v2.6.9

## Auth stability hotfix

This release fixes the likely cause of users appearing to sign in and then immediately losing their session.

### Fixed

- Logout is now POST-only.
- `GET /api/auth/logout` no longer clears cookies.
- The header logout control is now a normal POST form instead of a Next `<Link>`.
- Steam sign-in links are normal `<a>` links instead of Next navigation links.
- Auth-sensitive responses now include stronger `private/no-store` and `Vary: Cookie` headers.
- Added/updated `docs/AUTH_TROUBLESHOOTING.md` with Cloudflare/Caddy verification steps.

### Why this matters

A GET logout URL can be triggered unintentionally by prefetching, previews, browser helpers, crawlers, or CDN probes. That can make the user look like they are “half signed in” and then suddenly signed out.

### Unchanged

- No visual Tweeter changes.
- No gameplay data behavior changes.
