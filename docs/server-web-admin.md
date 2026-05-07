# Staff Server Administration

The staff server control room lives at `/staff/server`.

## What it does

- Shows current console output by tailing a real log file.
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

## Console output and why it may not change

The website cannot attach to an already-open Windows CMD console window. It can only read a file. Your original `Run-NorthboundRP.bat` writes to its own visible console window, so the web panel has nothing to tail unless output is redirected to a log file.

This version fixes that for web-started launches: when you click **Start server** or **Restart** from `/staff/server`, the website runs your configured start script through a web-managed wrapper and redirects output to:

```env
NORTHLINE_SERVER_CONSOLE_LOG_PATH=C:\Servers\northline-data\server-console.log
```

You can override that path:

```env
NORTHLINE_SERVER_CONSOLE_LOG_PATH=C:\Servers\northline-data\server-console.log
```

Important behavior:

- If the server was started manually from `Run-NorthboundRP.bat`, the website still cannot see that existing console output.
- Use **Kill server**, then **Start server** from `/staff/server` once to begin web-managed log capture.
- The panel now shows console hook diagnostics so you can see which log paths exist, whether they are readable, when they last changed, and why the console box is empty.

## Command bridge

The website does not run arbitrary console text. It only generates sanitized command strings for known actions.

Kick, ban, and broadcast commands require a console bridge if you want them to execute immediately in-game. If no bridge is configured, they are saved to the local command queue so a bridge can forward them later. Server power actions do not require a command bridge because they run the configured local batch scripts directly.

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

The default power-control scripts match the Northline Windows server layout. `Run-NorthboundRP.bat` should be the game-server launcher that starts `sbox-server.exe`; `update_sbox.bat` should run SteamCMD/update work.

Defaults:

```env
NORTHLINE_START_SERVER_SCRIPT=C:\Servers\Scripts\Run-NorthboundRP.bat
NORTHLINE_UPDATE_SERVER_SCRIPT=C:\Servers\Scripts\update_sbox.bat
NORTHLINE_SERVER_PROCESS_NAMES=sbox.exe,sbox-server.exe,sboxserver.exe
```

Only Developer/server-settings staff can use start, kill, restart, and update actions.
