import type { ForumPost, ForumThread } from '@/lib/forum-data';
import { setForumThreadDiscordIds } from '@/lib/forum-data';

function configured(value: string | undefined): string | null {
  const raw = String(value ?? '').trim();
  return raw || null;
}

function botToken() {
  return configured(process.env.DISCORD_BOT_TOKEN);
}

export function discordGuildId() {
  return configured(process.env.NORTHLINE_DISCORD_GUILD_ID) ?? '1317692038229131376';
}

export function discordForumChannelId() {
  return configured(process.env.NORTHLINE_DISCORD_FORUM_CHANNEL_ID) ?? '1501987950492258414';
}

function linkedRoleId() {
  return configured(process.env.NORTHLINE_DISCORD_LINKED_ROLE_ID);
}

async function discordRequest(path: string, init: RequestInit) {
  const token = botToken();
  if (!token) return null;
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    console.warn(`[forum-discord] ${path} failed with ${response.status}: ${await response.text().catch(() => '')}`);
    return null;
  }
  return response.json().catch(() => ({}));
}

function siteUrl(path: string) {
  const base = configured(process.env.SITE_URL) ?? configured(process.env.NEXT_PUBLIC_SITE_URL) ?? 'http://localhost:3000';
  try { return new URL(path, base).toString(); } catch { return path; }
}

function authorLine(author: { displayName: string; steamId: string | null }) {
  return `**${author.displayName}**${author.steamId ? ` · SteamID64 ${author.steamId}` : ''}`;
}

export async function mirrorWebsiteThreadToDiscord(thread: ForumThread, starter: ForumPost): Promise<void> {
  if (thread.source === 'discord' || thread.discordThreadId) return;
  const channelId = discordForumChannelId();
  const body = {
    name: thread.title.slice(0, 100),
    message: {
      content: `${authorLine(thread.author)} started a forum thread on Northline RP.\n${siteUrl(`/forum/thread/${thread.id}`)}\n\n${starter.body.slice(0, 1800)}`,
      allowed_mentions: { parse: [] },
    },
  };
  const data = await discordRequest(`/channels/${channelId}/threads`, { method: 'POST', body: JSON.stringify(body) }) as { id?: string; message?: { id?: string } } | null;
  if (data?.id) await setForumThreadDiscordIds(thread.id, data.id, data.message?.id ?? null);
}

export async function mirrorWebsitePostToDiscord(thread: ForumThread, post: ForumPost): Promise<void> {
  if (post.source === 'discord' || !thread.discordThreadId) return;
  await discordRequest(`/channels/${thread.discordThreadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      content: `${authorLine(post.author)} replied from the Northline website.\n${siteUrl(`/forum/thread/${thread.id}`)}\n\n${post.body.slice(0, 1800)}`,
      allowed_mentions: { parse: [] },
    }),
  });
}

export async function assignLinkedForumRole(discordUserId: string): Promise<boolean> {
  const guildId = discordGuildId();
  const roleId = linkedRoleId();
  if (!roleId) return false;
  const result = await discordRequest(`/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`, { method: 'PUT', body: '' });
  return result !== null;
}
