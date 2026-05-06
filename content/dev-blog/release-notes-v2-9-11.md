---
title: "Northline RP Community Portal v2.9.11"
date: "2026-04-18"
version: "2.9.11"
---

# Northline RP Community Portal v2.9.11

## Tweeter social polish

- Fixed the homepage `Who to follow` layout so avatars, names, handles, and Follow buttons no longer collapse or overlap in light/Twitter Blue layouts.
- Rebuilt the Tweeter Messages page into a fuller Twitter-style DM inbox with search, suggested citizens, richer empty states, conversation starters, sticky headers, and a more usable two-pane layout.
- Added server-identity gating: Steam accounts with an unknown join date are treated as not yet linked to the game server. Likes, follows, profile customization, and DMs now show a clear `join the game server first` lock state instead of silently allowing broken actions.
- Added API-side enforcement for likes, follows, and DMs so locked website actions cannot be bypassed by direct requests.
- Improved light/Twitter Blue contrast for locked states, DM bubbles, DM search, and follow buttons.

## Validation

- A full `npm run typecheck` still cannot complete in this uploaded zip because dependencies are not installed (`next`, `react`, and Node/React type packages are missing from `node_modules`).
- Ran a TypeScript transpile syntax check against all changed Tweeter components, pages, API routes, and helper modules.
