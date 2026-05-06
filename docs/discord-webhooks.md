# Discord webhook notifications

Northline can post selected website events into Discord through server-side webhook environment variables. Webhook URLs are never sent to the browser and should not be committed into source files.

## Environment variables

Add these to `.env.local` on the Windows server, then rebuild/restart the website:

```env
DISCORD_WEBHOOK_STATUS_NOTIFIER=
DISCORD_WEBHOOK_NEW_REGISTRATION=
DISCORD_WEBHOOK_ADMIN_AUDIT=
```

Use the Discord webhook URLs from your private Discord channel settings. The site validates that each URL is HTTPS and points at Discord's `/api/webhooks/` path before sending.

## Events

- `DISCORD_WEBHOOK_STATUS_NOTIFIER`: posts an embed when staff create a public status update.
- `DISCORD_WEBHOOK_NEW_REGISTRATION`: posts an embed the first time a Steam account claims/signs into a website profile, including whether the player has prior server data.
- `DISCORD_WEBHOOK_ADMIN_AUDIT`: posts staff-side audit embeds for moderation/admin actions such as status edits/removals, maintenance settings, feature visibility, Daily Drops configuration, Tweeter account restrictions, and Tweeter filtered-word changes.

## Security notes

- Do not place webhook URLs in `NEXT_PUBLIC_*` variables.
- Do not paste webhook URLs into client components.
- Rotate a Discord webhook if it was accidentally posted publicly.
- Webhook delivery failures are caught and logged; they should not block staff actions or logins.
