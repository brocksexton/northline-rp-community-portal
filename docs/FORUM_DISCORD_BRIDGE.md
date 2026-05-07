# Northline Forum + Discord Bridge

v2.9.69 includes the website forum, account-linking flow, and bot-side Discord Forum import/export bridge.

## Website routes

- `/forum` — public forum board and thread composer.
- `/forum/thread/[threadId]` — thread view and replies.
- `/dashboard` — Discord link panel with a five-minute link key.

## Required environment variables

```env
DISCORD_BOT_TOKEN=your_bot_token
NORTHLINE_BOT_API_SECRET=long_shared_secret_for_bot_to_site_calls
NORTHLINE_DISCORD_GUILD_ID=1317692038229131376
NORTHLINE_DISCORD_FORUM_CHANNEL_ID=1501987950492258414
NORTHLINE_DISCORD_LINKED_ROLE_ID=role_to_grant_after_link
NORTHLINE_BOT_FORUM_SYNC_ENABLED=true
NORTHLINE_BOT_FORUM_IMPORT_UNLINKED=false
NORTHLINE_BOT_FORUM_SYNC_LOG=true
```


## Required Discord bot intents for forum sync

For Discord → website imports, the bot must receive `messageCreate` events inside the Discord Forum thread channels. In the Discord Developer Portal for your bot, enable:

- Server Members Intent, if you want the bot to grant the linked role.
- Message Content Intent, required so the bot can read forum post/reply text and import it to the website.

The packaged bot automatically requests `GuildMessages` and `MessageContent` when `NORTHLINE_DISCORD_FORUM_CHANNEL_ID` is set and `NORTHLINE_BOT_FORUM_SYNC_ENABLED` is not `false`. After changing intents, restart the bot.

## Bot link command

The packaged Discord bot now registers a top-level `/link` slash command. After deploying this build, run `npm run bot:register` again and restart the bot.

When a user runs `/link code:NL-ABC12345`, the bot calls:

```http
POST /api/bot/discord-link
Authorization: Bearer NORTHLINE_BOT_API_SECRET
Content-Type: application/json

{
  "code": "NL-ABC12345",
  "discordUserId": "123456789012345678",
  "discordUsername": "username"
}
```

The endpoint consumes the code, stores the SteamID64 ↔ Discord user mapping, and grants `NORTHLINE_DISCORD_LINKED_ROLE_ID` if configured.

## Discord to website sync

The packaged bot now listens for Discord `messageCreate` events in `NORTHLINE_DISCORD_FORUM_CHANNEL_ID` forum threads. For a Discord-created forum post, it imports the starter as a website thread. For later Discord replies, it imports them as website replies under the mapped thread. Bot-authored mirror messages are ignored to prevent loops.

If you are writing your own bot bridge, call:

```http
POST /api/bot/forum/threads
Authorization: Bearer NORTHLINE_BOT_API_SECRET
Content-Type: application/json

{
  "discordThreadId": "thread_id",
  "discordStarterMessageId": "message_id",
  "discordUserId": "author_id",
  "discordUsername": "author_name",
  "title": "Thread title",
  "body": "Opening post body",
  "categoryId": "general"
}
```

When a Discord reply is posted, call:

```http
POST /api/bot/forum/posts
Authorization: Bearer NORTHLINE_BOT_API_SECRET
Content-Type: application/json

{
  "discordThreadId": "thread_id",
  "discordMessageId": "message_id",
  "discordUserId": "author_id",
  "discordUsername": "author_name",
  "body": "Reply body"
}
```

By default, the website imports posts only when the Discord user has linked their website account. Keep `NORTHLINE_BOT_FORUM_IMPORT_UNLINKED=false` unless you intentionally want unlinked Discord posts imported with fallback attribution.

## Website to Discord sync

When a signed-in website user creates a forum thread, the website attempts to create a Discord forum post in `NORTHLINE_DISCORD_FORUM_CHANNEL_ID` using `DISCORD_BOT_TOKEN`. Replies are mirrored into the matching Discord thread once a Discord thread ID exists.

The website stores source IDs so the bot should skip messages authored by itself to avoid sync loops.


## If `/link` does not appear in Discord

1. Confirm the bot has the `applications.commands` OAuth2 scope in the server.
2. Confirm `.env.local` has `DISCORD_BOT_CLIENT_ID`, `DISCORD_BOT_TOKEN`, and usually `DISCORD_BOT_GUILD_ID` set.
3. Run `npm run bot:register` after deploying this build.
4. Restart the bot with `npm run bot:start`.
5. If registering global commands instead of guild commands, Discord may take time to display them. Guild registration is immediate.

The `/link` command is defined in `scripts/discord-bot/commands.mjs` and handled in `scripts/discord-bot/bot.mjs`.


## Troubleshooting Discord → website imports

If Discord replies do not appear on the website:

1. Confirm the bot process is running after deploying this build.
2. Confirm `NORTHLINE_DISCORD_FORUM_CHANNEL_ID=1501987950492258414` is set in the bot environment.
3. Confirm `NORTHLINE_BOT_API_BASE_URL` points to the live website, for example `https://northline.lol`.
4. Confirm `NORTHLINE_BOT_API_SECRET` exactly matches the website `.env.local` value.
5. Enable Message Content Intent in the Discord Developer Portal, then restart the bot.
6. Link the Discord user with `/link code:<code>` before posting, unless `NORTHLINE_BOT_FORUM_IMPORT_UNLINKED=true` is intentionally enabled.
7. Watch the bot console for `[northline-discord-bot] Imported Discord forum reply ...` or warning logs.

## v2.9.70 forum polish notes

Website-created forum threads and replies now mirror into Discord as embeds instead of large plain-text messages. The embed includes the website author, avatar when available, thread link, and message body.

Discord custom emotes such as `<:name:id>` and `<a:name:id>` render on the website thread page when Discord messages are imported. Image attachment URLs also render as inline forum attachments.

The website forum has its own lightweight reaction system. These reactions are stored on the website and are intentionally not synced to Discord reactions because Discord reactions cannot be controlled reliably from mirrored website posts.
