import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';
import os from 'os';
import { getSteamProfiles } from './steam-openid';

export type ApeItem = {
  PrefabResourcePath?: string | null;
  StackCount?: number;
  ContainerSlots?: Array<ApeItem | null> | null;
  [key: string]: unknown;
};

export type PlayerSave = {
  SteamId: number | string;
  CashBalance?: number;
  BankBalance?: number;
  FirstJoinedUtc?: string;
  TotalPlaytimeSeconds?: number;
  LastKnownDisplayName?: string;
  RpDisplayName?: string;
  HotbarSlots?: Array<ApeItem | null>;
  InventorySlots?: Array<ApeItem | null>;
  EquipmentSlots?: Array<ApeItem | null> | null;
  MailboxStorageSlots?: Array<ApeItem | null> | null;
  TotalExperience?: number;
  Experience?: number;
  Level?: number;
  Hunger?: number;
  Thirst?: number;
  Health?: number;
  DisplayTitle?: string;
  OwnedTitleIds?: string[] | null;
  TrackedStats?: Record<string, number> | null;
  [key: string]: unknown;
};

export type RoleAssignment = { SteamId: number | string; RoleName: string; AssignedAt?: string };
export type RoleDefinition = { Name: string; IsDefault?: boolean; IsProtected?: boolean; Permissions?: string[]; MaxDurations?: Record<string, unknown> };

export type Tweet = {
  Id: string;
  AuthorSteamId: number | string;
  AuthorDisplayName?: string | null;
  Body: string;
  PostedAtTimeSeconds?: number;
  ReplyToId?: string;
  RetweetOfId?: string;
  RetweetOfAuthorSteamId?: number | string;
  RetweetOfAuthorDisplayName?: string | null;
  RetweetOfBody?: string | null;
  RetweetOfVerifiedKind?: string | null;
  VerifiedKind?: string;
  LikeCount?: number;
  IsReply?: boolean;
  IsRetweet?: boolean;
};

export type TweetLike = { TweetId: string; SteamId: number | string };

export type ConnectionEvent = {
  Timestamp: string;
  SteamId: number | string;
  PlayerName: string;
  IsConnection: boolean;
  SessionDurationSeconds?: number | null;
  IsFirstJoin?: boolean;
  FirstJoinedUtc?: string;
};

export type ChatLog = {
  Timestamp: string;
  SenderSteamId: number | string;
  SenderName: string;
  Type: string;
  Message: string;
  TargetSteamId?: number | string | null;
  TargetName?: string | null;
};

export type AdminLog = {
  Timestamp: string;
  AdminSteamId: number | string;
  AdminName: string;
  ActionType: string;
  Category: string;
  TargetSteamId?: number | string | null;
  TargetName?: string | null;
  Details?: string | null;
};

export type DamageLog = {
  Timestamp: string;
  VictimSteamId: number | string;
  VictimName: string;
  AttackerSteamId?: number | string | null;
  AttackerName?: string | null;
  Damage?: number;
  HealthBefore?: number;
  HealthAfter?: number;
  Cause?: string;
  IsFatal?: boolean;
};

export type PropertyLayout = {
  LayoutName: string;
  PropertyName: string;
  OwnerSteamId: number | string;
  Items?: Array<Record<string, unknown>>;
};

export type PhoneMessage = {
  FromSteamId: number | string;
  ToSteamId: number | string;
  Message: string;
  SentAt?: number;
  PropertyWaypointGuid?: string;
};

export type ServerConfig = {
  ServerName?: string;
  ServerSubtitle?: string;
  ServerDiscordUrl?: string;
  MaxPlayers?: number;
  TaxRate?: number;
  StartingCash?: number;
  StartingBank?: number;
  SalaryIntervalSeconds?: number;
  RentIntervalSeconds?: number;
  MaxMessageLength?: number;
  PropertyTaxRate?: number;
  [key: string]: unknown;
};

export type DataHealth = { dataPath: string | null; exists: boolean; warnings: string[]; checkedAt: string };
export type GuideProgress = { steamId: string; seen: string[]; completed: number; total: number; percent: number; missing: string[] };

