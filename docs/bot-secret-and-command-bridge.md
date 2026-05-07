# Bot secret and server command bridge

This project uses two different pieces for Discord/server automation:

1. `NORTHLINE_BOT_API_SECRET`, which lets the Discord bot call `/api/bot/*` securely.
2. The server command bridge, which lets queued website and bot actions reach the live S&box console.

## Generate `NORTHLINE_BOT_API_SECRET`

Run this in PowerShell on the Windows server:

```powershell
-join ((48..57 + 65..90 + 97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

Paste the generated value into `C:\Servers\web\.env.local`:

```env
NORTHLINE_BOT_API_SECRET=paste-the-generated-value-here
```

Use the same value for the website and the bot process.

## Recommended bridge configuration

```env
NORTHLINE_SERVER_CONSOLE_LOG_PATH=C:\Servers\northline-data\server-console.log
NORTHLINE_SERVER_COMMAND_QUEUE_PATH=C:\Servers\northline-data\server-command-queue.jsonl
NORTHLINE_START_SERVER_SCRIPT=C:\Servers\Scripts\Run-NorthboundRP.bat
NORTHLINE_UPDATE_SERVER_SCRIPT=C:\Servers\Scripts\update_sbox.bat
NORTHLINE_SERVER_BRIDGE_SCRIPT=C:\Servers\web\scripts\server-bridge\Run-Northline-Server-Bridge.bat
NORTHLINE_BRIDGE_SKIP_EXISTING_QUEUE_ON_FIRST_RUN=true
NORTHLINE_SERVER_BRIDGE_LOG_PATH=C:\Servers\northline-data\server-bridge.log
NORTHLINE_BOT_LOG_PATH=C:\Servers\northline-data\discord-bot.log
```

## Start the bridge

From the website folder:

```powershell
npm run server:bridge
```

Or run:

```text
C:\Servers\web\scripts\server-bridge\Run-Northline-Server-Bridge.bat
```

The staff panel at `/staff/server` can also start, stop, and restart the bridge if the website has permission to launch local processes.

## Important behavior

The bridge should start the game server when you need kick, ban, and broadcast commands to reach the live console. If the server was launched manually in a separate console, the website cannot attach to that existing console window.
