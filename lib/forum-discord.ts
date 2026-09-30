import type { ForumPost, ForumThread } from '@/lib/forum-data';
import { setForumPostDiscordId, setForumThreadDiscordIds } from '@/lib/forum-data';

function configured(value: string | undefined): string | null {
  const raw = String(value ?? '').trim();
  return raw || null;
}

function botToken() {
  return configured(process.env.DISCORD_BOT_TOKEN);
}

// No built-in fallbacks: forum mirroring and linked roles stay off until these are configured.
export function discordGuildId() {
  return configured(process.env.NORTHLINE_DISCORD_GUILD_ID) ?? configured(process.env.DISCORD_GUILD_ID);
}

export function discordForumChannelId() {
  return configured(process.env.NORTHLINE_DISCORD_FORUM_CHANNEL_ID);
}

function linkedRoleId() {
  return configured(process.env.NORTHLINE_DISCORD_LINKED_ROLE_ID);
}

function embedColor() {
  const raw = String(process.env.NORTHLINE_BOT_EMBED_COLOR ?? '#1d9bf0').replace(/^#/, '');
  const parsed = Number.parseInt(raw, 16);
  return Number.isFinite(parsed) ? parsed : 0x1d9bf0;
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

function clean(value: unknown, max = 1800) {
  const raw = String(value ?? '').trim();
  return raw.length > max ? `${raw.slice(0, max - 1).trim()}…` : raw;
}

function authorLabel(author: { displayName: string; steamId: string | null }) {
  return `${author.displayName}${author.steamId ? ` · SteamID64 ${author.steamId}` : ''}`;
}

function forumEmbed(thread: ForumThread, post: ForumPost, mode: 'thread' | 'reply') {
  const url = siteUrl(`/forum/thread/${thread.id}`);
  return {
    color: embedColor(),
    title: mode === 'thread' ? `${thread.title} · Northline RP` : `Reply in ${thread.title}`,
    url,
    description: clean(post.body, 1800) || 'No body supplied.',
    author: {
      name: authorLabel(post.author),
      icon_url: post.author.avatarUrl || undefined,
    },
    fields: [
      { name: 'Source', value: 'Northline website forum', inline: true },
      { name: 'Open thread', value: `[View on Northline RP](${url})`, inline: true },
    ],
    footer: { text: mode === 'thread' ? 'Northline RP forum thread' : 'Northline RP forum reply' },
    timestamp: post.createdAt,
  };
}

export async function mirrorWebsiteThreadToDiscord(thread: ForumThread, starter: ForumPost): Promise<void> {
  if (thread.source === 'discord' || thread.discordThreadId) return;
  const channelId = discordForumChannelId();
  if (!channelId) return;
  const body = {
    name: thread.title.slice(0, 100),
    message: {
      content: `🧵 New Northline forum thread from ${starter.author.displayName}`,
      embeds: [forumEmbed(thread, starter, 'thread')],
      allowed_mentions: { parse: [] },
    },
  };
  const data = await discordRequest(`/channels/${channelId}/threads`, { method: 'POST', body: JSON.stringify(body) }) as { id?: string; message?: { id?: string } } | null;
  if (data?.id) await setForumThreadDiscordIds(thread.id, data.id, data.message?.id ?? null);
}

export async function mirrorWebsitePostToDiscord(thread: ForumThread, post: ForumPost): Promise<void> {
  if (post.source === 'discord' || !thread.discordThreadId) return;
  const data = await discordRequest(`/channels/${thread.discordThreadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      content: `💬 New Northline forum reply from ${post.author.displayName}`,
      embeds: [forumEmbed(thread, post, 'reply')],
      allowed_mentions: { parse: [] },
    }),
  }) as { id?: string } | null;
  if (data?.id) await setForumPostDiscordId(post.id, data.id);
}

export async function deleteDiscordForumMessage(channelId: string | null | undefined, messageId: string | null | undefined): Promise<boolean> {
  const cleanChannelId = String(channelId ?? '').trim();
  const cleanMessageId = String(messageId ?? '').trim();
  if (!cleanChannelId || !cleanMessageId) return false;
  const response = await discordRequest(`/channels/${cleanChannelId}/messages/${cleanMessageId}`, { method: 'DELETE' });
  return response !== null;
}

export async function deleteDiscordForumThread(threadId: string | null | undefined): Promise<boolean> {
  const cleanThreadId = String(threadId ?? '').trim();
  if (!cleanThreadId) return false;
  const response = await discordRequest(`/channels/${cleanThreadId}`, { method: 'DELETE' });
  return response !== null;
}

export async function assignLinkedForumRole(discordUserId: string): Promise<boolean> {
  const guildId = discordGuildId();
  const roleId = linkedRoleId();
  if (!guildId || !roleId) return false;
  const result = await discordRequest(`/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`, { method: 'PUT', body: '' });
  return result !== null;
}