export const GUIDE_CATALOG = [
  { id: 'first_join', title: 'First steps', category: 'Getting started', body: 'Learn the basic RP expectations, how to move through the city, and where to ask for help.' },
  { id: 'shop', title: 'Shops and economy', category: 'Economy', body: 'Understand buying, selling, packaging stations, shelves, prices, and safe business habits.' },
  { id: 'properties', title: 'Properties and layouts', category: 'Property', body: 'Save property layouts, decorate spaces, and create storefronts without losing track of your work.' },
  { id: 'police_officer', title: 'Police officer basics', category: 'Public safety', body: 'Introductory expectations for officers, escalation, evidence, and community-facing conduct.' },
  { id: 'chief_of_police', title: 'Police leadership', category: 'Public safety', body: 'Guidance for department leadership, public trust, and high-accountability roleplay.' },
  { id: 'mayor', title: 'Mayor and civic systems', category: 'Government', body: 'A practical primer for public policy RP, taxes, messaging, and city-facing leadership.' },
];

function getDataPath(): string | null {
  const configured = process.env.APE_RP_DATA_PATH?.trim();
  return configured ? configured : null;
}

function preserveSteamIds(raw: string): string {
  return raw.replace(/("(?:[A-Za-z]*SteamId|steamid)"\s*:\s*)(\d{15,20})(?=\s*[,}])/g, '$1"$2"');
}

async function readJson<T>(fileName: string, fallback: T): Promise<T> {
  const base = getDataPath();
  if (!base) return fallback;
  try {
    const raw = await readFile(path.join(base, fileName), 'utf8');
    return JSON.parse(preserveSteamIds(raw)) as T;
  } catch {
    return fallback;
  }
}

async function getJsonFiles(folderName: string): Promise<string[]> {
  const base = getDataPath();
  if (!base) return [];
  try {
    const folder = path.join(base, folderName);
    const entries = await readdir(folder);
    return entries.filter((name) => name.endsWith('.json')).map((name) => path.join(folderName, name));
  } catch {
    return [];
  }
}

export async function getDataHealth(): Promise<DataHealth> {
  const base = getDataPath();
  const warnings: string[] = [];
  if (!base) {
    warnings.push('APE_RP_DATA_PATH is not configured. Set it to the folder that contains player_save_data.json.');
    return { dataPath: null, exists: false, warnings, checkedAt: new Date().toISOString() };
  }
  try {
    const info = await stat(base);
    if (!info.isDirectory()) warnings.push('APE_RP_DATA_PATH exists but is not a folder.');
    return { dataPath: base, exists: info.isDirectory(), warnings, checkedAt: new Date().toISOString() };
  } catch {
    warnings.push('APE_RP_DATA_PATH does not exist or is not readable by the website process.');
    return { dataPath: base, exists: false, warnings, checkedAt: new Date().toISOString() };
  }
}

export async function getPlayers(): Promise<PlayerSave[]> {
  return readJson<PlayerSave[]>('player_save_data.json', []);
}

export async function getPlayersBySteamId(): Promise<Map<string, PlayerSave>> {
  const players = await getPlayers();
  return new Map(players.map((player) => [String(player.SteamId), player]));
}

export async function getPlayer(steamId: string): Promise<PlayerSave | null> {
  const players = await getPlayers();
  return players.find((player) => String(player.SteamId) === steamId) ?? null;
}

export async function getRoleAssignments(): Promise<RoleAssignment[]> {
  return readJson<RoleAssignment[]>('player_roles.json', []);
}

export async function getRoleDefinitions(): Promise<RoleDefinition[]> {
  return readJson<RoleDefinition[]>('roles.json', []);
}

export async function getRoleForSteamId(steamId: string): Promise<string> {
  const assignments = await getRoleAssignments();
  const roles = await getRoleDefinitions();
  const assigned = assignments.find((role) => String(role.SteamId) === steamId)?.RoleName;
  if (assigned) return assigned;
  return roles.find((role) => role.IsDefault)?.Name ?? 'User';
}

export async function getPermissionsForSteamId(steamId: string): Promise<string[]> {
  const [roleName, roles] = await Promise.all([getRoleForSteamId(steamId), getRoleDefinitions()]);
  return roles.find((role) => role.Name === roleName)?.Permissions ?? [];
}

export async function hasPermission(steamId: string | null, permission: string): Promise<boolean> {
  if (!steamId) return false;
  const permissions = await getPermissionsForSteamId(steamId);
  return permissions.includes(permission);
}

