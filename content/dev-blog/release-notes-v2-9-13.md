---
title: "Northline RP Community Portal v2.9.13"
date: "2026-05-06T18:21:48Z"
version: "2.9.13"
---

# Northline RP Community Portal v2.9.13

Tweeter administration and error-page pass.

## Tweeter themed errors

- Added Tweeter-specific 404 and runtime error pages.
- Added a `/tweeter/[...missing]` catch-all so missing Tweeter routes keep the Tweeter look and still pass through maintenance-mode handling.
- Hardened the root 404 page so maintenance and Tweeter maintenance can still render even when a missing route reaches the global not-found page.

## Tweeter account administration

- Added `/staff/tweeter` for Tweeter account controls.
- Added `/api/staff/tweeter/accounts` for viewing and saving website-only Tweeter moderation records.
- Developer accounts can hide profiles, soft-ban website actions, fully ban Tweeter accounts, clear restrictions, add reasons/notes, and set optional expiries.
- Staff with `ViewLogs` can open the page in read-only mode.

## Profile and action restrictions

- Added website moderation notices on Tweeter profiles.
- Added active in-game ban notices on Tweeter profiles.
- Hidden and full-banned profiles are removed from Tweeter feed discovery and public profile views.
- Soft-banned users remain visible but lose website social actions: likes, follows, messages, and profile editing.
- Full-banned or hidden users cannot receive follows or DMs.
- Active in-game bans now pause Tweeter social actions and remove affected accounts from follow suggestions.

## Follow list polish

- Added defensive layout overrides for compact `Who to follow` rows so usernames, handles, and buttons cannot collapse into each other.
