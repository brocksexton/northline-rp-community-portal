# Staff Server Administration

The staff server control room lives at `/staff/server`.

## What it does

- Shows current console output by reading a configured log file.
- Lists currently connected players from the portal's connection-log state.
- Opens a player moderation menu with SteamID already supplied.
- Sends safe web commands for:
  - `kick <steamid> "reason"`
  - `ban <steamid> <minutes>m "reason"`
  - `say "message"`
- Provides restricted server power controls:
  - start server
  - kill configured server process names
  - restart server
  - run update script
- Logs web actions to Discord when `DISCORD_WEBHOOK_WEB_ACTION` is set.
- Watches in-game admin logs for new kick/ban actions and logs them to Discord when `DISCORD_WEBHOOK_GAME_ACTION` is set.

## Secure environment variables

Never put webhook URLs in source files or `NEXT_PUBLIC_*` variables. Put them in `.env.local` or the Windows service/process environment.

```env
DISCORD_WEBHOOK_WEB_ACTION=
DISCORD_WEBHOOK_GAME_ACTION=
```

## Console output

Set the log path that the panel should tail:

```env
NORTHLINE_SERVER_CONSOLE_LOG_PATH=C:\Servers\sbox\logs\console.log
```

If this is not configured, the page still works, but it will show that console output is unavailable.

## Command bridge

The website does not run arbitrary console text. It only generates sanitized command strings for known actions.

For direct delivery, provide a server-side script that accepts the full command string as its first argument:

```env
NORTHLINE_CONSOLE_COMMAND_SCRIPT=C:\Servers\Scripts\Send-SboxCommand.bat
```

If no command bridge script is configured, commands are appended to:

```env
NORTHLINE_SERVER_COMMAND_QUEUE_PATH=C:\Servers\northline-data\server-command-queue.jsonl
```

A separate local bridge can consume that queue and forward commands to the game server console.

## Power controls

Defaults:

```env
NORTHLINE_START_SERVER_SCRIPT=C:\Servers\Scripts\Run-NorthboundRP.bat
NORTHLINE_UPDATE_SERVER_SCRIPT=C:\Servers\Scripts\update_sbox.bat
NORTHLINE_SERVER_PROCESS_NAMES=sbox.exe,sbox-server.exe,sboxserver.exe
```

Only Developer/server-settings staff can use start, kill, restart, and update actions.