export async function getTweeterData(): Promise<{ Tweets: Tweet[]; Likes: TweetLike[] }> {
  const data = await readJson<{ Tweets?: Tweet[]; Likes?: TweetLike[] }>('tweeter.json', { Tweets: [], Likes: [] });
  return {
    Tweets: [...(data.Tweets ?? [])].sort((a, b) => Number(b.PostedAtTimeSeconds ?? 0) - Number(a.PostedAtTimeSeconds ?? 0)),
    Likes: data.Likes ?? [],
  };
}

export async function getTweets(): Promise<Tweet[]> {
  return (await getTweeterData()).Tweets;
}

export async function getConnectionEvents(): Promise<ConnectionEvent[]> {
  const files = await getJsonFiles('connection_logs');
  const all: ConnectionEvent[] = [];
  for (const file of files) all.push(...(await readJson<ConnectionEvent[]>(file, [])));
  return all.sort((a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());
}

export async function getRecentChatLogs(limit = 25): Promise<ChatLog[]> {
  const files = await getJsonFiles('chat_logs');
  const all: ChatLog[] = [];
  for (const file of files) all.push(...(await readJson<ChatLog[]>(file, [])));
  return all.sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime()).slice(0, limit);
}

export async function getRecentAdminLogs(limit = 25): Promise<AdminLog[]> {
  const files = await getJsonFiles('admin_logs');
  const all: AdminLog[] = [];
  for (const file of files) all.push(...(await readJson<AdminLog[]>(file, [])));
  return all.sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime()).slice(0, limit);
}

export async function getRecentDamageLogs(limit = 25): Promise<DamageLog[]> {
  const files = await getJsonFiles('damage_logs');
  const all: DamageLog[] = [];
  for (const file of files) all.push(...(await readJson<DamageLog[]>(file, [])));
  return all.sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime()).slice(0, limit);
}

export async function getPropertyLayoutsForSteamId(steamId: string): Promise<PropertyLayout[]> {
  const data = await readJson<{ Layouts?: PropertyLayout[] }>(path.join('property_layouts', `${steamId}.json`), { Layouts: [] });
  return data.Layouts ?? [];
}

export async function getAllPropertyLayouts(): Promise<PropertyLayout[]> {
  const files = await getJsonFiles('property_layouts');
  const layouts: PropertyLayout[] = [];
  for (const file of files) {
    const data = await readJson<{ Layouts?: PropertyLayout[] }>(file, { Layouts: [] });
    layouts.push(...(data.Layouts ?? []));
  }
  return layouts;
}

export async function getPhoneMessageSummary(steamId: string): Promise<{ messageCount: number; contactCount: number; unreadConversationCount: number }> {
  const data = await readJson<{ Messages?: PhoneMessage[]; ContactNames?: Record<string, string>; ReadConversationIds?: string[] }>(
    path.join('phone_messages', `${steamId}.json`),
    { Messages: [], ContactNames: {}, ReadConversationIds: [] },
  );
  return {
    messageCount: data.Messages?.length ?? 0,
    contactCount: Object.keys(data.ContactNames ?? {}).length,
    unreadConversationCount: Math.max(0, (data.Messages?.length ?? 0) - (data.ReadConversationIds?.length ?? 0)),
  };
}

export async function getServerConfig(): Promise<ServerConfig> {
  return readJson<ServerConfig>('server_config.json', {});
}

export async function getWhitelist(): Promise<{ Enabled?: boolean; SteamIds?: Array<string | number> }> {
  return readJson<{ Enabled?: boolean; SteamIds?: Array<string | number> }>('whitelist.json', { Enabled: false, SteamIds: [] });
}

export async function getWarnings(): Promise<unknown[]> {
  return readJson<unknown[]>('warnings.json', []);
}

export async function getMutes(): Promise<unknown[]> {
  return readJson<unknown[]>('mutes.json', []);
}

export async function getScheduledServerMessages(): Promise<unknown[]> {
  return readJson<unknown[]>('scheduled_server_messages.json', []);
}

