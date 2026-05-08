export type DiscordGuildSummary = {
  configured: boolean;
  guildId: string | null;
  botUser: { id: string; username: string; avatarUrl: string | null } | null;
  guild: { id: string; name: string; iconUrl: string | null; approximateMemberCount: number | null; approximatePresenceCount: number | null } | null;
  channels: DiscordChannelOption[];
  roles: DiscordRoleOption[];
  members: DiscordMemberOption[];
  errors: string[];
};

export type DiscordChannelOption = {
  id: string;
  name: string;
  type: number;
  label: string;
  parentId: string | null;
};

export type DiscordRoleOption = {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
};

export type DiscordMemberOption = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  roles: string[];
};

export type DiscordEmbedDraft = {
  channelId: string;
  title: string;
  description: string;
  color?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  authorName?: string;
  footer?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  pingRoleId?: string;
};

function token() {
  return (process.env.DISCORD_BOT_TOKEN || '').trim();
}

export function discordGuildId() {
  return (process.env.NORTHLINE_DISCORD_GUILD_ID || process.env.DISCORD_GUILD_ID || '').trim();
}

function apiBase() {
  return 'https://discord.com/api/v10';
}

function cleanText(value: unknown, max = 1000) {
  const text = String(value ?? '').trim();
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
}

function parseColor(value: unknown) {
  const raw = String(value ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return Number.parseInt(raw, 16);
  return 0x1d9bf0;
}

function botHeaders() {
  const botToken = token();
  if (!botToken) throw new Error('DISCORD_BOT_TOKEN is not configured.');
  return {
    Authorization: `Bot ${botToken}`,
    'Content-Type': 'application/json',
  };
}

async function discordFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      ...botHeaders(),
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.message ? `: ${data.message}` : '';
    throw new Error(`Discord API ${response.status}${detail}`);
  }
  return data;
}

function iconUrl(guildId: string, icon: string | null | undefined) {
  return guildId && icon ? `https://cdn.discordapp.com/icons/${guildId}/${icon}.png?size=128` : null;
}

