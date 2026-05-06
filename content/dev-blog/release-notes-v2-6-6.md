---
title: "Northline RP Community Portal v2.6.6"
date: "2026-05-06T16:42:12Z"
version: "2.6.6"
---

# Northline RP Community Portal v2.6.6

## Players page rebuild

This release completely changes `/players` from a raw player-save directory into an opt-in citizen board.

### Changed
- Rebuilt `/players` around public, claimed profiles instead of every saved character.
- Private profiles are excluded entirely.
- Unclaimed saves are not listed as individual cards.
- Added search, role filtering, and sort options.
- Added scalable pagination with “Show more citizens.”
- Added clearer directory stats:
  - listed citizens
  - unique saves
  - private profiles
  - unclaimed saves
  - online now
- Added a signed-in nudge when your own profile is private or not listed.
- Added privacy-first language explaining what is not exposed.
- Replaced dense gameplay-stat cards with smaller identity/profile cards.

### Untouched
- Tweeter pages/components were not modified.