export async function getGuideProgress(steamId: string): Promise<GuideProgress> {
  const data = await readJson<{ SeenGuides?: Record<string, string[]> }>('guides_seen.json', { SeenGuides: {} });
  const seen = data.SeenGuides?.[steamId] ?? [];
  const allIds = GUIDE_CATALOG.map((guide) => guide.id);
  const missing = allIds.filter((id) => !seen.includes(id));
  return {
    steamId,
    seen,
    completed: seen.length,
    total: allIds.length,
    missing,
    percent: allIds.length ? Math.round((seen.length / allIds.length) * 100) : 0,
  };
}

export async function getAllGuideProgress(): Promise<Map<string, GuideProgress>> {
  const data = await readJson<{ SeenGuides?: Record<string, string[]> }>('guides_seen.json', { SeenGuides: {} });
  const map = new Map<string, GuideProgress>();
  const allIds = GUIDE_CATALOG.map((guide) => guide.id);
  for (const [steamId, seen] of Object.entries(data.SeenGuides ?? {})) {
    const missing = allIds.filter((id) => !seen.includes(id));
    map.set(steamId, {
      steamId,
      seen,
      completed: seen.length,
      total: allIds.length,
      missing,
      percent: allIds.length ? Math.round((seen.length / allIds.length) * 100) : 0,
    });
  }
  return map;
}

export async function getPopulationSummary() {
  const events = await getConnectionEvents();
  const latestByPlayer = new Map<string, ConnectionEvent>();
  const sessions = events.filter((event) => event.IsConnection === false && typeof event.SessionDurationSeconds === 'number');
  for (const event of events) latestByPlayer.set(String(event.SteamId), event);
  const online = [...latestByPlayer.values()].filter((event) => event.IsConnection);
  const uniquePlayers = new Set(events.map((event) => String(event.SteamId))).size;
  const avgSessionSeconds = sessions.length ? sessions.reduce((sum, event) => sum + Number(event.SessionDurationSeconds ?? 0), 0) / sessions.length : 0;
  const totalSessionSeconds = sessions.reduce((sum, event) => sum + Number(event.SessionDurationSeconds ?? 0), 0);
  return {
    onlineCount: online.length,
    onlinePlayers: online.map((event) => ({ steamId: String(event.SteamId), name: event.PlayerName, since: event.Timestamp })),
    uniquePlayers,
    totalSessions: sessions.length,
    avgSessionSeconds,
    totalSessionSeconds,
    latestEventAt: events.at(-1)?.Timestamp ?? null,
    recentEvents: [...events].reverse().slice(0, 10),
  };
}

export function getHostMetrics() {
  const memory = process.memoryUsage();
  return {
    machine: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    uptimeSeconds: os.uptime(),
    systemMemory: { totalBytes: os.totalmem(), freeBytes: os.freemem(), usedBytes: os.totalmem() - os.freemem() },
    webProcess: { pid: process.pid, uptimeSeconds: process.uptime(), rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal },
  };
}

export type BanRecord = {
  id: string;
  steamId: string;
  playerName: string;
  avatarUrl?: string | null;
  reason: string;
  staffSteamId: string | null;
  staffName: string;
  staffAvatarUrl?: string | null;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  isPermanent: boolean;
  source: 'blacklist' | 'admin_log';
  rawAction?: string | null;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
}

function getNested(record: UnknownRecord, pathName: string): unknown {
  let current: unknown = record;
  for (const part of pathName.split('.')) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as UnknownRecord)[part];
  }
  return current;
}

function readValue(record: UnknownRecord, key: string): unknown {
  return key.includes('.') ? getNested(record, key) : record[key];
}

function firstString(record: UnknownRecord, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = readValue(record, key);
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

function firstDate(record: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = readValue(record, key);
    if (typeof value === 'string' && value.trim()) {
      const date = new Date(value);
      if (Number.isFinite(date.getTime())) return date.toISOString();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const ms = value > 10_000_000_000 ? value : value * 1000;
      if (Number.isFinite(new Date(ms).getTime())) return new Date(ms).toISOString();
    }
  }
  return null;
}

function firstNumber(record: UnknownRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = readValue(record, key);
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function firstBoolean(record: UnknownRecord, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = readValue(record, key);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
  }
  return null;
}

function addSeconds(iso: string | null, seconds: number | null) {
  if (!iso || !seconds || seconds <= 0) return null;
  return new Date(new Date(iso).getTime() + seconds * 1000).toISOString();
}

