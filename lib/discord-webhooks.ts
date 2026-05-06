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