function avatarUrl(user: any) {
  if (!user?.id || !user?.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}

function channelLabel(channel: any) {
  const prefix = channel.type === 15 ? 'Forum' : channel.type === 5 ? 'Announcement' : channel.type === 0 ? 'Text' : 'Channel';
  return `${prefix} · #${channel.name}`;
}

function isSendableChannel(channel: any) {
  return [0, 5, 15].includes(Number(channel.type));
}

export async function getDiscordGuildSummary(): Promise<DiscordGuildSummary> {
  const guildId = discordGuildId();
  const configured = Boolean(token() && guildId);
  const empty: DiscordGuildSummary = { configured, guildId: guildId || null, botUser: null, guild: null, channels: [], roles: [], members: [], errors: [] };
  if (!configured) {
    return { ...empty, errors: ['Set DISCORD_BOT_TOKEN and NORTHLINE_DISCORD_GUILD_ID to enable Discord management.'] };
  }

  const errors: string[] = [];
  const [botUser, guild, channels, roles, members] = await Promise.all([
    discordFetch('/users/@me').catch((error) => { errors.push(`Bot user: ${error.message}`); return null; }),
    discordFetch(`/guilds/${guildId}?with_counts=true`).catch((error) => { errors.push(`Guild: ${error.message}`); return null; }),
    discordFetch(`/guilds/${guildId}/channels`).catch((error) => { errors.push(`Channels: ${error.message}`); return []; }),
    discordFetch(`/guilds/${guildId}/roles`).catch((error) => { errors.push(`Roles: ${error.message}`); return []; }),
    discordFetch(`/guilds/${guildId}/members?limit=50`).catch((error) => { errors.push(`Members: ${error.message}`); return []; }),
  ]);

  const channelOptions = Array.isArray(channels)
    ? channels.filter(isSendableChannel).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((channel) => ({
      id: String(channel.id),
      name: String(channel.name || 'channel'),
      type: Number(channel.type),
      label: channelLabel(channel),
      parentId: channel.parent_id ? String(channel.parent_id) : null,
    }))
    : [];

  const roleOptions = Array.isArray(roles)
    ? roles.filter((role) => role.name !== '@everyone').sort((a, b) => (b.position ?? 0) - (a.position ?? 0)).map((role) => ({
      id: String(role.id),
      name: String(role.name || 'role'),
      color: Number(role.color || 0),
      position: Number(role.position || 0),
      managed: Boolean(role.managed),
    }))
    : [];

  const memberOptions = Array.isArray(members)
    ? members.map((member) => ({
      id: String(member.user?.id || ''),
      username: String(member.user?.username || 'Unknown'),
      displayName: String(member.nick || member.user?.global_name || member.user?.username || 'Unknown'),
      avatarUrl: avatarUrl(member.user),
      roles: Array.isArray(member.roles) ? member.roles.map(String) : [],
    })).filter((member) => member.id)
    : [];

  return {
    configured: true,
    guildId,
    botUser: botUser ? { id: String(botUser.id), username: String(botUser.username || 'Northline Bot'), avatarUrl: avatarUrl(botUser) } : null,
    guild: guild ? {
      id: String(guild.id),
      name: String(guild.name || 'Discord Server'),
      iconUrl: iconUrl(String(guild.id), guild.icon),
      approximateMemberCount: typeof guild.approximate_member_count === 'number' ? guild.approximate_member_count : null,
      approximatePresenceCount: typeof guild.approximate_presence_count === 'number' ? guild.approximate_presence_count : null,
    } : null,
    channels: channelOptions,
    roles: roleOptions,
    members: memberOptions,
    errors,
  };
}

export async function sendDiscordPanel(input: DiscordEmbedDraft) {
  const channelId = cleanText(input.channelId, 32).replace(/\D+/g, '');
  const title = cleanText(input.title, 256);
  const description = cleanText(input.description, 4000);
  if (!channelId) throw new Error('Choose a Discord destination channel.');
  if (!title || !description) throw new Error('Panel title and message are required.');

  const embed: Record<string, unknown> = {
    title,
    description,
    color: parseColor(input.color),
    timestamp: new Date().toISOString(),
    footer: { text: cleanText(input.footer, 180) || 'Northline RP' },
  };
  const imageUrl = cleanText(input.imageUrl, 500);
  const thumbnailUrl = cleanText(input.thumbnailUrl, 500);
  const authorName = cleanText(input.authorName, 180);
  if (imageUrl) embed.image = { url: imageUrl };
  if (thumbnailUrl) embed.thumbnail = { url: thumbnailUrl };
  if (authorName) embed.author = { name: authorName };

  const buttonLabel = cleanText(input.buttonLabel, 80);
  const buttonUrl = cleanText(input.buttonUrl, 500);
  const components = buttonLabel && /^https?:\/\//i.test(buttonUrl)
    ? [{ type: 1, components: [{ type: 2, style: 5, label: buttonLabel, url: buttonUrl }] }]
    : [];
  const pingRoleId = cleanText(input.pingRoleId, 32).replace(/\D+/g, '');
  const content = pingRoleId ? `<@&${pingRoleId}>` : undefined;

  const payload = { content, embeds: [embed], components, allowed_mentions: { parse: [], roles: pingRoleId ? [pingRoleId] : [] } };
  const channel = await discordFetch(`/channels/${channelId}`).catch(() => null);
  if (Number(channel?.type) === 15) {
    return discordFetch(`/channels/${channelId}/threads`, {
      method: 'POST',
      body: JSON.stringify({ name: title.slice(0, 100), message: payload }),
    });
  }
  return discordFetch(`/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDiscordMemberRole(action: 'add' | 'remove', discordUserId: string, roleId: string) {
  const guildId = discordGuildId();
  const userId = cleanText(discordUserId, 32).replace(/\D+/g, '');
  const targetRoleId = cleanText(roleId, 32).replace(/\D+/g, '');
  if (!guildId) throw new Error('NORTHLINE_DISCORD_GUILD_ID is not configured.');
  if (!userId || !targetRoleId) throw new Error('Discord user ID and role ID are required.');
  return discordFetch(`/guilds/${guildId}/members/${userId}/roles/${targetRoleId}`, { method: action === 'add' ? 'PUT' : 'DELETE' });
}

export async function timeoutDiscordMember(discordUserId: string, minutes: number, reason: string) {
  const guildId = discordGuildId();
  const userId = cleanText(discordUserId, 32).replace(/\D+/g, '');
  if (!guildId) throw new Error('NORTHLINE_DISCORD_GUILD_ID is not configured.');
  if (!userId) throw new Error('Discord user ID is required.');
  const safeMinutes = Math.max(1, Math.min(Number(minutes || 10), 40320));
  const until = new Date(Date.now() + safeMinutes * 60_000).toISOString();
  return discordFetch(`/guilds/${guildId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ communication_disabled_until: until, reason: cleanText(reason, 300) || 'Timed out from Northline staff panel' }),
  });
}
