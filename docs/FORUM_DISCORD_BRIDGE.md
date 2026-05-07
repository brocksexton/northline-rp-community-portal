# Northline Forum + Discord Bridge

v2.9.67 adds a website forum and the server-side bridge points needed for a Discord bot.

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
```

## Bot link command

When a user runs `/link NL-ABC12345`, have the bot call:

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

When a Discord forum starter is created, call:

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

The website imports posts only when the Discord user has linked their website account.

## Website to Discord sync

When a signed-in website user creates a forum thread, the website attempts to create a Discord forum post in `NORTHLINE_DISCORD_FORUM_CHANNEL_ID` using `DISCORD_BOT_TOKEN`. Replies are mirrored into the matching Discord thread once a Discord thread ID exists.

The website stores source IDs so the bot should skip messages authored by itself to avoid sync loops.
