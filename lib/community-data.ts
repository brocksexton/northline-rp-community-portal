import { mkdir, readFile, writeFile, statfs } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

export type ProfilePrivacy = 'public' | 'private';

export type ProfileShowcaseSettings = {
  economy: boolean;
  inventory: boolean;
  stats: boolean;
  properties: boolean;
  activity: boolean;
};

export const DEFAULT_PROFILE_SHOWCASE: ProfileShowcaseSettings = {
  economy: false,
  inventory: false,
  stats: false,
  properties: false,
  activity: false,
};

export type CommunityProfile = {
  steamId: string;
  privacy: ProfilePrivacy;
  bio?: string;
  location?: string;
  websiteUrl?: string;
  customAvatarUrl?: string;
  bannerColor?: string;
  showcase?: ProfileShowcaseSettings;
  updatedAt: string;
};

export type StatusUpdateTone = 'info' | 'event' | 'warning' | 'maintenance';

export type StatusUpdate = {
  id: string;
  title: string;
  body: string;
  tone: StatusUpdateTone;
  accentColor?: string;
  createdAt: string;
  createdBySteamId: string;
  createdByName: string;
  updatedAt?: string;
  updatedBySteamId?: string;
  updatedByName?: string;
};

export type MetricSample = {
  capturedAt: string;
  cpuPercent: number | null;
  ramUsedMb: number;
  ramTotalMb: number;
  ramPercent: number;
  diskUsedGb?: number | null;
  diskTotalGb?: number | null;
  diskPercent?: number | null;
  processRamMb: number;
  webUptimeSeconds: number;
  hostUptimeSeconds: number;
  requestCount: number;
};

type CommunityStore = {
  profiles: Record<string, CommunityProfile>;
  statusUpdates: StatusUpdate[];
  metricSamples: MetricSample[];
  requestCount: number;
  tweeterLikes: Record<string, string[]>;
};

const DEFAULT_STORE: CommunityStore = {
  profiles: {},
  statusUpdates: [],
  metricSamples: [],
  requestCount: 0,
  tweeterLikes: {},
};

type CpuSnapshot = { idle: number; total: number };
let previousCpuSnapshot: CpuSnapshot | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

function getCommunityDataPath(): string {
  return process.env.NORTHLINE_DATA_PATH?.trim() || path.join(process.cwd(), '.northline-data');
}

function getStorePath(): string {
  return path.join(getCommunityDataPath(), 'community-store.json');
}

async function ensureStoreDir() {
  await mkdir(getCommunityDataPath(), { recursive: true });
}

async function readStore(): Promise<CommunityStore> {
  try {
    const raw = await readFile(getStorePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<CommunityStore>;
    return {
      profiles: parsed.profiles ?? {},
      statusUpdates: parsed.statusUpdates ?? [],
      metricSamples: parsed.metricSamples ?? [],
      requestCount: parsed.requestCount ?? 0,
      tweeterLikes: parsed.tweeterLikes ?? {},
    };
  } catch {
    return { ...DEFAULT_STORE };
  }
}

async function getDiskUsage() {
  try {
    const stats = await statfs(process.cwd());
    const totalBytes = Number(stats.blocks) * Number(stats.bsize);
    const freeBytes = Number(stats.bfree) * Number(stats.bsize);
    if (!Number.isFinite(totalBytes) || totalBytes <= 0) return { diskUsedGb: null, diskTotalGb: null, diskPercent: null };
    const usedBytes = totalBytes - freeBytes;
    return {
      diskUsedGb: Math.round((usedBytes / 1024 / 1024 / 1024) * 10) / 10,
      diskTotalGb: Math.round((totalBytes / 1024 / 1024 / 1024) * 10) / 10,
      diskPercent: Math.round((usedBytes / totalBytes) * 100),
    };
  } catch {
    return { diskUsedGb: null, diskTotalGb: null, diskPercent: null };
  }
}

async function writeStore(store: CommunityStore): Promise<void> {
  await ensureStoreDir();
  await writeFile(getStorePath(), JSON.stringify(store, null, 2), 'utf8');
}

function enqueueStoreWrite(mutator: (store: CommunityStore) => Promise<CommunityStore> | CommunityStore) {
  writeQueue = writeQueue.then(async () => {
    const store = await readStore();
    const next = await mutator(store);
    await writeStore(next);
    return next;
  });
  return writeQueue as Promise<CommunityStore>;
}

function cpuSnapshot(): CpuSnapshot {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
  }
  return { idle, total };
}

