import crypto from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export type FollowState = {
  following: boolean;
  followerCount: number;
  followingCount: number;
};

export type DirectMessage = {
  id: string;
  fromSteamId: string;
  toSteamId: string;
  body: string;
  createdAt: string;
};

export type ConversationSummary = {
  otherSteamId: string;
  lastMessage: DirectMessage;
  unreadCount: number;
};

type FollowRecord = {
  fromSteamId: string;
  toSteamId: string;
  createdAt: string;
};

type SocialStore = {
  version: 1;
  follows: FollowRecord[];
  messages: DirectMessage[];
  reads: Record<string, Record<string, string>>;
};

const EMPTY_STORE: SocialStore = {
  version: 1,
  follows: [],
  messages: [],
  reads: {},
};

function dataDir() {
  return process.env.NORTHLINE_DATA_PATH?.trim() || path.join(process.cwd(), '.northline-data');
}

function storePath() {
  return path.join(dataDir(), 'tweeter-social-store.json');
}

async function ensureDir() {
  await mkdir(dataDir(), { recursive: true });
}

function isSteamId(value: unknown): value is string {
  return /^\d{15,20}$/.test(String(value ?? '').trim());
}

function cleanSteamId(value: unknown): string | null {
  const clean = String(value ?? '').trim();
  return isSteamId(clean) ? clean : null;
}

function sanitizeBody(value: unknown): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .slice(0, 1000);
}

function normalizeStore(input: unknown): SocialStore {
  if (!input || typeof input !== 'object') return { ...EMPTY_STORE, follows: [], messages: [], reads: {} };
  const raw = input as Partial<SocialStore>;
  const follows = Array.isArray(raw.follows)
    ? raw.follows
        .map((follow) => ({
          fromSteamId: cleanSteamId((follow as Partial<FollowRecord>).fromSteamId) ?? '',
          toSteamId: cleanSteamId((follow as Partial<FollowRecord>).toSteamId) ?? '',
          createdAt: String((follow as Partial<FollowRecord>).createdAt ?? new Date().toISOString()),
        }))
        .filter((follow) => follow.fromSteamId && follow.toSteamId && follow.fromSteamId !== follow.toSteamId)
    : [];

  const messages = Array.isArray(raw.messages)
    ? raw.messages
        .map((message) => ({
          id: String((message as Partial<DirectMessage>).id ?? crypto.randomUUID()),
          fromSteamId: cleanSteamId((message as Partial<DirectMessage>).fromSteamId) ?? '',
          toSteamId: cleanSteamId((message as Partial<DirectMessage>).toSteamId) ?? '',
          body: sanitizeBody((message as Partial<DirectMessage>).body),
          createdAt: String((message as Partial<DirectMessage>).createdAt ?? new Date().toISOString()),
        }))
        .filter((message) => message.fromSteamId && message.toSteamId && message.body)
    : [];

  const reads: Record<string, Record<string, string>> = {};
  if (raw.reads && typeof raw.reads === 'object') {
    for (const [reader, conversations] of Object.entries(raw.reads)) {
      const cleanReader = cleanSteamId(reader);
      if (!cleanReader || !conversations || typeof conversations !== 'object') continue;
      reads[cleanReader] = {};
      for (const [other, value] of Object.entries(conversations as Record<string, unknown>)) {
        const cleanOther = cleanSteamId(other);
        const time = new Date(String(value ?? '')).getTime();
        if (cleanOther && Number.isFinite(time)) reads[cleanReader][cleanOther] = new Date(time).toISOString();
      }
    }
  }

  return { version: 1, follows, messages, reads };
}

async function readStore(): Promise<SocialStore> {
  try {
    const raw = await readFile(storePath(), 'utf8');
    return normalizeStore(JSON.parse(raw));
  } catch {
    return { ...EMPTY_STORE, follows: [], messages: [], reads: {} };
  }
}

