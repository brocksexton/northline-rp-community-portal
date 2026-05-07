import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export type SiteFeatureId =
  | 'status'
  | 'tweeter'
  | 'players'
  | 'leaderboards'
  | 'dailyDrops'
  | 'jobs'
  | 'guides'
  | 'rules'
  | 'bans'
  | 'support'
  | 'devBlog'
  | 'shop';

export type SiteFeatureDefinition = {
  id: SiteFeatureId;
  label: string;
  href: string;
  icon: string;
  description: string;
  area: 'navigation' | 'community' | 'commerce';
  locked?: boolean;
};

export type SiteFeatureState = SiteFeatureDefinition & {
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type SiteFeatureSettings = {
  features: SiteFeatureState[];
  updatedAt: string | null;
  updatedBy: string | null;
};

export const SITE_FEATURE_DEFINITIONS: SiteFeatureDefinition[] = [
  { id: 'status', label: 'Status', href: '/status', icon: 'fa-solid fa-signal', description: 'Server state and activity.', area: 'navigation' },
  { id: 'tweeter', label: 'Tweeter', href: '/tweeter', icon: 'fa-brands fa-twitter', description: 'In-character city chatter and profiles.', area: 'community' },
  { id: 'players', label: 'Players', href: '/players', icon: 'fa-solid fa-users', description: 'Public citizen profiles and discovery.', area: 'community' },
  { id: 'leaderboards', label: 'Leaderboards', href: '/leaderboards', icon: 'fa-solid fa-ranking-star', description: 'Public rankings and brag boards.', area: 'community' },
  { id: 'dailyDrops', label: 'Daily Drops', href: '/cases', icon: 'fa-solid fa-gift', description: 'Daily case claims and reward inventory.', area: 'community' },
  { id: 'jobs', label: 'Staff Apps', href: '/jobs', icon: 'fa-solid fa-briefcase', description: 'Staff job postings and guided applications.', area: 'community' },
  { id: 'guides', label: 'Guides', href: '/guides', icon: 'fa-solid fa-book-open-reader', description: 'Getting started, onboarding, and tips.', area: 'navigation' },
  { id: 'rules', label: 'Rules', href: '/rules', icon: 'fa-solid fa-scale-balanced', description: 'Community rules and roleplay expectations.', area: 'navigation' },
  { id: 'bans', label: 'Bans', href: '/bans', icon: 'fa-solid fa-gavel', description: 'Public moderation records.', area: 'navigation' },
  { id: 'support', label: 'Support', href: '/support', icon: 'fa-solid fa-life-ring', description: 'Help links and issue reporting.', area: 'navigation' },
  { id: 'devBlog', label: 'Dev Blog', href: '/dev-blog', icon: 'fa-solid fa-newspaper', description: 'Release notes and portal development updates.', area: 'navigation' },
  { id: 'shop', label: 'Shop', href: '/shop', icon: 'fa-solid fa-store', description: 'Future supporter shop and cosmetic perks.', area: 'commerce' },
];

const DEFAULT_ENABLED: Record<SiteFeatureId, boolean> = {
  status: true,
  tweeter: true,
  players: true,
  leaderboards: true,
  dailyDrops: true,
  jobs: true,
  guides: true,
  rules: true,
  bans: true,
  support: true,
  devBlog: true,
  shop: false,
};

function dataDir() {
  return process.env.NORTHLINE_DATA_PATH?.trim() || path.join(process.cwd(), '.northline-data');
}

function settingsPath() {
  return path.join(dataDir(), 'site-features.json');
}

async function ensureDir() {
  await mkdir(dataDir(), { recursive: true });
}

function defaultSettings(): SiteFeatureSettings {
  return {
    features: SITE_FEATURE_DEFINITIONS.map((feature) => ({
      ...feature,
      enabled: DEFAULT_ENABLED[feature.id],
      updatedAt: null,
      updatedBy: null,
    })),
    updatedAt: null,
    updatedBy: null,
  };
}

function isKnownFeatureId(value: unknown): value is SiteFeatureId {
  return SITE_FEATURE_DEFINITIONS.some((feature) => feature.id === value);
}

export function normalizeSiteFeatureSettings(input: unknown): SiteFeatureSettings {
  const defaults = defaultSettings();
  const raw = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const rawFeatures = Array.isArray(raw.features) ? raw.features : [];
  const byId = new Map<SiteFeatureId, Partial<SiteFeatureState>>();

  for (const item of rawFeatures) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (!isKnownFeatureId(record.id)) continue;
    byId.set(record.id, {
      enabled: Boolean(record.enabled),
      updatedAt: record.updatedAt ? String(record.updatedAt) : null,
      updatedBy: record.updatedBy ? String(record.updatedBy) : null,
    });
  }

  return {
    features: defaults.features.map((feature) => {
      const patch = byId.get(feature.id);
      return patch ? { ...feature, ...patch } : feature;
    }),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : null,
    updatedBy: raw.updatedBy ? String(raw.updatedBy) : null,
  };
}

export async function getSiteFeatureSettings(): Promise<SiteFeatureSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return normalizeSiteFeatureSettings(JSON.parse(raw));
  } catch {
    return defaultSettings();
  }
}

export async function saveSiteFeatureSettings(input: unknown, updatedBy: string): Promise<SiteFeatureSettings> {
  const now = new Date().toISOString();
  const normalized = normalizeSiteFeatureSettings(input);
  const current = await getSiteFeatureSettings();
  const previousById = new Map(current.features.map((feature) => [feature.id, feature]));
  const settings: SiteFeatureSettings = {
    features: normalized.features.map((feature) => {
      const previous = previousById.get(feature.id);
      const changed = !previous || previous.enabled !== feature.enabled;
      return {
        ...feature,
        updatedAt: changed ? now : previous?.updatedAt ?? feature.updatedAt,
        updatedBy: changed ? updatedBy : previous?.updatedBy ?? feature.updatedBy,
      };
    }),
    updatedAt: now,
    updatedBy,
  };
  await ensureDir();
  await writeFile(settingsPath(), JSON.stringify(settings, null, 2), 'utf8');
  return settings;
}

export async function isSiteFeatureEnabled(featureId: SiteFeatureId): Promise<boolean> {
  const settings = await getSiteFeatureSettings();
  return settings.features.find((feature) => feature.id === featureId)?.enabled ?? DEFAULT_ENABLED[featureId] ?? false;
}

export function isFeatureEnabledInSettings(settings: SiteFeatureSettings, featureId: SiteFeatureId): boolean {
  return settings.features.find((feature) => feature.id === featureId)?.enabled ?? DEFAULT_ENABLED[featureId] ?? false;
}

export function enabledFeatureIds(settings: SiteFeatureSettings): Set<SiteFeatureId> {
  return new Set(settings.features.filter((feature) => feature.enabled).map((feature) => feature.id));
}

export function featureById(settings: SiteFeatureSettings, featureId: SiteFeatureId): SiteFeatureState | undefined {
  return settings.features.find((feature) => feature.id === featureId);
}
