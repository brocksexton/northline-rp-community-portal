import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export type MaintenanceTheme = 'blueprint' | 'midnight' | 'sunrise' | 'arcade';

export type MaintenanceSettings = {
  enabled: boolean;
  headline: string;
  message: string;
  countdownEndsAt: string | null;
  theme: MaintenanceTheme;
  accentColor: string;
  showDiscordButton: boolean;
  discordUrl: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

const DEFAULT_SETTINGS: MaintenanceSettings = {
  enabled: false,
  headline: 'Northline is getting a quick tune-up.',
  message: 'The website is temporarily closed while staff works on it. Check back soon, or hop into Discord for updates.',
  countdownEndsAt: null,
  theme: 'blueprint',
  accentColor: '#0ea5e9',
  showDiscordButton: true,
  discordUrl: 'https://discord.gg/VExsvp4PXT',
  updatedAt: null,
  updatedBy: null,
};

function dataDir() {
  return process.env.NORTHLINE_DATA_PATH?.trim() || path.join(process.cwd(), '.northline-data');
}

function settingsPath() {
  return path.join(dataDir(), 'site-maintenance.json');
}

async function ensureDir() {
  await mkdir(dataDir(), { recursive: true });
}

function sanitizeTheme(value: unknown): MaintenanceTheme {
  return ['blueprint', 'midnight', 'sunrise', 'arcade'].includes(String(value)) ? String(value) as MaintenanceTheme : 'blueprint';
}

function sanitizeAccent(value: unknown): string {
  const raw = String(value ?? '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : DEFAULT_SETTINGS.accentColor;
}

function sanitizeUrl(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return DEFAULT_SETTINGS.discordUrl;
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : DEFAULT_SETTINGS.discordUrl;
  } catch {
    return DEFAULT_SETTINGS.discordUrl;
  }
}

function sanitizeCountdown(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const time = new Date(raw).getTime();
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString();
}

function shortText(value: unknown, fallback: string, max: number): string {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim();
  return raw ? raw.slice(0, max) : fallback;
}

export function normalizeMaintenanceSettings(input: Partial<MaintenanceSettings> | Record<string, unknown>, updatedBy?: string | null): MaintenanceSettings {
  return {
    enabled: Boolean(input.enabled),
    headline: shortText(input.headline, DEFAULT_SETTINGS.headline, 90),
    message: shortText(input.message, DEFAULT_SETTINGS.message, 360),
    countdownEndsAt: sanitizeCountdown(input.countdownEndsAt),
    theme: sanitizeTheme(input.theme),
    accentColor: sanitizeAccent(input.accentColor),
    showDiscordButton: input.showDiscordButton === undefined ? DEFAULT_SETTINGS.showDiscordButton : Boolean(input.showDiscordButton),
    discordUrl: sanitizeUrl(input.discordUrl),
    updatedAt: input.updatedAt ? String(input.updatedAt) : new Date().toISOString(),
    updatedBy: updatedBy ?? (input.updatedBy ? String(input.updatedBy) : null),
  };
}

export async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<MaintenanceSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...normalizeMaintenanceSettings({ ...DEFAULT_SETTINGS, ...parsed }),
      updatedAt: parsed.updatedAt ?? null,
      updatedBy: parsed.updatedBy ?? null,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveMaintenanceSettings(input: Partial<MaintenanceSettings> | Record<string, unknown>, updatedBy: string): Promise<MaintenanceSettings> {
  const settings = normalizeMaintenanceSettings(input, updatedBy);
  await ensureDir();
  await writeFile(settingsPath(), JSON.stringify(settings, null, 2), 'utf8');
  return settings;
}

export function isMaintenanceActive(settings: MaintenanceSettings): boolean {
  return settings.enabled;
}