async function writeStore(store: SocialStore) {
  await ensureDir();
  const normalized = normalizeStore(store);
  await writeFile(storePath(), `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
}

function followerCount(store: SocialStore, targetSteamId: string): number {
  return new Set(store.follows.filter((follow) => follow.toSteamId === targetSteamId).map((follow) => follow.fromSteamId)).size;
}

function followingCount(store: SocialStore, steamId: string): number {
  return new Set(store.follows.filter((follow) => follow.fromSteamId === steamId).map((follow) => follow.toSteamId)).size;
}

function isFollowing(store: SocialStore, viewerSteamId: string | null | undefined, targetSteamId: string): boolean {
  if (!viewerSteamId || viewerSteamId === targetSteamId) return false;
  return store.follows.some((follow) => follow.fromSteamId === viewerSteamId && follow.toSteamId === targetSteamId);
}

export async function getFollowState(viewerSteamId: string | null | undefined, targetSteamId: string | null | undefined): Promise<FollowState> {
  const target = cleanSteamId(targetSteamId);
  if (!target) return { following: false, followerCount: 0, followingCount: 0 };
  const viewer = cleanSteamId(viewerSteamId);
  const store = await readStore();
  return {
    following: isFollowing(store, viewer, target),
    followerCount: followerCount(store, target),
    followingCount: followingCount(store, target),
  };
}

export async function getFollowStates(viewerSteamId: string | null | undefined, targetSteamIds: string[]): Promise<Record<string, FollowState>> {
  const viewer = cleanSteamId(viewerSteamId);
  const targets = [...new Set(targetSteamIds.map(cleanSteamId).filter((value): value is string => !!value))];
  const store = await readStore();
  return Object.fromEntries(targets.map((target) => [target, {
    following: isFollowing(store, viewer, target),
    followerCount: followerCount(store, target),
    followingCount: followingCount(store, target),
  }]));
}

export async function setFollowState(viewerSteamId: string, targetSteamId: string, follow?: boolean): Promise<FollowState> {
  const viewer = cleanSteamId(viewerSteamId);
  const target = cleanSteamId(targetSteamId);
  if (!viewer || !target || viewer === target) throw new Error('invalid_follow_target');

  const store = await readStore();
  const existing = store.follows.some((record) => record.fromSteamId === viewer && record.toSteamId === target);
  const shouldFollow = typeof follow === 'boolean' ? follow : !existing;

  if (shouldFollow && !existing) {
    store.follows.push({ fromSteamId: viewer, toSteamId: target, createdAt: new Date().toISOString() });
  } else if (!shouldFollow && existing) {
    store.follows = store.follows.filter((record) => !(record.fromSteamId === viewer && record.toSteamId === target));
  }

  await writeStore(store);
  return {
    following: shouldFollow,
    followerCount: followerCount(store, target),
    followingCount: followingCount(store, target),
  };
}

function sameConversation(message: DirectMessage, one: string, two: string): boolean {
  return (message.fromSteamId === one && message.toSteamId === two) || (message.fromSteamId === two && message.toSteamId === one);
}

function readTime(store: SocialStore, readerSteamId: string, otherSteamId: string): number {
  const raw = store.reads[readerSteamId]?.[otherSteamId];
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

export async function getConversation(currentSteamId: string, otherSteamId: string, markRead = false): Promise<DirectMessage[]> {
  const current = cleanSteamId(currentSteamId);
  const other = cleanSteamId(otherSteamId);
  if (!current || !other) return [];

  const store = await readStore();
  const messages = store.messages
    .filter((message) => sameConversation(message, current, other))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (markRead) {
    store.reads[current] = { ...(store.reads[current] ?? {}), [other]: new Date().toISOString() };
    await writeStore(store);
  }

  return messages;
}

export async function getConversationSummaries(currentSteamId: string): Promise<ConversationSummary[]> {
  const current = cleanSteamId(currentSteamId);
  if (!current) return [];
  const store = await readStore();
  const byOther = new Map<string, DirectMessage[]>();

  for (const message of store.messages) {
    if (message.fromSteamId !== current && message.toSteamId !== current) continue;
    const other = message.fromSteamId === current ? message.toSteamId : message.fromSteamId;
    const list = byOther.get(other) ?? [];
    list.push(message);
    byOther.set(other, list);
  }

  const summaries: ConversationSummary[] = [];
  for (const [otherSteamId, messages] of byOther.entries()) {
    const sorted = messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const lastMessage = sorted[0];
    if (!lastMessage) continue;
    const readAfter = readTime(store, current, otherSteamId);
    const unreadCount = messages.filter((message) => message.toSteamId === current && new Date(message.createdAt).getTime() > readAfter).length;
    summaries.push({ otherSteamId, lastMessage, unreadCount });
  }

  return summaries.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
}

export async function sendDirectMessage(fromSteamId: string, toSteamId: string, body: unknown): Promise<DirectMessage> {
  const from = cleanSteamId(fromSteamId);
  const to = cleanSteamId(toSteamId);
  const cleanBody = sanitizeBody(body);
  if (!from || !to || from === to) throw new Error('invalid_recipient');
  if (!cleanBody) throw new Error('empty_message');

  const store = await readStore();
  const message: DirectMessage = {
    id: crypto.randomUUID(),
    fromSteamId: from,
    toSteamId: to,
    body: cleanBody,
    createdAt: new Date().toISOString(),
  };
  store.messages.push(message);

  // Keep the JSON file from growing forever in the early website-only implementation.
  if (store.messages.length > 5000) {
    store.messages = store.messages
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5000)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  await writeStore(store);
  return message;
}
