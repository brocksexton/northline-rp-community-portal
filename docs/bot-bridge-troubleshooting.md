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


## Bridge starts, but the game server exits immediately

Starting with v2.9.44, the server bridge no longer shuts itself down just because the game server process exits. It stays online, logs the exit code, and includes a tail of `NORTHLINE_SERVER_CONSOLE_LOG_PATH` so staff can see the real server-side error.

If you see `Server process exited. code=1`, check the console tail directly below that line. Common causes are:

- the server is already running manually, so the bridge-launched copy cannot bind to the same port;
- the Windows account running the website cannot access the S&box server folder;
- `sbox-server.exe` is missing, locked, or exits because SteamCMD/server files need repair;
- the configured start script path is wrong or quoted incorrectly in `.env.local`.

Use an unquoted path:

```env
NORTHLINE_START_SERVER_SCRIPT=C:\Servers\Scripts\Run-NorthboundRP.bat
NORTHLINE_BRIDGE_EXIT_WITH_SERVER=false
```

For the bridge to send commands into the live server, the game server must be launched by the bridge. A server that was started manually in a separate CMD window cannot be attached after the fact.