function currentCpuPercent(): number | null {
  const current = cpuSnapshot();
  if (!previousCpuSnapshot) {
    previousCpuSnapshot = current;
    return null;
  }
  const idleDelta = current.idle - previousCpuSnapshot.idle;
  const totalDelta = current.total - previousCpuSnapshot.total;
  previousCpuSnapshot = current;
  if (totalDelta <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((1 - idleDelta / totalDelta) * 100)));
}

function normalizeShowcase(value: Partial<ProfileShowcaseSettings> | undefined | null): ProfileShowcaseSettings {
  return {
    economy: Boolean(value?.economy),
    inventory: Boolean(value?.inventory),
    stats: Boolean(value?.stats),
    properties: Boolean(value?.properties),
    activity: Boolean(value?.activity),
  };
}

function normalizeProfile(profile: CommunityProfile): CommunityProfile {
  return {
    ...profile,
    showcase: normalizeShowcase(profile.showcase),
  };
}

export async function getCommunityProfiles(): Promise<Record<string, CommunityProfile>> {
  const profiles = (await readStore()).profiles;
  return Object.fromEntries(Object.entries(profiles).map(([steamId, profile]) => [steamId, normalizeProfile(profile)]));
}

export async function getCommunityProfile(steamId: string): Promise<CommunityProfile | null> {
  const profiles = await getCommunityProfiles();
  return profiles[steamId] ?? null;
}

export async function upsertCommunityProfile(steamId: string, patch: Partial<CommunityProfile>): Promise<CommunityProfile> {
  const store = await enqueueStoreWrite((current) => {
    const existing = current.profiles[steamId];
    const next: CommunityProfile = {
      steamId,
      privacy: patch.privacy ?? existing?.privacy ?? 'public',
      bio: patch.bio ?? existing?.bio ?? '',
      location: patch.location ?? existing?.location ?? '',
      websiteUrl: patch.websiteUrl ?? existing?.websiteUrl ?? '',
      customAvatarUrl: patch.customAvatarUrl ?? existing?.customAvatarUrl ?? '',
      bannerColor: patch.bannerColor ?? existing?.bannerColor ?? '#1194f0',
      showcase: normalizeShowcase(patch.showcase ?? existing?.showcase ?? DEFAULT_PROFILE_SHOWCASE),
      updatedAt: new Date().toISOString(),
    };
    return {
      ...current,
      profiles: {
        ...current.profiles,
        [steamId]: next,
      },
    };
  });
  return store.profiles[steamId];
}


export async function getTweeterWebLikeState(tweetIds: string[], steamId: string | null): Promise<{ counts: Record<string, number>; likedTweetIds: Set<string> }> {
  const store = await readStore();
  const uniqueIds = [...new Set(tweetIds.map((id) => id.trim()).filter(Boolean))];
  const counts: Record<string, number> = {};
  const likedTweetIds = new Set<string>();

  for (const tweetId of uniqueIds) {
    const likers = [...new Set(store.tweeterLikes[tweetId] ?? [])];
    counts[tweetId] = likers.length;
    if (steamId && likers.includes(steamId)) likedTweetIds.add(tweetId);
  }

  return { counts, likedTweetIds };
}

export async function toggleTweeterWebLike(tweetId: string, steamId: string): Promise<{ liked: boolean; count: number }> {
  const safeTweetId = tweetId.trim();
  const safeSteamId = steamId.trim();
  if (!safeTweetId || !safeSteamId) return { liked: false, count: 0 };

  const store = await enqueueStoreWrite((current) => {
    const existing = [...new Set(current.tweeterLikes[safeTweetId] ?? [])];
    const alreadyLiked = existing.includes(safeSteamId);
    const nextLikes = alreadyLiked
      ? existing.filter((id) => id !== safeSteamId)
      : [...existing, safeSteamId];

    return {
      ...current,
      tweeterLikes: {
        ...current.tweeterLikes,
        [safeTweetId]: nextLikes,
      },
    };
  });

  const likers = [...new Set(store.tweeterLikes[safeTweetId] ?? [])];
  return { liked: likers.includes(safeSteamId), count: likers.length };
}

