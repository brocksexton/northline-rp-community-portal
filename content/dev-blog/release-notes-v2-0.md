---
title: "Northline RP Community Portal v2.0"
date: "2026-05-06T16:42:12Z"
version: "2.0"
---

# Northline RP Community Portal v2.0

This release rebuilds the community site as a professional Northline RP city portal.

## Major changes

- Public brand standardized to **Northline RP**.
- Gamemode described as **Northbound RP / ApeTavern / aperp**.
- Domain standardized to `northline.lol`.
- Dependencies are pinned instead of using `latest`.
- Home page rebuilt around server pulse, city stats, Tweeter preview, moderation preview, and deployment context.
- Dashboard rebuilt around player save data, guide progress, property layouts, phone summary, and privacy settings.
- Public profiles rebuilt with privacy-safe presentation.
- Added public player directory.
- Added guide, rules, support, and staff pages.
- Status page expanded with data path health, host metrics, recent population events, and staff notices.
- Staff page is read-only by design until an audited in-game bridge exists.
- Added docs for roadmap and privacy matrix.

## Validation

- TypeScript validation passed with `npm run typecheck` in the build environment.
- A full `next build` was attempted in the container, but the sandboxed Next build process timed out while compiling. The project is structured for the normal Windows production flow: `npm install`, `npm run build`, then `npm run start`.