function makeBanId(source: string, steamId: string, createdAt: string, action?: string | null) {
  return `${source}-${steamId}-${createdAt}-${action ?? 'ban'}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function parseDurationUnit(unit: string) {
  const normalized = unit.toLowerCase();
  if (['s', 'sec', 'secs', 'second', 'seconds'].includes(normalized)) return 1;
  if (['m', 'min', 'mins', 'minute', 'minutes'].includes(normalized)) return 60;
  if (['h', 'hr', 'hrs', 'hour', 'hours'].includes(normalized)) return 3600;
  if (['d', 'day', 'days'].includes(normalized)) return 86400;
  if (['w', 'week', 'weeks'].includes(normalized)) return 604800;
  if (['mo', 'month', 'months'].includes(normalized)) return 2592000;
  return 0;
}

function parseBanDetails(details: string | null | undefined) {
  const text = details?.trim() ?? '';
  if (!text) return { reason: '', durationSeconds: null as number | null };

  const durationMatch = text.match(/(?:\(|\b)(\d+)\s*(seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h|days?|day|d|weeks?|week|w|months?|month|mo)(?:\)|\b)/i);
  const durationSeconds = durationMatch ? Number(durationMatch[1]) * parseDurationUnit(durationMatch[2]) : null;
  const explicitReason = text.match(/(?:reason|because)\s*[:=-]\s*(.+?)(?:\s+(?:duration|expires|length)\s*[:=-]|$)/i)?.[1]?.trim();
  const reasonWithoutDuration = durationMatch ? text.replace(durationMatch[0], '').replace(/[\s\-–—:]+$/, '').trim() : text;
  const reason = explicitReason || reasonWithoutDuration || text;
  return { reason, durationSeconds: durationSeconds && durationSeconds > 0 ? durationSeconds : null };
}

async function getAllAdminLogs(): Promise<AdminLog[]> {
  const files = await getJsonFiles('admin_logs');
  const all: AdminLog[] = [];
  for (const file of files) all.push(...(await readJson<AdminLog[]>(file, [])));
  return all.sort((a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());
}

function candidateBlacklistSteamId(record: UnknownRecord) {
  return firstString(record, ['SteamId', 'steamId', 'PlayerSteamId', 'TargetSteamId', 'UserSteamId', 'Player.SteamId', 'Target.SteamId']);
}

function normalizeBlacklistBan(item: unknown, fallbackAdmin?: AdminLog): BanRecord | null {
  const record = asRecord(item);
  const steamId = candidateBlacklistSteamId(record);
  if (!steamId) return null;

  const createdAt = firstDate(record, ['CreatedAt', 'CreatedAtUtc', 'BannedAt', 'BannedAtUtc', 'Timestamp', 'StartTimeUtc', 'IssuedAt', 'IssuedAtUtc', 'Date', 'DateAdded', 'AddedAt', 'AddedAtUtc']) ?? fallbackAdmin?.Timestamp ?? new Date().toISOString();
  const parsed = parseBanDetails(firstString(record, ['Details', 'Message'], fallbackAdmin?.Details ?? ''));
  const durationSeconds = firstNumber(record, ['DurationSeconds', 'BanDurationSeconds', 'LengthSeconds', 'Duration']) ?? parsed.durationSeconds;
  const expiresAt = firstDate(record, ['ExpiresAt', 'ExpiresAtUtc', 'ExpiresUtc', 'ExpirationUtc', 'ExpirationDate', 'EndTimeUtc', 'UnbanAt', 'UnbanAtUtc', 'BanExpiresAt']) ?? addSeconds(createdAt, durationSeconds);
  const permanentFlag = firstBoolean(record, ['Permanent', 'IsPermanent', 'NeverExpires']);
  const isPermanent = permanentFlag ?? !expiresAt;

  return {
    id: makeBanId('blacklist', steamId, createdAt),
    steamId,
    playerName: firstString(record, ['PlayerName', 'TargetName', 'Name', 'DisplayName', 'LastKnownDisplayName', 'Player.Name'], fallbackAdmin?.TargetName ?? ''),
    reason: firstString(record, ['Reason', 'BanReason', 'Details', 'Message'], parsed.reason || 'No reason provided'),
    staffSteamId: firstString(record, ['AdminSteamId', 'BannedBySteamId', 'StaffSteamId', 'IssuerSteamId'], fallbackAdmin?.AdminSteamId != null ? String(fallbackAdmin.AdminSteamId) : '') || null,
    staffName: firstString(record, ['AdminName', 'BannedByName', 'StaffName', 'IssuerName'], fallbackAdmin?.AdminName ?? 'Staff'),
    createdAt,
    expiresAt,
    revokedAt: firstDate(record, ['RevokedAt', 'RevokedAtUtc', 'UnbannedAt', 'UnbannedAtUtc', 'RemovedAt', 'RemovedAtUtc']),
    isPermanent,
    source: 'blacklist',
    rawAction: 'Blacklist',
  };
}

function normalizeAdminBan(log: AdminLog): BanRecord | null {
  if (!/ban/i.test(log.ActionType ?? '') || /unban|pardon|remove/i.test(log.ActionType ?? '')) return null;
  const steamId = log.TargetSteamId != null ? String(log.TargetSteamId) : '';
  if (!steamId) return null;

  const parsed = parseBanDetails(log.Details ?? '');
  const createdAt = new Date(log.Timestamp).toISOString();
  const expiresAt = addSeconds(createdAt, parsed.durationSeconds);

  return {
    id: makeBanId('admin-log', steamId, createdAt, log.ActionType),
    steamId,
    playerName: log.TargetName ?? '',
    reason: parsed.reason || log.Details || 'No reason provided',
    staffSteamId: log.AdminSteamId != null && String(log.AdminSteamId) !== '0' ? String(log.AdminSteamId) : null,
    staffName: log.AdminName || 'Staff',
    createdAt,
    expiresAt,
    revokedAt: null,
    isPermanent: !expiresAt,
    source: 'admin_log',
    rawAction: log.ActionType,
  };
}

function latestConnectionName(events: ConnectionEvent[], steamId: string): string | null {
  for (const event of [...events].reverse()) {
    if (String(event.SteamId) === steamId && event.PlayerName?.trim()) return event.PlayerName.trim();
  }
  return null;
}

function savedPlayerName(playersBySteam: Map<string, PlayerSave>, steamId: string): string | null {
  const player = playersBySteam.get(steamId);
  return player?.RpDisplayName?.trim() || player?.LastKnownDisplayName?.trim() || null;
}

export async function getBanRecords(): Promise<BanRecord[]> {
  const [blacklist, adminLogs, players, connectionEvents] = await Promise.all([
    readJson<unknown[]>('blacklist.json', []),
    getAllAdminLogs(),
    getPlayers(),
    getConnectionEvents(),
  ]);

  const playersBySteam = new Map(players.map((player) => [String(player.SteamId), player]));
  const banLogs = adminLogs.filter((log) => /ban/i.test(log.ActionType ?? '') && !/unban|pardon|remove/i.test(log.ActionType ?? ''));
  const unbanLogs = adminLogs.filter((log) => /unban|pardon|removeban/i.test(log.ActionType ?? ''));
  const records: BanRecord[] = [];

  for (const item of Array.isArray(blacklist) ? blacklist : []) {
    const record = asRecord(item);
    const steamId = candidateBlacklistSteamId(record);
    const fallback = steamId ? [...banLogs].reverse().find((log) => String(log.TargetSteamId) === steamId) : undefined;
    const ban = normalizeBlacklistBan(item, fallback);
    if (ban) records.push(ban);
  }

  for (const log of banLogs) {
    const ban = normalizeAdminBan(log);
    if (!ban) continue;
    const duplicate = records.some((record) => record.steamId === ban.steamId && Math.abs(new Date(record.createdAt).getTime() - new Date(ban.createdAt).getTime()) < 120_000);
    if (!duplicate) records.push(ban);
  }

  const unbansBySteam = new Map<string, AdminLog[]>();
  for (const log of unbanLogs) {
    const steamId = log.TargetSteamId != null ? String(log.TargetSteamId) : '';
    if (!steamId) continue;
    unbansBySteam.set(steamId, [...(unbansBySteam.get(steamId) ?? []), log]);
  }

  const steamIds = records.flatMap((record) => [record.steamId, record.staffSteamId]).filter(Boolean) as string[];
  const profiles = await getSteamProfiles(steamIds);

  const enriched = records.map((record) => {
    const unban = (unbansBySteam.get(record.steamId) ?? []).find((log) => new Date(log.Timestamp).getTime() >= new Date(record.createdAt).getTime());
    const playerProfile = profiles.get(record.steamId);
    const staffProfile = record.staffSteamId ? profiles.get(record.staffSteamId) : null;
    const resolvedName = record.playerName?.trim()
      || savedPlayerName(playersBySteam, record.steamId)
      || latestConnectionName(connectionEvents, record.steamId)
      || playerProfile?.personaName
      || `Steam ${record.steamId.slice(-8)}`;

    return {
      ...record,
      playerName: resolvedName,
      avatarUrl: playerProfile?.avatarMedium ?? null,
      staffName: record.staffName?.trim() || staffProfile?.personaName || 'Staff',
      staffAvatarUrl: staffProfile?.avatarMedium ?? null,
      revokedAt: unban ? new Date(unban.Timestamp).toISOString() : record.revokedAt,
      source: record.source,
    };
  });

  return enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getBanSummary() {
  const records = await getBanRecords();
  const now = Date.now();
  const active = records.filter((ban) => !ban.revokedAt && (ban.isPermanent || (ban.expiresAt && new Date(ban.expiresAt).getTime() > now)));
  const temporary = records.filter((ban) => !ban.isPermanent);
  const expired = records.filter((ban) => Boolean(ban.revokedAt || (ban.expiresAt && new Date(ban.expiresAt).getTime() <= now)));
  return { total: records.length, active: active.length, temporary: temporary.length, expired: expired.length, latestAt: records[0]?.createdAt ?? null };
}

export function getCitizenName(player: PlayerSave | null | undefined, fallbackSteamId?: string): string {
  return player?.RpDisplayName?.trim() || player?.LastKnownDisplayName?.trim() || (fallbackSteamId ? `Citizen ${fallbackSteamId.slice(-8)}` : 'Unnamed citizen');
}

export function getLevel(player: PlayerSave | null | undefined): number {
  return Number(player?.Level ?? player?.TrackedStats?.level ?? 1);
}

export function getXp(player: PlayerSave | null | undefined): number {
  return Number(player?.TotalExperience ?? player?.Experience ?? player?.TrackedStats?.xp_earned ?? 0);
}

export function countItems(player: PlayerSave | null | undefined): number {
  const slots = [...(player?.HotbarSlots ?? []), ...(player?.InventorySlots ?? []), ...(player?.EquipmentSlots ?? []), ...(player?.MailboxStorageSlots ?? [])];
  return slots.filter(Boolean).length;
}

export async function getCityOverview() {
  const [players, population, tweets, bans, layouts, config, whitelist, warnings, mutes, scheduled] = await Promise.all([
    getPlayers(),
    getPopulationSummary(),
    getTweets(),
    getBanSummary(),
    getAllPropertyLayouts(),
    getServerConfig(),
    getWhitelist(),
    getWarnings(),
    getMutes(),
    getScheduledServerMessages(),
  ]);
  const totalCash = players.reduce((sum, player) => sum + Number(player.CashBalance ?? 0), 0);
  const totalBank = players.reduce((sum, player) => sum + Number(player.BankBalance ?? 0), 0);
  const totalPlaytime = players.reduce((sum, player) => sum + Number(player.TotalPlaytimeSeconds ?? 0), 0);
  const averageLevel = players.length ? players.reduce((sum, player) => sum + getLevel(player), 0) / players.length : 0;
  return {
    players: players.length,
    onlineCount: population.onlineCount,
    uniqueVisitors: population.uniquePlayers,
    totalSessions: population.totalSessions,
    totalPlaytime,
    latestActivityAt: population.latestEventAt,
    tweets: tweets.length,
    bans,
    propertyLayouts: layouts.length,
    propertyProps: layouts.reduce((sum, layout) => sum + (layout.Items?.length ?? 0), 0),
    totalCash,
    totalBank,
    averageLevel,
    config,
    whitelistEnabled: Boolean(whitelist.Enabled),
    warnings: warnings.length,
    mutes: mutes.length,
    scheduledMessages: scheduled.length,
  };
}
