---
title: "Northline RP Community Portal v2.9.35"
date: "2026-05-07T00:15:00.000Z"
version: "2.9.35"
---

# Northline RP Community Portal v2.9.35

## Dedicated Discord bot

- Added a standalone Discord bot powered by `discord.js`.
- Added slash command registration script.
- Added `/northline` command group for server status, players, deaths, city vibe checks, broadcasts, game kick/ban commands, and server power actions.
- Added `/announce` for polished Discord embeds with optional channel, color, author, timestamp, image, thumbnail, and footer.
- Added `/discordmod` for Discord-side timeout, untimeout, kick, ban, and purge moderation commands.
- Added secure bot-only website API routes under `/api/bot/*` protected by `NORTHLINE_BOT_API_SECRET`.
- Bot-triggered game actions reuse the website server-admin queue/command bridge and existing webhook audit flow.
- Added `docs/discord-bot.md` and new bot environment examples.
