---
title: "Northline RP Community Portal v2.6.3"
date: "2026-05-06T16:42:12Z"
version: "2.6.3"
---

# Northline RP Community Portal v2.6.3

## Homepage rebuild: community edition

This release rebuilds the main homepage around a more playful, homegrown community feel.

### Added
- New community-focused homepage hero.
- Signed-in hero state with a personal citizen snapshot.
- Aggregate city stats:
  - unique citizens,
  - total deaths,
  - damage events,
  - Tweeter posts,
  - saved property layouts,
  - aggregate city funds.
- Death/chaos board powered by server damage logs:
  - dehydration deaths,
  - hunger deaths,
  - firearm deaths,
  - fist/melee deaths,
  - fall damage deaths,
  - self/world/mystery deaths.
- Personal signed-in facts:
  - role,
  - time in city,
  - level,
  - personal death count,
  - guide completion.
- More useful quick links for new and returning users.
- Friendlier community noticeboard and Tweeter preview.

### Data safety
- Death and damage stats are aggregate/fun community metrics.
- Sensitive data such as phone messages, staff notes, private logs, and hidden profile modules remain private.

### Notes
- Tweeter pages/components were not modified in this pass.
- This package excludes `node_modules`, `.next`, `package-lock.json`, and TypeScript build cache files.
