import crypto from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { getCitizenName, getPlayer } from '@/lib/ape-data';
import { getCommunityProfile } from '@/lib/community-data';
import { getSteamProfile } from '@/lib/steam-openid';

export type ForumThreadKind = 'discussion' | 'announcement';
export type ForumThreadStatus = 'open' | 'locked' | 'hidden';
export type ForumPostSource = 'website' | 'discord';

export type ForumAuthor = {
  steamId: string | null;
  discordUserId?: string | null;
  displayName: string;
  avatarUrl: string | null;
  sourceName?: string | null;
};

export type ForumPost = {
  id: string;
  threadId: string;
  body: string;
  author: ForumAuthor;
  source: ForumPostSource;
  discordMessageId: string | null;
  createdAt: string;
  updatedAt: string;
  hidden: boolean;
};

export type ForumThread = {
  id: string;
  title: string;
  excerpt: string;
  categoryId: string;
  kind: ForumThreadKind;
  status: ForumThreadStatus;
  pinned: boolean;
  author: ForumAuthor;
  source: ForumPostSource;
  discordThreadId: string | null;
  discordStarterMessageId: string | null;
  postCount: number;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ForumCategory = {
  id: string;
  label: string;
  description: string;
  icon: string;
};

export type DiscordAccountLink = {
  steamId: string;
  discordUserId: string;
  discordUsername: string;
  linkedAt: string;
};

export type DiscordLinkCode = {
  codeHash: string;
  steamId: string;
  expiresAt: string;
  createdAt: string;
};

export type ForumState = {
  categories: ForumCategory[];
  threads: ForumThread[];
  posts: ForumPost[];
  discordLinks: DiscordAccountLink[];
  linkCodes: DiscordLinkCode[];
  updatedAt: string | null;
};

export type PublicForumState = {
  categories: ForumCategory[];
  threads: ForumThread[];
  discordLink: DiscordAccountLink | null;
  stats: {
    visibleThreads: number;
    pinnedThreads: number;
    announcements: number;
    replies: number;
  };
};

const DEFAULT_CATEGORIES: ForumCategory[] = [
  { id: 'general', label: 'General', description: 'City talk, introductions, and community discussion.', icon: 'fa-solid fa-comments' },
  { id: 'announcements', label: 'Announcements', description: 'Staff notices, pinned updates, and important broadcasts.', icon: 'fa-solid fa-bullhorn' },
  { id: 'support', label: 'Support', description: 'Questions, help requests, bug notes, and account support.', icon: 'fa-solid fa-life-ring' },
];

function dataDir() {
  return process.env.NORTHLINE_DATA_PATH?.trim() || path.join(process.cwd(), '.northline-data');
}

function statePath() {
  return path.join(dataDir(), 'forum.json');
}

async function ensureDir() {
  await mkdir(dataDir(), { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function cleanText(value: unknown, max = 4000) {
  const raw = String(value ?? '').replace(/\r\n/g, '\n').trim();
  return raw.length > max ? raw.slice(0, max).trim() : raw;
}

function cleanTitle(value: unknown) {
  return cleanText(value, 120).replace(/\s+/g, ' ');
}

function excerptFrom(body: string) {
  const compact = body.replace(/\s+/g, ' ').trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}…` : compact;
}

function normalizeCategoryId(value: unknown) {
  const raw = String(value ?? '').trim();
  return DEFAULT_CATEGORIES.some((category) => category.id === raw) ? raw : 'general';
}

function normalizeState(input: unknown): ForumState {
  const raw = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const categories = Array.isArray(raw.categories) ? raw.categories : DEFAULT_CATEGORIES;
  const threads = Array.isArray(raw.threads) ? raw.threads : [];
  const posts = Array.isArray(raw.posts) ? raw.posts : [];
  const discordLinks = Array.isArray(raw.discordLinks) ? raw.discordLinks : [];
  const linkCodes = Array.isArray(raw.linkCodes) ? raw.linkCodes : [];
  return {
    categories: categories.map((category) => {
      const item = typeof category === 'object' && category !== null ? category as Record<string, unknown> : {};
      return {
        id: cleanText(item.id, 60) || 'general',
        label: cleanText(item.label, 80) || 'General',
        description: cleanText(item.description, 240) || '',
        icon: cleanText(item.icon, 80) || 'fa-solid fa-comments',
      };
    }),
    threads: threads.map((thread) => normalizeThread(thread)).filter(Boolean) as ForumThread[],
    posts: posts.map((post) => normalizePost(post)).filter(Boolean) as ForumPost[],
    discordLinks: discordLinks.map((link) => normalizeDiscordLink(link)).filter(Boolean) as DiscordAccountLink[],
    linkCodes: linkCodes.map((code) => normalizeLinkCode(code)).filter(Boolean) as DiscordLinkCode[],
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : null,
  };
}

function normalizeAuthor(value: unknown): ForumAuthor {
  const raw = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  const steamId = String(raw.steamId ?? '').trim();
  const discordUserId = String(raw.discordUserId ?? '').trim();
  return {
    steamId: /^\d{15,20}$/.test(steamId) ? steamId : null,
    discordUserId: /^\d{15,25}$/.test(discordUserId) ? discordUserId : null,
    displayName: cleanText(raw.displayName, 100) || 'Citizen',
    avatarUrl: cleanText(raw.avatarUrl, 400) || null,
    sourceName: cleanText(raw.sourceName, 100) || null,
  };
}

function normalizeThread(input: unknown): ForumThread | null {
  const raw = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const threadId = cleanText(raw.id, 80);
  const title = cleanTitle(raw.title);
  if (!threadId || !title) return null;
  const status = raw.status === 'locked' || raw.status === 'hidden' ? raw.status : 'open';
  const kind = raw.kind === 'announcement' ? 'announcement' : 'discussion';
  return {
    id: threadId,
    title,
    excerpt: cleanText(raw.excerpt, 220),
    categoryId: normalizeCategoryId(raw.categoryId),
    kind,
    status,
    pinned: Boolean(raw.pinned),
    author: normalizeAuthor(raw.author),
    source: raw.source === 'discord' ? 'discord' : 'website',
    discordThreadId: cleanText(raw.discordThreadId, 80) || null,
    discordStarterMessageId: cleanText(raw.discordStarterMessageId, 80) || null,
    postCount: Math.max(0, Number(raw.postCount ?? 0) || 0),
    lastActivityAt: cleanText(raw.lastActivityAt, 80) || nowIso(),
    createdAt: cleanText(raw.createdAt, 80) || nowIso(),
    updatedAt: cleanText(raw.updatedAt, 80) || nowIso(),
  };
}

function normalizePost(input: unknown): ForumPost | null {
  const raw = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const postId = cleanText(raw.id, 80);
  const threadId = cleanText(raw.threadId, 80);
  const body = cleanText(raw.body, 6000);
  if (!postId || !threadId || !body) return null;
  return {
    id: postId,
    threadId,
    body,
    author: normalizeAuthor(raw.author),
    source: raw.source === 'discord' ? 'discord' : 'website',
    discordMessageId: cleanText(raw.discordMessageId, 80) || null,
    createdAt: cleanText(raw.createdAt, 80) || nowIso(),
    updatedAt: cleanText(raw.updatedAt, 80) || nowIso(),
    hidden: Boolean(raw.hidden),
  };
}

function normalizeDiscordLink(input: unknown): DiscordAccountLink | null {
  const raw = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const steamId = String(raw.steamId ?? '').trim();
  const discordUserId = String(raw.discordUserId ?? '').trim();
  if (!/^\d{15,20}$/.test(steamId) || !/^\d{15,25}$/.test(discordUserId)) return null;
  return {
    steamId,
    discordUserId,
    discordUsername: cleanText(raw.discordUsername, 100) || `Discord ${discordUserId}`,
    linkedAt: cleanText(raw.linkedAt, 80) || nowIso(),
  };
}

function normalizeLinkCode(input: unknown): DiscordLinkCode | null {
  const raw = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const steamId = String(raw.steamId ?? '').trim();
  const codeHash = String(raw.codeHash ?? '').trim();
  if (!/^\d{15,20}$/.test(steamId) || !codeHash) return null;
  return {
    steamId,
    codeHash,
    expiresAt: cleanText(raw.expiresAt, 80) || nowIso(),
    createdAt: cleanText(raw.createdAt, 80) || nowIso(),
  };
}

async function readState(): Promise<ForumState> {
  try {
    const raw = await readFile(statePath(), 'utf8');
    const normalized = normalizeState(JSON.parse(raw));
    return normalized.categories.length ? normalized : { ...normalized, categories: DEFAULT_CATEGORIES };
  } catch {
    return { categories: DEFAULT_CATEGORIES, threads: [], posts: [], discordLinks: [], linkCodes: [], updatedAt: null };
  }
}

async function writeState(state: ForumState): Promise<ForumState> {
  const next = { ...state, updatedAt: nowIso() };
  await ensureDir();
  await writeFile(statePath(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function visibleThreads(state: ForumState) {
  return state.threads.filter((thread) => thread.status !== 'hidden');
}

export async function getForumStateForUser(steamId?: string | null): Promise<PublicForumState> {
  const state = await readState();
  const threads = visibleThreads(state).sort(sortThreads);
  return {
    categories: state.categories,
    threads,
    discordLink: steamId ? state.discordLinks.find((link) => link.steamId === steamId) ?? null : null,
    stats: {
      visibleThreads: threads.length,
      pinnedThreads: threads.filter((thread) => thread.pinned).length,
      announcements: threads.filter((thread) => thread.kind === 'announcement').length,
      replies: state.posts.filter((post) => !post.hidden).length,
    },
  };
}

export async function getForumThread(threadId: string): Promise<{ categories: ForumCategory[]; thread: ForumThread; posts: ForumPost[] } | null> {
  const state = await readState();
  const thread = state.threads.find((item) => item.id === threadId && item.status !== 'hidden');
  if (!thread) return null;
  return {
    categories: state.categories,
    thread,
    posts: state.posts.filter((post) => post.threadId === thread.id && !post.hidden).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  };
}

export async function getDiscordLinkForSteamId(steamId: string): Promise<DiscordAccountLink | null> {
  const state = await readState();
  return state.discordLinks.find((link) => link.steamId === steamId) ?? null;
}

export async function getDiscordLinkForDiscordUser(discordUserId: string): Promise<DiscordAccountLink | null> {
  const state = await readState();
  return state.discordLinks.find((link) => link.discordUserId === discordUserId) ?? null;
}

export async function buildForumAuthorForSteam(steamId: string): Promise<ForumAuthor> {
  const [player, profile, steamProfile] = await Promise.all([getPlayer(steamId), getCommunityProfile(steamId), getSteamProfile(steamId)]);
  const displayName = getCitizenName(player, steamId);
  return {
    steamId,
    displayName,
    avatarUrl: profile?.customAvatarUrl || steamProfile?.avatarMedium || steamProfile?.avatarFull || null,
  };
}

function sortThreads(a: ForumThread, b: ForumThread) {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  if (a.kind !== b.kind) return a.kind === 'announcement' ? -1 : 1;
  return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
}

export async function createForumThread(input: {
  title: unknown;
  body: unknown;
  categoryId?: unknown;
  steamId: string;
  kind?: ForumThreadKind;
  pinned?: boolean;
  source?: ForumPostSource;
  discordThreadId?: string | null;
  discordStarterMessageId?: string | null;
}): Promise<{ state: ForumState; thread: ForumThread; starter: ForumPost }> {
  const title = cleanTitle(input.title);
  const body = cleanText(input.body, 6000);
  if (title.length < 4) throw new Error('title_required');
  if (body.length < 8) throw new Error('body_required');
  const state = await readState();
  const author = await buildForumAuthorForSteam(input.steamId);
  const timestamp = nowIso();
  const thread: ForumThread = {
    id: id('thread'),
    title,
    excerpt: excerptFrom(body),
    categoryId: normalizeCategoryId(input.categoryId),
    kind: input.kind === 'announcement' ? 'announcement' : 'discussion',
    status: 'open',
    pinned: Boolean(input.pinned),
    author,
    source: input.source ?? 'website',
    discordThreadId: input.discordThreadId ?? null,
    discordStarterMessageId: input.discordStarterMessageId ?? null,
    postCount: 1,
    lastActivityAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const starter: ForumPost = {
    id: id('post'),
    threadId: thread.id,
    body,
    author,
    source: input.source ?? 'website',
    discordMessageId: input.discordStarterMessageId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    hidden: false,
  };
  state.threads.push(thread);
  state.posts.push(starter);
  return { state: await writeState(state), thread, starter };
}

export async function createForumPost(input: {
  threadId: string;
  body: unknown;
  steamId: string;
  source?: ForumPostSource;
  discordMessageId?: string | null;
}): Promise<{ state: ForumState; thread: ForumThread; post: ForumPost }> {
  const body = cleanText(input.body, 6000);
  if (body.length < 2) throw new Error('body_required');
  const state = await readState();
  const thread = state.threads.find((item) => item.id === input.threadId && item.status !== 'hidden');
  if (!thread) throw new Error('thread_not_found');
  if (thread.status === 'locked') throw new Error('thread_locked');
  const author = await buildForumAuthorForSteam(input.steamId);
  const timestamp = nowIso();
  const post: ForumPost = {
    id: id('post'),
    threadId: thread.id,
    body,
    author,
    source: input.source ?? 'website',
    discordMessageId: input.discordMessageId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    hidden: false,
  };
  state.posts.push(post);
  thread.postCount = state.posts.filter((item) => item.threadId === thread.id && !item.hidden).length;
  thread.lastActivityAt = timestamp;
  thread.updatedAt = timestamp;
  return { state: await writeState(state), thread, post };
}

export async function setForumThreadDiscordIds(threadId: string, discordThreadId: string, discordStarterMessageId?: string | null): Promise<void> {
  const state = await readState();
  const thread = state.threads.find((item) => item.id === threadId);
  if (!thread) return;
  thread.discordThreadId = discordThreadId;
  if (discordStarterMessageId) thread.discordStarterMessageId = discordStarterMessageId;
  await writeState(state);
}

export async function createDiscordImportedThread(input: {
  discordThreadId: string;
  discordStarterMessageId?: string | null;
  discordUserId: string;
  discordUsername: string;
  title: unknown;
  body: unknown;
  categoryId?: unknown;
}): Promise<{ thread: ForumThread; starter: ForumPost } | null> {
  const link = await getDiscordLinkForDiscordUser(input.discordUserId);
  if (!link) return null;
  const state = await readState();
  const existing = state.threads.find((thread) => thread.discordThreadId === input.discordThreadId);
  if (existing) {
    const starter = state.posts.find((post) => post.threadId === existing.id) ?? null;
    return starter ? { thread: existing, starter } : null;
  }
  const result = await createForumThread({
    title: input.title,
    body: input.body,
    categoryId: input.categoryId,
    steamId: link.steamId,
    source: 'discord',
    discordThreadId: input.discordThreadId,
    discordStarterMessageId: input.discordStarterMessageId ?? null,
  });
  return { thread: result.thread, starter: result.starter };
}

export async function createDiscordImportedPost(input: {
  discordThreadId: string;
  discordMessageId: string;
  discordUserId: string;
  discordUsername: string;
  body: unknown;
}): Promise<{ thread: ForumThread; post: ForumPost } | null> {
  const state = await readState();
  const thread = state.threads.find((item) => item.discordThreadId === input.discordThreadId && item.status !== 'hidden');
  if (!thread) return null;
  if (state.posts.some((post) => post.discordMessageId === input.discordMessageId)) return null;
  const link = await getDiscordLinkForDiscordUser(input.discordUserId);
  if (!link) return null;
  const result = await createForumPost({
    threadId: thread.id,
    body: input.body,
    steamId: link.steamId,
    source: 'discord',
    discordMessageId: input.discordMessageId,
  });
  return { thread: result.thread, post: result.post };
}

function linkCodeHash(code: string) {
  return crypto.createHash('sha256').update(`northline.discord-link.${code.trim().toUpperCase()}`).digest('hex');
}

export async function generateDiscordLinkCode(steamId: string): Promise<{ code: string; expiresAt: string }> {
  const state = await readState();
  const code = `NL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const withoutOld = state.linkCodes.filter((item) => item.steamId !== steamId && new Date(item.expiresAt).getTime() > Date.now());
  withoutOld.push({ codeHash: linkCodeHash(code), steamId, createdAt, expiresAt });
  state.linkCodes = withoutOld;
  await writeState(state);
  return { code, expiresAt };
}

export async function consumeDiscordLinkCode(input: { code: string; discordUserId: string; discordUsername: string }): Promise<DiscordAccountLink | null> {
  const codeHash = linkCodeHash(input.code);
  const state = await readState();
  const match = state.linkCodes.find((item) => item.codeHash === codeHash && new Date(item.expiresAt).getTime() > Date.now());
  if (!match) return null;
  const linkedAt = nowIso();
  state.linkCodes = state.linkCodes.filter((item) => item.codeHash !== codeHash);
  state.discordLinks = state.discordLinks.filter((item) => item.steamId !== match.steamId && item.discordUserId !== input.discordUserId);
  const link: DiscordAccountLink = {
    steamId: match.steamId,
    discordUserId: input.discordUserId,
    discordUsername: cleanText(input.discordUsername, 100) || `Discord ${input.discordUserId}`,
    linkedAt,
  };
  state.discordLinks.push(link);
  await writeState(state);
  return link;
}
