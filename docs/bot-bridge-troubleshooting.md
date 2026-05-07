# Discord bot and server bridge troubleshooting

## Bot says it started but does not appear online

Starting with v2.9.42, the staff panel waits briefly after launching the Discord bot. If the process exits immediately, the panel reports the log tail instead of only saying `Started bot.mjs`.

Check these values in `.env.local`:

```env
DISCORD_BOT_TOKEN=
DISCORD_BOT_CLIENT_ID=
NORTHLINE_BOT_API_SECRET=
NORTHLINE_BOT_API_BASE_URL=https://your-site-url
```

The bot now loads `.env` and `.env.local` directly from the project root when started outside Next.js.

## ERR_MODULE_NOT_FOUND for scripts/shared/load-env.mjs

That means an older package was installed or the `scripts/shared` folder was not copied. v2.9.42 includes:

```text
scripts/shared/load-env.mjs
```

Copy the entire package into `C:\Servers\web`, not only the changed files.

## Privileged Gateway intents

The bot now starts with safe Gateway intents by default. If you want guild member/message intents, enable them in the Discord Developer Portal and add:

```env
NORTHLINE_BOT_ENABLE_PRIVILEGED_INTENTS=true
```
