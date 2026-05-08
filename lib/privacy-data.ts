import crypto from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { getCasesState } from '@/lib/cases-data';
import { getCommunityProfile } from '@/lib/community-data';
import { getForumStateForUser } from '@/lib/forum-data';
import { getPublicJobsState } from '@/lib/jobs-data';
import { getCitizenName, getConnectionEvents, getPermissionsForSteamId, getPlayer, getPropertyLayoutsForSteamId, getRoleForSteamId, getTweeterData } from '@/lib/ape-data';
import { getSteamProfile } from '@/lib/steam-openid';

import { DATA_DELETION_CONFIRMATION, type PrivacyRequest, type PrivacyRequestStatus } from '@/lib/privacy-shared';
export type { PrivacyRequest, PrivacyRequestStatus } from '@/lib/privacy-shared';

type PrivacyStore = { requests: PrivacyRequest[]; audit: Array<{ id: string; requestId: string; action: string; actorSteamId: string; actorName: string; createdAt: string; note?: string }> };
const DEFAULT_STORE: PrivacyStore = { requests: [], audit: [] };

function dataDir() { return process.env.NORTHLINE_DATA_PATH?.trim() || path.join(process.cwd(), '.northline-data'); }
function storePath() { return path.join(dataDir(), 'privacy-requests.json'); }
async function ensureDir() { await mkdir(dataDir(), { recursive: true }); }
async function readStore(): Promise<PrivacyStore> { try { const raw = await readFile(storePath(), 'utf8'); const parsed = JSON.parse(raw) as Partial<PrivacyStore>; return { requests: parsed.requests ?? [], audit: parsed.audit ?? [] }; } catch { return { ...DEFAULT_STORE, requests: [], audit: [] }; } }
async function writeStore(store: PrivacyStore) { await ensureDir(); await writeFile(storePath(), JSON.stringify(store, null, 2), 'utf8'); }
function isSteamId(value: string) { return /^\d{15,20}$/.test(value); }

async function displayNameFor(steamId: string) {
  const [player, steam] = await Promise.all([getPlayer(steamId), getSteamProfile(steamId)]);
  return getCitizenName(player, steamId) || steam?.personaName || `Steam ${steamId.slice(-8)}`;
}

export async function createExportRequest(steamId: string): Promise<PrivacyRequest> {
  if (!isSteamId(steamId)) throw new Error('Invalid SteamID.');
  const store = await readStore();
  const now = new Date().toISOString();
  const displayName = await displayNameFor(steamId);
  const request: PrivacyRequest = { id: `privacy_${crypto.randomUUID()}`, type: 'export', steamId, displayName, status: 'completed', requestedAt: now, updatedAt: now };
  store.requests.unshift(request);
  store.audit.unshift({ id: crypto.randomUUID(), requestId: request.id, action: 'export_generated', actorSteamId: steamId, actorName: displayName, createdAt: now });
  await writeStore(store);
  return request;
}

export async function createDeletionRequest(steamId: string, input: unknown): Promise<PrivacyRequest> {
  if (!isSteamId(steamId)) throw new Error('Invalid SteamID.');
  const body = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const confirmation = String(body.confirmation ?? '').trim();
  if (confirmation !== DATA_DELETION_CONFIRMATION) throw new Error(`Type ${DATA_DELETION_CONFIRMATION} to continue.`);
  const required = ['gameProgressReset', 'irreversible', 'backupRetention', 'restoreNotice', 'limitedOperationalRetention'];
  const acknowledgements = typeof body.acknowledgements === 'object' && body.acknowledgements !== null ? body.acknowledgements as Record<string, unknown> : {};
  if (!required.every((key) => acknowledgements[key] === true)) throw new Error('Please confirm every acknowledgement before submitting.');
  const store = await readStore();
  const openExisting = store.requests.find((item) => item.type === 'deletion' && item.steamId === steamId && ['pending', 'approved'].includes(item.status));
  if (openExisting) return openExisting;
  const now = new Date().toISOString();
  const displayName = await displayNameFor(steamId);
  const request: PrivacyRequest = {
    id: `privacy_${crypto.randomUUID()}`,
    type: 'deletion',
    steamId,
    displayName,
    status: 'pending',
    requestedAt: now,
    updatedAt: now,
    userNote: String(body.note ?? '').slice(0, 1000),
    acknowledgements: Object.fromEntries(required.map((key) => [key, true])),
  };
  store.requests.unshift(request);
  store.audit.unshift({ id: crypto.randomUUID(), requestId: request.id, action: 'deletion_requested', actorSteamId: steamId, actorName: displayName, createdAt: now });
  await writeStore(store);
  return request;
}

export async function getUserPrivacyRequests(steamId: string) { const store = await readStore(); return store.requests.filter((item) => item.steamId === steamId).slice(0, 20); }
export async function getPrivacyAdminState() { const store = await readStore(); return { requests: store.requests, audit: store.audit.slice(0, 100), stats: { pending: store.requests.filter((r) => r.status === 'pending').length, deletion: store.requests.filter((r) => r.type === 'deletion').length, export: store.requests.filter((r) => r.type === 'export').length } }; }

