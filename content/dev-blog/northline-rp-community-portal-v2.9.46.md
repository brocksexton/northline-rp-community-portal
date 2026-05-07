---
title: "Northline RP Community Portal v2.9.46"
date: "2026-05-07T04:00:00-04:00"
version: "2.9.46"
---

# v2.9.46 – Discord join and leave notices

## Added

- Discord bot can now watch the server console log and post embeds to a configured channel when players join or leave.
- Supports lines like `07:52:35 Generic  Brock [76561198033862837] is connecting`.
- Added settings for channel ID, log path, polling interval, SteamID visibility, dedupe timing, and Tweeter profile links.

## Notes

- The watcher starts at the end of the log when the bot starts, so it will not spam old connection events.
- Restart the Discord bot after changing connection notice settings.
