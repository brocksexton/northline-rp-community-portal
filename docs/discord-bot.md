# Northline Discord Bot

The dedicated Discord bot works alongside the website and game-server admin panel. It uses Discord slash commands, calls the website through secure server-only API routes, and keeps the existing Discord webhook audit flow intact.

## What it can do

### Northline/game commands

- `/northline status` — current game-server status, online count, fatality rate, and website link.
- `/northline players` — currently connected players from the website/server data.
- `/northline deaths` — fatality/death summary from damage logs.
- `/northline fun` — a lightweight city status/vibe check.
- `/northline broadcast message:` — sends a server broadcast command through the same command bridge/queue used by the staff web panel.
- `/northline kick steamid: reason:` — queues or sends a kick command for a SteamID64.
- `/northline ban steamid: reason: duration_minutes:` — queues or sends a ban command for a SteamID64.
- `/northline server action:` — start, kill, restart, or update the game server using the same server-control methods as `/staff/server`.

### Announcement command

- `/announce` — sends a clean Discord embed to a selected channel or the current channel.
- Optional embed fields include color, image, thumbnail, author, footer, and timestamp.

### Discord moderation command

- `/discordmod timeout`
- `/discordmod untimeout`
- `/discordmod kick`
- `/discordmod ban`
- `/discordmod purge`

Discord moderation commands rely on Discord permissions and optional Northline role ID gates.

## Required environment variables

Add these to `.env.local` on the server:

```env
DISCORD_BOT_TOKEN=
DISCORD_BOT_CLIENT_ID=
DISCORD_BOT_GUILD_ID=
NORTHLINE_BOT_API_SECRET=
NORTHLINE_BOT_API_BASE_URL=https://northline.lol
```

`NORTHLINE_BOT_API_SECRET` must be the same value for the website and the bot process. Use a long random string. The bot sends it to `/api/bot/*` routes in a server-to-server header.

## Optional role gates

```env
NORTHLINE_BOT_ADMIN_ROLE_IDS=123,456
NORTHLINE_BOT_MOD_ROLE_IDS=123,456
NORTHLINE_BOT_ANNOUNCE_ROLE_IDS=123,456
```

The bot also respects Discord permissions:

- Administrator can do all bot admin actions.
- Moderate Members can use moderation commands.
- Manage Messages can use announcements.

## Register commands

Run once after setting the token/client ID:

```powershell
npm run bot:register
```

If `DISCORD_BOT_GUILD_ID` is set, commands are registered only to that guild and appear quickly. If omitted, commands are registered globally and can take longer to appear.

## Start the bot

```powershell
npm run bot:start
```

For production, run it in its own terminal, scheduled task, NSSM service, or process manager. It should run separately from Next.js.

## Security model

- The Discord bot token is never exposed to browser code.
- The website only accepts bot API requests when `NORTHLINE_BOT_API_SECRET` matches.
- The bot does not need Steam staff cookies.
- Bot-triggered game actions still go through the same queue/command bridge as `/staff/server`.
- Bot-triggered game actions also send Discord webhooks through the existing Web Action/Admin Audit flow when configured.

## Important command bridge note

Kick, ban, and broadcast commands require one of the following to actually execute in-game:

```env
NORTHLINE_CONSOLE_COMMAND_SCRIPT=
```

or a local process that consumes:

```env
NORTHLINE_SERVER_COMMAND_QUEUE_PATH=C:\Servers\northline-data\server-command-queue.jsonl
```

Without a bridge, the bot can still queue and audit the request, but the game server will not receive the command yet.


## Gateway intents

The bot starts with safe Gateway intents by default. This avoids Discord login failures when privileged intents are not enabled in the Developer Portal.

If you explicitly enable privileged Gateway intents for the bot application, you may add:

```env
NORTHLINE_BOT_ENABLE_PRIVILEGED_INTENTS=true
```

Leave it false/blank unless you need those privileged events.


## Connection join/leave notices

The bot can tail the server console log and post an embed when it sees connection lines such as:

```text
07:52:35 Generic  Brock [76561198033862837] is connecting
```

Add these values to `.env.local`, then restart the Discord bot:

```env
NORTHLINE_BOT_CONNECTION_NOTICES=true
NORTHLINE_BOT_CONNECTION_CHANNEL_ID=your-discord-channel-id
NORTHLINE_BOT_CONNECTION_LOG_PATH=C:\Servers\northline-data\server-console.log
NORTHLINE_BOT_CONNECTION_POLL_MS=2000
NORTHLINE_BOT_CONNECTION_INCLUDE_STEAMID=true
NORTHLINE_BOT_CONNECTION_DEDUPE_MS=45000
NORTHLINE_BOT_PROFILE_BASE_URL=https://northline.lol/tweeter/profile
```

The watcher starts at the end of the log when the bot starts, so it does not replay old historical joins and leaves after each restart.


### Server-start connection watcher behavior

When connection notices are enabled, the bot treats a server log line like `Connected to Steam` as a server lifecycle event, not as a player join. It posts a concise server-started embed to the configured connection notice channel. Player join/leave notices require a SteamID64 in the log line.

### Player avatars and death notices

When connection notices are enabled, join/leave embeds now try to load the player's Steam profile summary using `STEAM_API_KEY`. If Steam returns an avatar, the bot uses it as the embed thumbnail/author image.

Death notices can be enabled separately:

```env
NORTHLINE_BOT_DEATH_NOTICES=true
NORTHLINE_BOT_DEATH_CHANNEL_ID=your-discord-channel-id
NORTHLINE_BOT_DEATH_LOG_PATH=C:\Servers\northline-data\server-console.log
NORTHLINE_BOT_DEATH_EVENTS_PATH=C:\Servers\northline-data\death-events.jsonl
```

The watcher recognizes common death lines containing SteamID64 values, including:

- `Brock [76561198033862837] died from fall damage`
- `Brock [76561198033862837] was killed by Alex [76561198000000000] with pistol`
- `Alex [76561198000000000] killed Brock [76561198033862837] with rifle`

Each detected death is posted as an embed and appended to the JSONL event history so it can be analyzed later.


### Direct death event tracking

If death events do not appear in the server console log, send them directly to the website instead:

```http
POST /api/game-events/death
x-northline-game-event-secret: <NORTHLINE_GAME_EVENT_SECRET or NORTHLINE_BOT_API_SECRET>
content-type: application/json
```

Example body:

```json
{
  "victimName": "Brock",
  "victimSteamId": "76561198033862837",
  "killerName": "Example Player",
  "killerSteamId": "76561198000000000",
  "cause": "shotgun",
  "source": "sbox-server"
}
```

The website appends the event to `NORTHLINE_BOT_DEATH_EVENTS_PATH` and posts a Discord incident embed to `NORTHLINE_BOT_DEATH_CHANNEL_ID`, falling back to `NORTHLINE_BOT_CONNECTION_CHANNEL_ID`.
