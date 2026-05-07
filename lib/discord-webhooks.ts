import type { StatusUpdate } from '@/lib/community-data';
import { getSiteConfig } from '@/lib/site-config';

type DiscordEmbedField = {
  name: string;
  value: string;
  inline?: boolean;
};

type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  image?: { url: string };
  thumbnail?: { url: string };
  author?: { name: string; icon_url?: string; url?: string };
  footer?: { text: string };
  fields?: DiscordEmbedField[];
};

type WebhookPayload = {
  username?: string;
  avatar_url?: string;
  content?: string;
  embeds?: DiscordEmbed[];
};

type Actor = {
  steamId?: string | null;
  name?: string | null;
};

type AuditInput = {
  action: string;
  actor?: Actor;
  target?: string | null;
  detail?: string | null;
  fields?: DiscordEmbedField[];
  severity?: 'info' | 'success' | 'warning' | 'danger';
  url?: string | null;
};

const DISCORD_GREEN = 0x22c55e;
const DISCORD_BLUE = 0x1d9bf0;
const DISCORD_PURPLE = 0x7c3aed;
const DISCORD_GOLD = 0xf59e0b;
const DISCORD_RED = 0xef4444;

function configured(value: string | undefined): string | null {
  const raw = String(value ?? '').trim();
  return raw || null;
}

function webhookUrl(kind: 'status' | 'registration' | 'audit' | 'webAction' | 'gameAction'): string | null {
  switch (kind) {
    case 'status': return configured(process.env.DISCORD_WEBHOOK_STATUS_NOTIFIER ?? process.env.DISCORD_WEBHOOK_STATUS);
    case 'registration': return configured(process.env.DISCORD_WEBHOOK_NEW_REGISTRATION ?? process.env.DISCORD_WEBHOOK_REGISTRATION);
    case 'audit': return configured(process.env.DISCORD_WEBHOOK_ADMIN_AUDIT ?? process.env.DISCORD_WEBHOOK_AUDIT);
    case 'webAction': return configured(process.env.DISCORD_WEBHOOK_WEB_ACTION ?? process.env.DISCORD_WEBHOOK_SERVER_WEB_ACTION);
    case 'gameAction': return configured(process.env.DISCORD_WEBHOOK_GAME_ACTION ?? process.env.DISCORD_WEBHOOK_SERVER_GAME_ACTION);
    default: return null;
  }
}

function isAllowedDiscordWebhook(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowedHost = parsed.hostname === 'discord.com' || parsed.hostname === 'discordapp.com';
    return parsed.protocol === 'https:' && allowedHost && parsed.pathname.startsWith('/api/webhooks/');
  } catch {
    return false;
  }
}

function clean(value: unknown, max = 1024): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
}

function field(name: string, value: unknown, inline = false): DiscordEmbedField {
  return {
    name: clean(name, 256) || 'Detail',
    value: clean(value, 1024) || '—',
    inline,
  };
}

function colorForSeverity(severity: AuditInput['severity']) {
  if (severity === 'success') return DISCORD_GREEN;
  if (severity === 'warning') return DISCORD_GOLD;
  if (severity === 'danger') return DISCORD_RED;
  return DISCORD_PURPLE;
}

function absoluteUrl(base: string, path: string) {
  try {
    return new URL(path, base).toString();
  } catch {
    return path;
  }
}

async function siteBaseUrl() {
  const config = await getSiteConfig();
  return configured(process.env.SITE_URL) ?? configured(process.env.NEXT_PUBLIC_SITE_URL) ?? config.brand.siteUrl;
}

async function commonVisuals() {
  const config = await getSiteConfig();
  return {
    name: config.brand.name,
    imageUrl: config.brand.embedImageUrl,
  };
}

async function postDiscordWebhook(kind: 'status' | 'registration' | 'audit' | 'webAction' | 'gameAction', payload: WebhookPayload): Promise<void> {
  const url = webhookUrl(kind);
  if (!url) return;
  if (!isAllowedDiscordWebhook(url)) {
    console.warn(`[discord-webhooks] Refusing invalid ${kind} webhook URL.`);
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.warn(`[discord-webhooks] ${kind} webhook failed with ${response.status}.`);
    }
  } catch (error) {
    console.warn(`[discord-webhooks] ${kind} webhook delivery failed.`, error);
  }
}


