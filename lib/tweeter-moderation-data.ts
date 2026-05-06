import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { getBanRecords, type BanRecord } from './ape-data';

export type TweeterAccountStatus = 'none' | 'hidden' | 'soft_ban' | 'full_ban';

export type TweeterAccountModeration = {
  steamId: string;
  status: Exclude<TweeterAccountStatus, 'none'>;
  reason: string;
  note?: string;
  staffSteamId: string;
  staffName: string;
  updatedAt: string;
  expiresAt?: string | null;
};

export type TweeterModerationNotice = {
  kind: 'website' | 'game';
  level: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
};

export type TweeterAccountRestriction = {
  steamId: string;
  status: TweeterAccountStatus;
  hiddenFromTweeter: boolean;
  canAppearInSuggestions: boolean;
  canViewProfile: boolean;
  canReceiveFollow: boolean;
  canReceiveMessage: boolean;
  canUseSocialActions: boolean;
  canCustomizeProfile: boolean;
  notices: TweeterModerationNotice[];
  actionLockReason: string;
  targetFollowLockReason: string;
  targetMessageLockReason: string;
  activeGameBan: BanRecord | null;
  websiteModeration: TweeterAccountModeration | null;
};

type Store = {
  version: 1;
  accounts: Record<string, TweeterAccountModeration>;
};

const EMPTY_STORE: Store = { version: 1, accounts: {} };

function dataDir() {
  return process.env.NORTHLINE_DATA_PATH?.trim() || path.join(process.cwd(), '.northline-data');
}

function storePath() {
  return path.join(dataDir(), 'tweeter-moderation-store.json');
}

async function ensureDir() {
  await mkdir(dataDir(), { recursive: true });
}

function cleanSteamId(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  return /^\d{15,20}$/.test(raw) ? raw : null;
}

function cleanStatus(value: unknown): TweeterAccountStatus {
  const raw = String(value ?? '').trim();
  if (raw === 'hidden' || raw === 'soft_ban' || raw === 'full_ban') return raw;
  return 'none';
}

function cleanText(value: unknown, max = 280): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanDate(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function isExpired(record: TweeterAccountModeration): boolean {
  if (!record.expiresAt) return false;
  const time = new Date(record.expiresAt).getTime();
  return Number.isFinite(time) && time <= Date.now();
}

function normalizeRecord(steamId: string, record: Partial<TweeterAccountModeration> | Record<string, unknown>): TweeterAccountModeration | null {
  const safeSteamId = cleanSteamId((record as Partial<TweeterAccountModeration>).steamId ?? steamId);
  const status = cleanStatus((record as Partial<TweeterAccountModeration>).status);
  if (!safeSteamId || status === 'none') return null;
  const normalized: TweeterAccountModeration = {
    steamId: safeSteamId,
    status,
    reason: cleanText((record as Partial<TweeterAccountModeration>).reason, 420) || defaultReasonForStatus(status),
    note: cleanText((record as Partial<TweeterAccountModeration>).note, 500),
    staffSteamId: cleanSteamId((record as Partial<TweeterAccountModeration>).staffSteamId) ?? '0',
    staffName: cleanText((record as Partial<TweeterAccountModeration>).staffName, 80) || 'Staff',
    updatedAt: cleanDate((record as Partial<TweeterAccountModeration>).updatedAt) ?? new Date().toISOString(),
    expiresAt: cleanDate((record as Partial<TweeterAccountModeration>).expiresAt),
  };
  return isExpired(normalized) ? null : normalized;
}

function normalizeStore(input: unknown): Store {
  if (!input || typeof input !== 'object') return { ...EMPTY_STORE, accounts: {} };
  const raw = input as Partial<Store>;
  const accounts: Record<string, TweeterAccountModeration> = {};
  if (raw.accounts && typeof raw.accounts === 'object') {
    for (const [steamId, record] of Object.entries(raw.accounts)) {
      const normalized = normalizeRecord(steamId, record as Record<string, unknown>);
      if (normalized) accounts[normalized.steamId] = normalized;
    }
  }
  return { version: 1, accounts };
}

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(storePath(), 'utf8');
    return normalizeStore(JSON.parse(raw));
  } catch {
    return { ...EMPTY_STORE, accounts: {} };
  }
}

