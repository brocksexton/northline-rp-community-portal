import crypto from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { getCitizenName, getPlayer } from '@/lib/ape-data';
import { getCommunityProfile } from '@/lib/community-data';
import { getSteamProfile } from '@/lib/steam-openid';
import { FORUM_REACTION_CHOICES } from '@/lib/forum-shared';

export type ForumThreadKind = 'discussion' | 'announcement';
export type ForumThreadStatus = 'open' | 'locked' | 'archived' | 'hidden' | 'deleted';
export type ForumPostSource = 'website' | 'discord';

export type ForumReaction = {
  id: string;
  postId: string;
  steamId: string;
  emoji: string;
  createdAt: string;
};

export type ForumReactionSummary = {
  emoji: string;
  label: string;
  count: number;
  reactedByMe: boolean;
};

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
  reactions?: ForumReactionSummary[];
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
  reactions: ForumReaction[];
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
  const reactions = Array.isArray(raw.reactions) ? raw.reactions : [];
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
    reactions: reactions.map((reaction) => normalizeReaction(reaction)).filter(Boolean) as ForumReaction[],
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
  const status = raw.status === 'locked' || raw.status === 'archived' || raw.status === 'hidden' || raw.status === 'deleted' ? raw.status : 'open';
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

function normalizeReaction(input: unknown): ForumReaction | null {
  const raw = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const postId = cleanText(raw.postId, 80);
  const steamId = String(raw.steamId ?? '').trim();
  const emoji = cleanText(raw.emoji, 8);
  if (!postId || !/^\d{15,20}$/.test(steamId) || !FORUM_REACTION_CHOICES.some((choice) => choice.emoji === emoji)) return null;
  return {
    id: cleanText(raw.id, 80) || id('react'),
    postId,
    steamId,
    emoji,
    createdAt: cleanText(raw.createdAt, 80) || nowIso(),
  };
}

function decoratePostsWithReactions(posts: ForumPost[], state: ForumState, viewerSteamId?: string | null): ForumPost[] {
  return posts.map((post) => {
    const summaries = FORUM_REACTION_CHOICES
      .map((choice) => {
        const matching = state.reactions.filter((reaction) => reaction.postId === post.id && reaction.emoji === choice.emoji);
        return {
          emoji: choice.emoji,
          label: choice.label,
          count: matching.length,
          reactedByMe: Boolean(viewerSteamId && matching.some((reaction) => reaction.steamId === viewerSteamId)),
        };
      })
      .filter((summary) => summary.count > 0 || summary.reactedByMe);
    return { ...post, reactions: summaries };
  });
}

async function readState(): Promise<ForumState> {
  try {
    const raw = await readFile(statePath(), 'utf8');
    const normalized = normalizeState(JSON.parse(raw));
    return normalized.categories.length ? normalized : { ...normalized, categories: DEFAULT_CATEGORIES };
  } catch {
    return { categories: DEFAULT_CATEGORIES, threads: [], posts: [], discordLinks: [], linkCodes: [], reactions: [], updatedAt: null };
  }
}