export async function getStatusUpdates(limit = 12): Promise<StatusUpdate[]> {
  const store = await readStore();
  return [...store.statusUpdates]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function createStatusUpdate(input: Omit<StatusUpdate, 'id' | 'createdAt' | 'updatedAt' | 'updatedBySteamId' | 'updatedByName'>): Promise<StatusUpdate> {
  const update: StatusUpdate = {
    ...input,
    id: crypto.randomUUID(),
    title: input.title.trim().slice(0, 80),
    body: input.body.trim().slice(0, 500),
    createdAt: new Date().toISOString(),
  };
  const store = await enqueueStoreWrite((current) => ({
    ...current,
    statusUpdates: [update, ...current.statusUpdates].slice(0, 80),
  }));
  return store.statusUpdates.find((item) => item.id === update.id) ?? update;
}

export async function updateStatusUpdate(
  id: string,
  patch: Pick<StatusUpdate, 'title' | 'body' | 'tone'> & Pick<Partial<StatusUpdate>, 'accentColor' | 'updatedBySteamId' | 'updatedByName'>,
): Promise<StatusUpdate | null> {
  const safeId = id.trim();
  if (!safeId) return null;

  const store = await enqueueStoreWrite((current) => {
    let found = false;
    const nextUpdates = current.statusUpdates.map((item) => {
      if (item.id !== safeId) return item;
      found = true;
      return {
        ...item,
        title: patch.title.trim().slice(0, 80),
        body: patch.body.trim().slice(0, 500),
        tone: patch.tone,
        accentColor: patch.accentColor,
        updatedAt: new Date().toISOString(),
        updatedBySteamId: patch.updatedBySteamId,
        updatedByName: patch.updatedByName,
      } satisfies StatusUpdate;
    });
    return found ? { ...current, statusUpdates: nextUpdates } : current;
  });

  return store.statusUpdates.find((item) => item.id === safeId) ?? null;
}

export async function deleteStatusUpdate(id: string): Promise<boolean> {
  const safeId = id.trim();
  if (!safeId) return false;
  let removed = false;
  await enqueueStoreWrite((current) => {
    const nextUpdates = current.statusUpdates.filter((item) => item.id !== safeId);
    removed = nextUpdates.length !== current.statusUpdates.length;
    return removed ? { ...current, statusUpdates: nextUpdates } : current;
  });
  return removed;
}

export async function getMetricSamples(limit = 144): Promise<MetricSample[]> {
  const store = await readStore();
  return [...store.metricSamples]
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
    .slice(-limit);
}

export async function captureMetricSample(): Promise<MetricSample> {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const processMemory = process.memoryUsage();
  const disk = await getDiskUsage();

  const store = await enqueueStoreWrite((current) => {
    const sample: MetricSample = {
      capturedAt: new Date().toISOString(),
      cpuPercent: currentCpuPercent(),
      ramUsedMb: Math.round(usedMemory / 1024 / 1024),
      ramTotalMb: Math.round(totalMemory / 1024 / 1024),
      ramPercent: Math.round((usedMemory / totalMemory) * 100),
      diskUsedGb: disk.diskUsedGb,
      diskTotalGb: disk.diskTotalGb,
      diskPercent: disk.diskPercent,
      processRamMb: Math.round(processMemory.rss / 1024 / 1024),
      webUptimeSeconds: Math.round(process.uptime()),
      hostUptimeSeconds: Math.round(os.uptime()),
      requestCount: (current.requestCount ?? 0) + 1,
    };

    const previous = current.metricSamples.at(-1);
    const shouldAppend = !previous || Date.now() - new Date(previous.capturedAt).getTime() > 30_000;
    return {
      ...current,
      requestCount: sample.requestCount,
      metricSamples: shouldAppend ? [...current.metricSamples, sample].slice(-720) : current.metricSamples,
    };
  });

  return store.metricSamples.at(-1) ?? {
    capturedAt: new Date().toISOString(),
    cpuPercent: null,
    ramUsedMb: Math.round(usedMemory / 1024 / 1024),
    ramTotalMb: Math.round(totalMemory / 1024 / 1024),
    ramPercent: Math.round((usedMemory / totalMemory) * 100),
    diskUsedGb: disk.diskUsedGb,
    diskTotalGb: disk.diskTotalGb,
    diskPercent: disk.diskPercent,
    processRamMb: Math.round(processMemory.rss / 1024 / 1024),
    webUptimeSeconds: Math.round(process.uptime()),
    hostUptimeSeconds: Math.round(os.uptime()),
    requestCount: 0,
  };
}
