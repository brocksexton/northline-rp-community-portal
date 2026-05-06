---
title: "Northline RP Community Portal v2.9.20"
date: "2026-05-06T19:39:44Z"
version: "2.9.20"
---

# Northline RP Community Portal v2.9.20

## Rich link embeds

- Added a reusable metadata helper for Discord, Open Graph, Twitter/X, and browser previews.
- Added a configurable `brand.embedImageUrl` setting in `config/site.config.json`.
- Added the provided Northline banner URL as the default large preview image.
- Added large-card embeds for public site pages:
  - Home
  - Tweeter
  - Tweeter posts
  - Tweeter profiles
  - Players
  - Rules
  - Server Status
  - Guides
  - Support
  - Ban List
  - Ban detail pages
  - Cases
  - Leaderboards
  - Privacy Policy
  - Terms and Conditions
- Dynamic Tweeter post embeds now use the post author and body preview.
- Dynamic Tweeter profile embeds now use the citizen display name, handle, and post count.
- Dynamic ban record embeds now include the player name and public reason preview.
- Added canonical URLs, large preview image metadata, and theme-color metadata across these embeds.

## Notes

- The banner is referenced from the configured URL. For long-term reliability, download the banner into `public/` and set `brand.embedImageUrl` to a local path such as `/northline-banner.jpg`.