function discordBotToken(): string | null {
  return configured(process.env.DISCORD_BOT_TOKEN);
}

function liveFeedChannelId(): string | null {
  return configured(process.env.NORTHLINE_BOT_CONNECTION_CHANNEL_ID);
}

function deathFeedChannelId(): string | null {
  return configured(process.env.NORTHLINE_BOT_DEATH_CHANNEL_ID) ?? liveFeedChannelId();
}

function safeDiscordChannelId(value: string | null): string | null {
  const raw = String(value ?? '').trim();
  return /^\d{15,25}$/.test(raw) ? raw : null;
}

async function postDiscordBotChannel(channelId: string | null, payload: WebhookPayload): Promise<void> {
  const token = discordBotToken();
  const safeChannel = safeDiscordChannelId(channelId);
  if (!token || !safeChannel) return;

  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${safeChannel}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.warn(`[discord-webhooks] Discord bot channel message failed with ${response.status}.`);
    }
  } catch (error) {
    console.warn('[discord-webhooks] Discord bot channel delivery failed.', error);
  }
}

function actorDisplayName(actor?: Actor | null): string {
  const widened = actor as (Actor & { displayName?: string }) | null | undefined;
  return clean(widened?.name ?? widened?.displayName ?? widened?.steamId ?? 'Staff', 80);
}

async function steamSummary(steamId?: string | null): Promise<{ name?: string; avatar?: string; profileUrl?: string } | null> {
  const id = String(steamId ?? '').trim();
  const key = configured(process.env.STEAM_API_KEY);
  if (!/^\d{15,20}$/.test(id) || !key) return id ? { profileUrl: `https://steamcommunity.com/profiles/${id}` } : null;

  try {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${encodeURIComponent(key)}&steamids=${encodeURIComponent(id)}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return { profileUrl: `https://steamcommunity.com/profiles/${id}` };
    const data = await response.json() as { response?: { players?: Array<{ personaname?: string; avatarfull?: string; avatar?: string; profileurl?: string }> } };
    const player = data.response?.players?.[0];
    return {
      name: player?.personaname,
      avatar: player?.avatarfull || player?.avatar,
      profileUrl: player?.profileurl || `https://steamcommunity.com/profiles/${id}`,
    };
  } catch {
    return { profileUrl: `https://steamcommunity.com/profiles/${id}` };
  }
}

export async function notifyLiveFeedServerControl(input: {
  action: 'kill' | 'restart';
  actor?: Actor | null;
  status?: 'sent' | 'queued' | 'failed';
}): Promise<void> {
  const action = input.action;
  const restarting = action === 'restart';
  const failed = input.status === 'failed';

  await postDiscordBotChannel(liveFeedChannelId(), {
    username: 'Northline RP Server Watch',
    embeds: [{
      title: failed ? 'Server control failed' : restarting ? '🔄 Server restarting' : '🔴 Server stopping',
      description: failed
        ? `A staff server ${action} request failed before it could complete.`
        : restarting
          ? 'The server is restarting. Players may disconnect briefly while the city comes back online.'
          : 'The server is being stopped. It may disappear from the server browser shortly.',
      color: failed ? DISCORD_RED : restarting ? DISCORD_GOLD : DISCORD_RED,
      timestamp: new Date().toISOString(),
      fields: [
        field('Requested by', actorDisplayName(input.actor), true),
        field('Action', action, true),
      ],
      footer: { text: 'Northline RP • Live city feed' },
    }],
  });
}

