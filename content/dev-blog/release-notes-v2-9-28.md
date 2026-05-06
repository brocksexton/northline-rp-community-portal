---
title: "Northline RP Community Portal v2.9.28"
date: "2026-05-06T22:08:10Z"
version: "2.9.28"
---

# Northline RP Community Portal v2.9.28

## Staff dashboard feature controls
- Added a Website Visibility dashboard to the staff panel.
- Developer accounts can enable or hide public sections: Status, Tweeter, Players, Leaderboards, Daily Drops, Guides, Rules, Bans, Support, and the future Shop.
- Header navigation, footer links, account shortcuts, homepage feature cards, support links, dashboard shortcuts, and guarded direct pages now honor these switches.
- The Shop flag is disabled by default, so public visitors see no shop navigation or support messaging until staff enables it.

## Daily Drops studio
- Added a Daily Drops dashboard to the staff panel.
- Developer accounts can add, duplicate, remove, hide, retire, and activate daily case definitions.
- Case metadata, cadence hours, accent styling, reward labels, descriptions, icon classes, kinds, rarities, weights, cash values, item IDs, and reward visibility can be edited from the dashboard.
- Public case claiming and opening now read the persisted daily drop config instead of a fixed hard-coded reward pool.

## Route protection
- Disabled public sections return a not-found page on direct route access.
- Daily Drops, Tweeter, Tweets, Bans, and Leaderboards API calls return disabled responses when their public sections are hidden.

## Storage
- Website visibility saves to `.northline-data/site-features.json`.
- Daily drop definitions save to `.northline-data/daily-cases-config.json`.
- Existing claimed-case inventory remains in `.northline-data/daily-cases-store.json`.