async function writeStore(store: Store) {
  await ensureDir();
  await writeFile(storePath(), `${JSON.stringify(normalizeStore(store), null, 2)}\n`, 'utf8');
}

export function defaultReasonForStatus(status: TweeterAccountStatus): string {
  switch (status) {
    case 'hidden': return 'This profile has been hidden by staff.';
    case 'soft_ban': return 'This account has limited Tweeter access.';
    case 'full_ban': return 'This account has been banned from Tweeter.';
    default: return '';
  }
}

export function statusLabel(status: TweeterAccountStatus): string {
  switch (status) {
    case 'hidden': return 'Profile hidden';
    case 'soft_ban': return 'Soft banned';
    case 'full_ban': return 'Full Tweeter ban';
    default: return 'Visible';
  }
}

export async function getTweeterAccountModeration(steamId: string | null | undefined): Promise<TweeterAccountModeration | null> {
  const safeSteamId = cleanSteamId(steamId);
  if (!safeSteamId) return null;
  const store = await readStore();
  return store.accounts[safeSteamId] ?? null;
}

export async function getTweeterAccountModerationMap(steamIds: Array<string | null | undefined>): Promise<Record<string, TweeterAccountModeration>> {
  const wanted = new Set(steamIds.map(cleanSteamId).filter((id): id is string => !!id));
  if (!wanted.size) return {};
  const store = await readStore();
  return Object.fromEntries([...wanted].flatMap((steamId) => store.accounts[steamId] ? [[steamId, store.accounts[steamId]]] : []));
}

