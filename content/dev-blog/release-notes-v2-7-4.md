---
title: "v2.7.4 - Ban detail context"
date: "2026-03-26"
version: "2.7.4"
---

# v2.7.4 - Ban detail context

Focused polish for the public ban list.

## Changed

- Removed the explanatory subtext from the Ban List hero for a cleaner top section.
- Retitled the list section to "Moderation records" and added a small hint that records can be opened for more context.
- Added a "View record" action on each ban row.

## Added

- New dedicated ban detail pages at `/bans/[banId]`.
- Per-player moderation context on each ban detail page:
  - prior bans
  - prior warnings
  - prior kicks
  - total visible bans, warnings, kicks, and mutes
  - active ban count
  - recent moderation timeline
- Flexible parsing for moderation context from:
  - ban records / blacklist
  - admin logs
  - warnings export, when available
  - mutes export, when available

## Tone / presentation

The detail page frames this as context and transparency, not a "wall of shame." It is public-facing, but avoids antagonistic language.