export async function updatePrivacyRequestStatus(id: string, status: PrivacyRequestStatus, actorSteamId: string, actorName: string, note = '') {
  const store = await readStore();
  const now = new Date().toISOString();
  const requests = store.requests.map((request) => request.id === id ? { ...request, status, updatedAt: now, processedBySteamId: actorSteamId, processedByName: actorName, staffNote: note.slice(0, 1500) } : request);
  if (!requests.some((request) => request.id === id)) throw new Error('Request not found.');
  store.requests = requests;
  store.audit.unshift({ id: crypto.randomUUID(), requestId: id, action: `marked_${status}`, actorSteamId, actorName, createdAt: now, note: note.slice(0, 1500) });
  await writeStore(store);
  return getPrivacyAdminState();
}

async function buildExportPayload(steamId: string) {
  const [player, role, permissions, steamProfile, profile, layouts, jobs, cases, forum, tweeter, connections] = await Promise.all([
    getPlayer(steamId), getRoleForSteamId(steamId), getPermissionsForSteamId(steamId), getSteamProfile(steamId), getCommunityProfile(steamId), getPropertyLayoutsForSteamId(steamId), getPublicJobsState(steamId), getCasesState(steamId), getForumStateForUser(steamId), getTweeterData(), getConnectionEvents(),
  ]);
  const ownTweets = tweeter.Tweets.filter((tweet: any) => String(tweet.PosterSteamId ?? tweet.SteamId ?? tweet.AuthorSteamId ?? '') === steamId);
  const ownLikes = tweeter.Likes.filter((like: any) => String(like.SteamId ?? like.UserSteamId ?? '') === steamId);
  return {
    generatedAt: new Date().toISOString(),
    notice: 'This export contains account-linked data available to the Northline RP website at generation time. Staff-only notes, secrets, webhook URLs, and other users private data are not included.',
    account: { steamId, displayName: getCitizenName(player, steamId), role, permissions },
    steam: steamProfile,
    profile,
    gameData: { player, propertyLayouts: layouts, recentConnectionEvents: connections.filter((event: any) => String(event.SteamId ?? event.steamId ?? '') === steamId).slice(-100) },
    tweeter: { tweets: ownTweets, likes: ownLikes },
    forum: { discordLink: forum.discordLink, visibleForumSummary: forum.stats },
    applications: jobs.applications,
    cases,
    backups: { providerBackupRetentionDays: 14, note: 'Deleted live data may remain in temporary backup snapshots for up to 14 days. Backup restores are communicated through Discord and the website status page.' },
  };
}

function crc32(buf: Buffer) { let c = ~0; for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; }
function u16(n: number) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function u32(n: number) { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }
function fileRecord(name: string, content: Buffer, offset: number) { const nameBuf = Buffer.from(name); const crc = crc32(content); const local = Buffer.concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(content.length), u32(content.length), u16(nameBuf.length), u16(0), nameBuf, content]); const central = Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(content.length), u32(content.length), u16(nameBuf.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBuf]); return { local, central }; }
function zipFiles(files: Record<string, string>) { const locals: Buffer[] = []; const centrals: Buffer[] = []; let offset = 0; for (const [name, text] of Object.entries(files)) { const rec = fileRecord(name, Buffer.from(text, 'utf8'), offset); locals.push(rec.local); centrals.push(rec.central); offset += rec.local.length; } const centralSize = centrals.reduce((s, b) => s + b.length, 0); const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(centrals.length), u16(centrals.length), u32(centralSize), u32(offset), u16(0)]); return Buffer.concat([...locals, ...centrals, end]); }

export async function buildUserExportZip(steamId: string): Promise<Buffer> {
  const payload = await buildExportPayload(steamId);
  const root = 'northline-data-export/';
  return zipFiles({
    [`${root}README.txt`]: `Northline RP Data Export\nGenerated: ${payload.generatedAt}\n\nThis archive contains account-linked website and available game/server information for SteamID ${steamId}. Backups may retain deleted data for up to 14 days.`,
    [`${root}account.json`]: JSON.stringify(payload.account, null, 2),
    [`${root}steam.json`]: JSON.stringify(payload.steam, null, 2),
    [`${root}profile.json`]: JSON.stringify(payload.profile, null, 2),
    [`${root}game-data.json`]: JSON.stringify(payload.gameData, null, 2),
    [`${root}tweeter.json`]: JSON.stringify(payload.tweeter, null, 2),
    [`${root}forum.json`]: JSON.stringify(payload.forum, null, 2),
    [`${root}applications.json`]: JSON.stringify(payload.applications, null, 2),
    [`${root}cases.json`]: JSON.stringify(payload.cases, null, 2),
    [`${root}backup-notice.json`]: JSON.stringify(payload.backups, null, 2),
  });
}
