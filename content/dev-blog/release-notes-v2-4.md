---
title: "Northline RP Community Portal v2.4"
date: "2026-03-05"
version: "2.4"
---

# Northline RP Community Portal v2.4

## Complete profile pass

This release unifies website profiles and Tweeter profiles into a single profile system.

### Added

- Shared community profile record for the website and Tweeter.
- Public profile showcase modules:
  - Economy
  - Inventory
  - Stats
  - Properties
  - Activity
- Opt-in controls for each gameplay showcase from the dashboard.
- Website profile page now shows only the modules the player explicitly publishes.
- Tweeter profile page now includes the same public showcase modules.
- Player directory respects public showcase settings instead of showing hidden stats by default.
- Website/social link support on profiles.
- Public profile privacy note explaining what is published by player choice.

### Privacy model

The profile itself can be public or private. If public, identity information can appear, but gameplay modules are hidden unless the player enables each one. Phone messages, staff logs, damage evidence, moderation notes, and private communications are never displayed publicly.

### Files changed

- `lib/community-data.ts`
- `lib/profile-view.ts`
- `lib/tweeter-view.ts`
- `components/ProfileSettingsForm.tsx`
- `components/ProfileShowcasePanels.tsx`
- `app/api/profile/settings/route.ts`
- `app/u/[steamId]/page.tsx`
- `app/tweeter/profile/[steamId]/page.tsx`
- `app/players/page.tsx`
- `app/globals.css`
- `docs/PRIVACY_MATRIX.md`