export async function notifyDeathEventToDiscord(input: {
  victimName?: string | null;
  victimSteamId?: string | null;
  killerName?: string | null;
  killerSteamId?: string | null;
  cause?: string | null;
  occurredAt?: string | null;
  source?: string | null;
}): Promise<void> {
  const [victimProfile, killerProfile] = await Promise.all([
    steamSummary(input.victimSteamId),
    steamSummary(input.killerSteamId),
  ]);
  const victimName = clean(victimProfile?.name ?? input.victimName ?? input.victimSteamId ?? 'Unknown player', 80);
  const killerName = clean(killerProfile?.name ?? input.killerName ?? '', 80);
  const victimUrl = victimProfile?.profileUrl || (input.victimSteamId ? `https://steamcommunity.com/profiles/${input.victimSteamId}` : null);
  const killerUrl = killerProfile?.profileUrl || (input.killerSteamId ? `https://steamcommunity.com/profiles/${input.killerSteamId}` : null);
  const involved = Boolean(killerName || input.killerSteamId);

  const fields: DiscordEmbedField[] = [
    field('Victim', victimName, true),
    field('Cause', input.cause || 'Unknown', true),
  ];
  if (involved) fields.splice(1, 0, field('Involved player', killerName || input.killerSteamId || 'Unknown', true));
  if (input.victimSteamId) fields.push(field('Victim SteamID64', `\`${input.victimSteamId}\``, true));
  if (input.killerSteamId) fields.push(field('Other SteamID64', `\`${input.killerSteamId}\``, true));
  if (victimUrl) fields.push(field('Victim profile', `[Open profile](${victimUrl})`, true));
  if (killerUrl) fields.push(field('Other profile', `[Open profile](${killerUrl})`, true));

  await postDiscordBotChannel(deathFeedChannelId(), {
    username: 'Northline RP Incident Feed',
    embeds: [{
      title: involved ? '💀 Fatal encounter' : '💀 Player death',
      description: involved
        ? `**${victimName}** was killed by **${killerName || 'another player'}**.`
        : `**${victimName}** died.`,
      color: involved ? 0xff6b6b : DISCORD_GOLD,
      timestamp: input.occurredAt || new Date().toISOString(),
      thumbnail: victimProfile?.avatar ? { url: victimProfile.avatar } : undefined,
      author: victimProfile?.avatar ? { name: victimName, icon_url: victimProfile.avatar, url: victimUrl || undefined } : undefined,
      fields,
      footer: { text: 'Northline RP • Incident feed' },
    }],
  });
}

export async function notifyStatusUpdatePosted(update: StatusUpdate, actor: Actor): Promise<void> {
  const [base, visuals] = await Promise.all([siteBaseUrl(), commonVisuals()]);
  const statusUrl = absoluteUrl(base, '/status');

  await postDiscordWebhook('status', {
    username: 'Northline Status Notifier',
    embeds: [{
      title: clean(update.title, 256),
      description: clean(update.body, 4096),
      url: statusUrl,
      color: DISCORD_BLUE,
      timestamp: update.createdAt,
      image: visuals.imageUrl ? { url: visuals.imageUrl } : undefined,
      fields: [
        field('Tone', update.tone, true),
        field('Posted by', actor.name || update.createdByName || actor.steamId || 'Staff', true),
        field('Open status page', statusUrl),
      ],
      footer: { text: `${visuals.name} status update` },
    }],
  });
}

export async function notifyNewWebRegistration(input: {
  steamId: string;
  displayName: string;
  avatarUrl?: string | null;
  hasJoinedServer: boolean;
  firstJoinedAt?: string | null;
}): Promise<void> {
  const [base, visuals] = await Promise.all([siteBaseUrl(), commonVisuals()]);
  const profileUrl = absoluteUrl(base, `/u/${encodeURIComponent(input.steamId)}`);
  const joinedText = input.hasJoinedServer
    ? `Has joined server prior to web login${input.firstJoinedAt ? ` (${new Date(input.firstJoinedAt).toLocaleString('en-US')})` : ''}`
    : 'Has not yet joined a server';

  await postDiscordWebhook('registration', {
    username: 'Northline Web Registration',
    embeds: [{
      title: `${clean(input.displayName, 180)} signed into the website`,
      description: joinedText,
      url: profileUrl,
      color: DISCORD_GREEN,
      timestamp: new Date().toISOString(),
      thumbnail: input.avatarUrl ? { url: input.avatarUrl } : undefined,
      image: visuals.imageUrl ? { url: visuals.imageUrl } : undefined,
      fields: [
        field('SteamID64', input.steamId, true),
        field('Server history', joinedText, false),
        field('Profile', profileUrl, false),
      ],
      footer: { text: `${visuals.name} website registration` },
    }],
  });
}