export async function listTweeterAccountModeration(): Promise<TweeterAccountModeration[]> {
  const store = await readStore();
  return Object.values(store.accounts).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function setTweeterAccountModeration(input: {
  steamId: unknown;
  status: unknown;
  reason?: unknown;
  note?: unknown;
  staffSteamId: string;
  staffName: string;
  expiresAt?: unknown;
}): Promise<TweeterAccountModeration | null> {
  const steamId = cleanSteamId(input.steamId);
  if (!steamId) throw new Error('invalid_steam_id');
  const status = cleanStatus(input.status);
  const store = await readStore();

  if (status === 'none') {
    delete store.accounts[steamId];
    await writeStore(store);
    return null;
  }

  const record = normalizeRecord(steamId, {
    steamId,
    status,
    reason: cleanText(input.reason, 420) || defaultReasonForStatus(status),
    note: cleanText(input.note, 500),
    staffSteamId: input.staffSteamId,
    staffName: input.staffName,
    updatedAt: new Date().toISOString(),
    expiresAt: cleanDate(input.expiresAt),
  });
  if (!record) throw new Error('invalid_status');
  store.accounts[steamId] = record;
  await writeStore(store);
  return record;
}

function isActiveGameBan(record: BanRecord, now = Date.now()) {
  if (record.revokedAt) return false;
  if (record.isPermanent) return true;
  if (!record.expiresAt) return false;
  const expires = new Date(record.expiresAt).getTime();
  return Number.isFinite(expires) && expires > now;
}

export async function getActiveGameBan(steamId: string | null | undefined): Promise<BanRecord | null> {
  const safeSteamId = cleanSteamId(steamId);
  if (!safeSteamId) return null;
  const records = await getBanRecords();
  return records.find((record) => record.steamId === safeSteamId && isActiveGameBan(record)) ?? null;
}

export async function getActiveGameBanMap(steamIds: Array<string | null | undefined>): Promise<Record<string, BanRecord>> {
  const wanted = new Set(steamIds.map(cleanSteamId).filter((id): id is string => !!id));
  if (!wanted.size) return {};
  const records = await getBanRecords();
  const map: Record<string, BanRecord> = {};
  for (const record of records) {
    if (!wanted.has(record.steamId) || map[record.steamId] || !isActiveGameBan(record)) continue;
    map[record.steamId] = record;
  }
  return map;
}

function gameBanNotice(ban: BanRecord): TweeterModerationNotice {
  const permanent = ban.isPermanent ? 'permanent ' : '';
  const until = !ban.isPermanent && ban.expiresAt ? ` until ${new Date(ban.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}` : '';
  return {
    kind: 'game',
    level: 'danger',
    title: 'Active in-game ban',
    message: `This citizen has an active ${permanent}Northline server ban${until}. Tweeter messaging and social actions are limited while the game ban is active.`,
  };
}

function websiteNotice(record: TweeterAccountModeration): TweeterModerationNotice {
  if (record.status === 'hidden') {
    return { kind: 'website', level: 'warning', title: 'Profile hidden by staff', message: record.reason || defaultReasonForStatus(record.status) };
  }
  if (record.status === 'soft_ban') {
    return { kind: 'website', level: 'warning', title: 'Limited Tweeter access', message: record.reason || defaultReasonForStatus(record.status) };
  }
  return { kind: 'website', level: 'danger', title: 'Tweeter account banned', message: record.reason || defaultReasonForStatus(record.status) };
}

export function buildTweeterRestriction(steamId: string, websiteModeration: TweeterAccountModeration | null, activeGameBan: BanRecord | null): TweeterAccountRestriction {
  const status = websiteModeration?.status ?? 'none';
  const notices: TweeterModerationNotice[] = [];
  if (websiteModeration) notices.push(websiteNotice(websiteModeration));
  if (activeGameBan) notices.push(gameBanNotice(activeGameBan));

  const fullBan = status === 'full_ban';
  const hidden = status === 'hidden';
  const softBan = status === 'soft_ban';
  const gameBanned = Boolean(activeGameBan);
  const hiddenFromTweeter = hidden || fullBan;
  const actionLockReason = fullBan
    ? 'This account is fully banned from Tweeter.'
    : softBan
      ? 'This account has limited Tweeter access from staff moderation.'
      : hidden
        ? 'This Tweeter profile has been hidden by staff.'
        : gameBanned
          ? 'This account has an active in-game ban, so Tweeter social actions are paused.'
          : '';
  const targetFollowLockReason = hidden || fullBan
    ? 'This profile is not available to follow right now.'
    : gameBanned
      ? 'This account has an active in-game ban and cannot be followed right now.'
      : '';
  const targetMessageLockReason = fullBan
    ? 'This account is fully banned from Tweeter and cannot receive messages.'
    : hidden
      ? 'This profile has been hidden by staff and cannot receive messages.'
      : softBan
        ? 'This account has limited Tweeter access and cannot receive messages right now.'
        : gameBanned
          ? 'This account has an active in-game ban and cannot receive website DMs right now.'
          : '';

  return {
    steamId,
    status,
    hiddenFromTweeter,
    canAppearInSuggestions: status === 'none' && !gameBanned,
    canViewProfile: !hiddenFromTweeter,
    canReceiveFollow: !hiddenFromTweeter && !gameBanned,
    canReceiveMessage: !hiddenFromTweeter && !softBan && !gameBanned,
    canUseSocialActions: !fullBan && !softBan && !hidden && !gameBanned,
    canCustomizeProfile: !fullBan && !softBan && !hidden && !gameBanned,
    notices,
    actionLockReason,
    targetFollowLockReason,
    targetMessageLockReason,
    activeGameBan,
    websiteModeration,
  };
}

export async function getTweeterRestriction(steamId: string | null | undefined): Promise<TweeterAccountRestriction | null> {
  const safeSteamId = cleanSteamId(steamId);
  if (!safeSteamId) return null;
  const [websiteModeration, activeGameBan] = await Promise.all([
    getTweeterAccountModeration(safeSteamId),
    getActiveGameBan(safeSteamId),
  ]);
  return buildTweeterRestriction(safeSteamId, websiteModeration, activeGameBan);
}

export async function getTweeterRestrictionMap(steamIds: Array<string | null | undefined>): Promise<Record<string, TweeterAccountRestriction>> {
  const ids = [...new Set(steamIds.map(cleanSteamId).filter((id): id is string => !!id))];
  if (!ids.length) return {};
  const [websiteMap, gameBanMap] = await Promise.all([
    getTweeterAccountModerationMap(ids),
    getActiveGameBanMap(ids),
  ]);
  return Object.fromEntries(ids.map((steamId) => [steamId, buildTweeterRestriction(steamId, websiteMap[steamId] ?? null, gameBanMap[steamId] ?? null)]));
}