async function writeState(state: ForumState): Promise<ForumState> {
  const next = { ...state, updatedAt: nowIso() };
  await ensureDir();
  await writeFile(statePath(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function visibleThreads(state: ForumState) {
  return state.threads.filter((thread) => thread.status !== 'hidden' && thread.status !== 'deleted');
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

export async function getForumThread(threadId: string, viewerSteamId?: string | null): Promise<{ categories: ForumCategory[]; thread: ForumThread; posts: ForumPost[] } | null> {
  const state = await readState();
  const thread = state.threads.find((item) => item.id === threadId && item.status !== 'hidden' && item.status !== 'deleted');
  if (!thread) return null;
  return {
    categories: state.categories,
    thread,
    posts: decoratePostsWithReactions(state.posts.filter((post) => post.threadId === thread.id && !post.hidden).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), state, viewerSteamId),
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


function buildForumAuthorForDiscord(input: { discordUserId: string; discordUsername: string; discordAvatarUrl?: string | null }): ForumAuthor {
  const username = cleanText(input.discordUsername, 100) || `Discord ${String(input.discordUserId).slice(-6)}`;
  return {
    steamId: null,
    discordUserId: String(input.discordUserId).trim() || null,
    displayName: username,
    avatarUrl: cleanText(input.discordAvatarUrl, 400) || null,
    sourceName: 'Discord',
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
  const thread = state.threads.find((item) => item.id === input.threadId && item.status !== 'hidden' && item.status !== 'deleted');
  if (!thread) throw new Error('thread_not_found');
  if (thread.status === 'locked' || thread.status === 'archived') throw new Error('thread_locked');
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
  if (discordStarterMessageId) {
    thread.discordStarterMessageId = discordStarterMessageId;
    const starter = state.posts.find((item) => item.threadId === threadId);
    if (starter && !starter.discordMessageId) starter.discordMessageId = discordStarterMessageId;
  }
  await writeState(state);
}

export async function setForumPostDiscordId(postId: string, discordMessageId: string): Promise<void> {
  const state = await readState();
  const post = state.posts.find((item) => item.id === postId);
  if (!post) return;
  post.discordMessageId = cleanText(discordMessageId, 80) || post.discordMessageId;
  await writeState(state);
}

export async function moderateForumThread(input: { threadId: string; action: 'open' | 'lock' | 'archive' | 'hide' | 'unhide' | 'delete' | 'pin' | 'unpin' }): Promise<{ thread: ForumThread; posts: ForumPost[] } | null> {
  const state = await readState();
  const thread = state.threads.find((item) => item.id === cleanText(input.threadId, 80));
  if (!thread) return null;
  const timestamp = nowIso();
  if (input.action === 'pin') thread.pinned = true;
  if (input.action === 'unpin') thread.pinned = false;
  if (input.action === 'open') thread.status = 'open';
  if (input.action === 'lock') thread.status = 'locked';
  if (input.action === 'archive') thread.status = 'archived';
  if (input.action === 'hide') thread.status = 'hidden';
  if (input.action === 'unhide') thread.status = 'open';
  if (input.action === 'delete') {
    thread.status = 'deleted';
    state.posts.forEach((post) => { if (post.threadId === thread.id) post.hidden = true; });
    state.reactions = state.reactions.filter((reaction) => !state.posts.some((post) => post.threadId === thread.id && post.id === reaction.postId));
  }
  thread.updatedAt = timestamp;
  thread.lastActivityAt = timestamp;
  await writeState(state);
  return { thread, posts: state.posts.filter((post) => post.threadId === thread.id) };
}

export async function moderateForumPost(input: { postId: string; action: 'hide' | 'unhide' | 'delete' }): Promise<{ post: ForumPost; thread: ForumThread; starterDeleted: boolean } | null> {
  const state = await readState();
  const post = state.posts.find((item) => item.id === cleanText(input.postId, 80));
  if (!post) return null;
  const thread = state.threads.find((item) => item.id === post.threadId);
  if (!thread) return null;
  const threadPosts = state.posts.filter((item) => item.threadId === thread.id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const starterDeleted = threadPosts[0]?.id === post.id && input.action !== 'unhide';
  if (input.action === 'unhide') post.hidden = false;
  if (input.action === 'hide' || input.action === 'delete') post.hidden = true;
  if (input.action === 'delete') state.reactions = state.reactions.filter((reaction) => reaction.postId !== post.id);
  if (starterDeleted) {
    thread.status = input.action === 'delete' ? 'deleted' : 'hidden';
    state.posts.forEach((item) => { if (item.threadId === thread.id) item.hidden = true; });
  }
  thread.postCount = state.posts.filter((item) => item.threadId === thread.id && !item.hidden).length;
  thread.updatedAt = nowIso();
  await writeState(state);
  return { post, thread, starterDeleted };
}

export async function hideDiscordImportedPost(input: { discordThreadId?: string | null; discordMessageId?: string | null }): Promise<{ ok: boolean }> {
  const state = await readState();
  const discordMessageId = cleanText(input.discordMessageId, 80);
  const discordThreadId = cleanText(input.discordThreadId, 80);
  if (discordThreadId && !discordMessageId) {
    const thread = state.threads.find((item) => item.discordThreadId === discordThreadId);
    if (thread) {
      thread.status = 'deleted';
      state.posts.forEach((post) => { if (post.threadId === thread.id) post.hidden = true; });
      await writeState(state);
      return { ok: true };
    }
  }
  const post = state.posts.find((item) => item.discordMessageId === discordMessageId);
  if (!post) return { ok: false };
  post.hidden = true;
  const thread = state.threads.find((item) => item.id === post.threadId);
  if (thread) thread.postCount = state.posts.filter((item) => item.threadId === thread.id && !item.hidden).length;
  await writeState(state);
  return { ok: true };
}

export async function createDiscordImportedThread(input: {
  discordThreadId: string;
  discordStarterMessageId?: string | null;
  discordUserId: string;
  discordUsername: string;
  discordAvatarUrl?: string | null;
  title: unknown;
  body: unknown;
  categoryId?: unknown;
  importUnlinked?: boolean;
}): Promise<{ thread: ForumThread; starter: ForumPost } | null> {
  const title = cleanTitle(input.title);
  const body = cleanText(input.body, 6000);
  if (title.length < 4 || body.length < 2) return null;

  const state = await readState();
  const existing = state.threads.find((thread) => thread.discordThreadId === input.discordThreadId);
  if (existing) {
    const starter = state.posts.find((post) => post.threadId === existing.id) ?? null;
    return starter ? { thread: existing, starter } : null;
  }

  const link = await getDiscordLinkForDiscordUser(input.discordUserId);
  if (link) {
    const result = await createForumThread({
      title,
      body,
      categoryId: input.categoryId,
      steamId: link.steamId,
      source: 'discord',
      discordThreadId: input.discordThreadId,
      discordStarterMessageId: input.discordStarterMessageId ?? null,
    });
    return { thread: result.thread, starter: result.starter };
  }

  if (!input.importUnlinked) return null;

  const timestamp = nowIso();
  const author = buildForumAuthorForDiscord(input);
  const thread: ForumThread = {
    id: id('thread'),
    title,
    excerpt: excerptFrom(body),
    categoryId: normalizeCategoryId(input.categoryId),
    kind: 'discussion',
    status: 'open',
    pinned: false,
    author,
    source: 'discord',
    discordThreadId: input.discordThreadId,
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
    source: 'discord',
    discordMessageId: input.discordStarterMessageId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    hidden: false,
  };
  state.threads.push(thread);
  state.posts.push(starter);
  await writeState(state);
  return { thread, starter };
}

export async function createDiscordImportedPost(input: {
  discordThreadId: string;
  discordMessageId: string;
  discordUserId: string;
  discordUsername: string;
  discordAvatarUrl?: string | null;
  body: unknown;
  importUnlinked?: boolean;
}): Promise<{ thread: ForumThread; post: ForumPost } | null> {
  const body = cleanText(input.body, 6000);
  if (body.length < 2) return null;
  const state = await readState();
  const thread = state.threads.find((item) => item.discordThreadId === input.discordThreadId && item.status !== 'hidden' && item.status !== 'deleted');
  if (!thread || thread.status === 'locked' || thread.status === 'archived') return null;
  if (state.posts.some((post) => post.discordMessageId === input.discordMessageId)) return null;
  const link = await getDiscordLinkForDiscordUser(input.discordUserId);

  if (link) {
    const result = await createForumPost({
      threadId: thread.id,
      body,
      steamId: link.steamId,
      source: 'discord',
      discordMessageId: input.discordMessageId,
    });
    return { thread: result.thread, post: result.post };
  }

  if (!input.importUnlinked) return null;

  const timestamp = nowIso();
  const author = buildForumAuthorForDiscord(input);
  const post: ForumPost = {
    id: id('post'),
    threadId: thread.id,
    body,
    author,
    source: 'discord',
    discordMessageId: input.discordMessageId,
    createdAt: timestamp,
    updatedAt: timestamp,
    hidden: false,
  };
  state.posts.push(post);
  thread.postCount = state.posts.filter((item) => item.threadId === thread.id && !item.hidden).length;
  thread.lastActivityAt = timestamp;
  thread.updatedAt = timestamp;
  await writeState(state);
  return { thread, post };
}

function linkCodeHash(code: string) {
  return crypto.createHash('sha256').update(`northline.discord-link.${code.trim().toUpperCase()}`).digest('hex');
}


export async function toggleForumPostReaction(input: { postId: string; steamId: string; emoji: unknown }): Promise<ForumPost> {
  const postId = cleanText(input.postId, 80);
  const steamId = String(input.steamId ?? '').trim();
  const emoji = cleanText(input.emoji, 8);
  if (!/^\d{15,20}$/.test(steamId)) throw new Error('sign_in_required');
  if (!FORUM_REACTION_CHOICES.some((choice) => choice.emoji === emoji)) throw new Error('invalid_reaction');
  const state = await readState();
  const post = state.posts.find((item) => item.id === postId && !item.hidden);
  if (!post) throw new Error('post_not_found');
  const existingIndex = state.reactions.findIndex((reaction) => reaction.postId === postId && reaction.steamId === steamId && reaction.emoji === emoji);
  if (existingIndex >= 0) {
    state.reactions.splice(existingIndex, 1);
  } else {
    state.reactions.push({ id: id('react'), postId, steamId, emoji, createdAt: nowIso() });
  }
  const next = await writeState(state);
  const decorated = decoratePostsWithReactions([post], next, steamId)[0];
  return decorated;
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
