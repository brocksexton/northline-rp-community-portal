# Discord Bot Manager

v2.9.77 adds a staff-facing Discord Bot Manager at `/staff/discord`.

## What staff can do

- View bot/guild connection status.
- See available text, announcement, and forum channels.
- See visible roles and a small member sample.
- Build Discord embed panels from guided presets.
- Preview the embed before sending it.
- Send the panel to a Discord channel from the website.
- Add/remove member roles when the bot has permission.
- Apply a simple member timeout when the bot has permission.

The page is designed for staff who do not want to memorize Discord slash commands. It intentionally uses guided controls and preview cards.

## Required environment

```env
DISCORD_BOT_TOKEN=
NORTHLINE_DISCORD_GUILD_ID=1317692038229131376
```

The website uses the bot token server-side only. It is never sent to the browser.

## Recommended bot permissions

For viewing server information:

- View Channels

For sending panels:

- Send Messages
- Embed Links
- Attach Files, optional if you use images
- Mention Roles, optional if you use role pings

For member/role tools:

- Manage Roles
- Moderate Members

The bot can only assign roles lower than its highest role in the Discord role hierarchy.

## Staff access model

- Staff can open the manager if they can access the staff panel.
- Sending panels requires website admin/site configuration access.
- Member role and timeout actions require moderation access.
- Ape Tavern badge-only accounts do not gain access from this feature.