export async function notifyAdminAudit(input: AuditInput): Promise<void> {
  const [base, visuals] = await Promise.all([siteBaseUrl(), commonVisuals()]);
  const actorLabel = input.actor?.name || input.actor?.steamId || 'Unknown staff';
  const fields: DiscordEmbedField[] = [
    field('Actor', actorLabel, true),
    ...(input.actor?.steamId ? [field('Actor SteamID', input.actor.steamId, true)] : []),
    ...(input.target ? [field('Target', input.target, true)] : []),
    ...(input.detail ? [field('Details', input.detail)] : []),
    ...(input.fields ?? []),
  ];

  await postDiscordWebhook('audit', {
    username: 'Northline Admin Audit',
    embeds: [{
      title: clean(input.action, 256),
      description: input.detail ? undefined : 'A staff action was completed from the website.',
      url: input.url ? absoluteUrl(base, input.url) : absoluteUrl(base, '/staff'),
      color: colorForSeverity(input.severity),
      timestamp: new Date().toISOString(),
      image: visuals.imageUrl ? { url: visuals.imageUrl } : undefined,
      fields: fields.slice(0, 25),
      footer: { text: `${visuals.name} staff audit` },
    }],
  });
}

export const discordAuditField = field;


export async function notifyWebServerAction(input: {
  action: string;
  actor?: Actor;
  targetSteamId?: string | null;
  targetName?: string | null;
  reason?: string | null;
  command?: string | null;
  result?: string | null;
  status?: string | null;
  severity?: 'info' | 'success' | 'warning' | 'danger';
}): Promise<void> {
  const [base, visuals] = await Promise.all([siteBaseUrl(), commonVisuals()]);
  const actorLabel = input.actor?.name || input.actor?.steamId || 'Website staff';
  await postDiscordWebhook('webAction', {
    username: 'Northline Web Action',
    embeds: [{
      title: clean(input.action, 256),
      description: input.reason ? clean(input.reason, 2048) : 'A server action was requested from the website staff panel.',
      url: absoluteUrl(base, '/staff/server'),
      color: colorForSeverity(input.severity ?? 'warning'),
      timestamp: new Date().toISOString(),
      image: visuals.imageUrl ? { url: visuals.imageUrl } : undefined,
      fields: [
        field('Actor', actorLabel, true),
        ...(input.actor?.steamId ? [field('Actor SteamID', input.actor.steamId, true)] : []),
        ...(input.targetName || input.targetSteamId ? [field('Target', `${input.targetName || 'Unknown'}${input.targetSteamId ? ` (${input.targetSteamId})` : ''}`, true)] : []),
        ...(input.command ? [field('Command', input.command)] : []),
        ...(input.status ? [field('Status', input.status, true)] : []),
        ...(input.result ? [field('Result', input.result)] : []),
      ].slice(0, 25),
      footer: { text: `${visuals.name} web server action` },
    }],
  });
}

export async function notifyGameServerAction(input: {
  action: string;
  actor?: Actor;
  targetSteamId?: string | null;
  targetName?: string | null;
  reason?: string | null;
  occurredAt?: string | null;
  source?: string | null;
}): Promise<void> {
  const [base, visuals] = await Promise.all([siteBaseUrl(), commonVisuals()]);
  const actorLabel = input.actor?.name || input.actor?.steamId || 'In-game staff';
  await postDiscordWebhook('gameAction', {
    username: 'Northline Game Action',
    embeds: [{
      title: clean(input.action, 256),
      description: input.reason ? clean(input.reason, 2048) : 'A kick/ban action was detected from in-game administration logs.',
      url: absoluteUrl(base, '/staff/server'),
      color: /ban/i.test(input.action) ? DISCORD_RED : DISCORD_GOLD,
      timestamp: input.occurredAt || new Date().toISOString(),
      image: visuals.imageUrl ? { url: visuals.imageUrl } : undefined,
      fields: [
        field('Actor', actorLabel, true),
        ...(input.actor?.steamId ? [field('Actor SteamID', input.actor.steamId, true)] : []),
        ...(input.targetName || input.targetSteamId ? [field('Target', `${input.targetName || 'Unknown'}${input.targetSteamId ? ` (${input.targetSteamId})` : ''}`, true)] : []),
        ...(input.source ? [field('Source', input.source, true)] : []),
        ...(input.reason ? [field('Reason', input.reason)] : []),
      ].slice(0, 25),
      footer: { text: `${visuals.name} in-game moderation action` },
    }],
  });
}
