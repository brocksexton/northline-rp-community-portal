---
title: "Northline RP Community Portal v2.9.29"
date: "2026-05-05"
version: "2.9.29"
---

# Northline RP Community Portal v2.9.29

## Build hotfix

- Fixed the Ban List build error by passing the feature visibility state into each ban card.

## Discord webhook notifications

- Added secure server-side Discord webhook support using environment variables only.
- Added Status Notifier embeds when staff post a public status update.
- Added New Web Registration embeds the first time a Steam account claims/signs into a website profile.
- Registration embeds include whether that Steam account has existing server save data before website login.
- Added Admin Audit embeds for status edits/removals, maintenance settings, site feature toggles, Daily Drops changes, Tweeter account restrictions, and Tweeter filter-word changes.
- Added Discord webhook documentation in `docs/discord-webhooks.md`.
- Added webhook variable placeholders to `.env.example` without committing webhook secrets.
