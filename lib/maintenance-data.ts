import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export type MaintenanceTheme = 'blueprint' | 'midnight' | 'sunrise' | 'arcade' | 'garage' | 'cityhall';
export type MaintenanceLayout = 'centered' | 'split' | 'compact';
export type MaintenanceIcon = 'wrench' | 'traffic' | 'coffee' | 'broadcast' | 'moon' | 'sparkles';
export type TweeterMaintenanceTheme = 'twitter-blue' | 'dim' | 'lights-out' | 'classic';

export type MaintenanceSettings = {
  enabled: boolean;
  headline: string;
  message: string;
  countdownEndsAt: string | null;
  theme: MaintenanceTheme;
  layout: MaintenanceLayout;
  icon: MaintenanceIcon;
  kicker: string;
  accentColor: string;
  showDiscordButton: boolean;
  discordUrl: string;
  allowTweeterDuringMaintenance: boolean;
  showTweeterButton: boolean;
  tweeterButtonLabel: string;
  showCustomButton: boolean;
  customButtonLabel: string;
  customButtonUrl: string;
  tweeterMaintenanceEnabled: boolean;
  tweeterMaintenanceHeadline: string;
  tweeterMaintenanceMessage: string;
  tweeterMaintenanceCountdownEndsAt: string | null;
  tweeterMaintenanceTheme: TweeterMaintenanceTheme;
  tweeterMaintenanceKicker: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

const DEFAULT_SETTINGS: MaintenanceSettings = {
  enabled: false,
  headline: 'Northline is getting a quick tune-up.',
  message: 'The site is closed for a bit while staff works on it. Check back soon, or hop into Discord for updates.',
  countdownEndsAt: null,
  theme: 'blueprint',
  layout: 'split',
  icon: 'wrench',
  kicker: 'Quick maintenance',
  accentColor: '#0ea5e9',
  showDiscordButton: true,
  discordUrl: 'https://discord.gg/VExsvp4PXT',
  allowTweeterDuringMaintenance: false,
  showTweeterButton: true,
  tweeterButtonLabel: 'Visit Tweeter',
  showCustomButton: false,
  customButtonLabel: 'Read the update',
  customButtonUrl: 'https://discord.gg/VExsvp4PXT',
  tweeterMaintenanceEnabled: false,
  tweeterMaintenanceHeadline: 'Tweeter is taking a quick break.',
  tweeterMaintenanceMessage: 'The feed is paused while staff works on it. Check back soon.',
  tweeterMaintenanceCountdownEndsAt: null,
  tweeterMaintenanceTheme: 'twitter-blue',
  tweeterMaintenanceKicker: 'Tweeter',
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
  return ['blueprint', 'midnight', 'sunrise', 'arcade', 'garage', 'cityhall'].includes(String(value)) ? String(value) as MaintenanceTheme : 'blueprint';
}

function sanitizeLayout(value: unknown): MaintenanceLayout {
  return ['centered', 'split', 'compact'].includes(String(value)) ? String(value) as MaintenanceLayout : DEFAULT_SETTINGS.layout;
}

function sanitizeIcon(value: unknown): MaintenanceIcon {
  return ['wrench', 'traffic', 'coffee', 'broadcast', 'moon', 'sparkles'].includes(String(value)) ? String(value) as MaintenanceIcon : DEFAULT_SETTINGS.icon;
}

function sanitizeTweeterTheme(value: unknown): TweeterMaintenanceTheme {
  return ['twitter-blue', 'dim', 'lights-out', 'classic'].includes(String(value)) ? String(value) as TweeterMaintenanceTheme : DEFAULT_SETTINGS.tweeterMaintenanceTheme;
}

function sanitizeAccent(value: unknown): string {
  const raw = String(value ?? '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : DEFAULT_SETTINGS.accentColor;
}

function sanitizeUrl(value: unknown, fallback = DEFAULT_SETTINGS.discordUrl): string {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : fallback;
  } catch {
    return fallback;
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
    message: shortText(input.message, DEFAULT_SETTINGS.message, 420),
    countdownEndsAt: sanitizeCountdown(input.countdownEndsAt),
    theme: sanitizeTheme(input.theme),
    layout: sanitizeLayout(input.layout),
    icon: sanitizeIcon(input.icon),
    kicker: shortText(input.kicker, DEFAULT_SETTINGS.kicker, 50),
    accentColor: sanitizeAccent(input.accentColor),
    showDiscordButton: input.showDiscordButton === undefined ? DEFAULT_SETTINGS.showDiscordButton : Boolean(input.showDiscordButton),
    discordUrl: sanitizeUrl(input.discordUrl),
    allowTweeterDuringMaintenance: input.allowTweeterDuringMaintenance === undefined ? DEFAULT_SETTINGS.allowTweeterDuringMaintenance : Boolean(input.allowTweeterDuringMaintenance),
    showTweeterButton: input.showTweeterButton === undefined ? DEFAULT_SETTINGS.showTweeterButton : Boolean(input.showTweeterButton),
    tweeterButtonLabel: shortText(input.tweeterButtonLabel, DEFAULT_SETTINGS.tweeterButtonLabel, 36),
    showCustomButton: input.showCustomButton === undefined ? DEFAULT_SETTINGS.showCustomButton : Boolean(input.showCustomButton),
    customButtonLabel: shortText(input.customButtonLabel, DEFAULT_SETTINGS.customButtonLabel, 36),
    customButtonUrl: sanitizeUrl(input.customButtonUrl, DEFAULT_SETTINGS.customButtonUrl),
    tweeterMaintenanceEnabled: input.tweeterMaintenanceEnabled === undefined ? DEFAULT_SETTINGS.tweeterMaintenanceEnabled : Boolean(input.tweeterMaintenanceEnabled),
    tweeterMaintenanceHeadline: shortText(input.tweeterMaintenanceHeadline, DEFAULT_SETTINGS.tweeterMaintenanceHeadline, 90),
    tweeterMaintenanceMessage: shortText(input.tweeterMaintenanceMessage, DEFAULT_SETTINGS.tweeterMaintenanceMessage, 300),
    tweeterMaintenanceCountdownEndsAt: sanitizeCountdown(input.tweeterMaintenanceCountdownEndsAt),
    tweeterMaintenanceTheme: sanitizeTweeterTheme(input.tweeterMaintenanceTheme),
    tweeterMaintenanceKicker: shortText(input.tweeterMaintenanceKicker, DEFAULT_SETTINGS.tweeterMaintenanceKicker, 42),
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

export function isTweeterMaintenanceActive(settings: MaintenanceSettings): boolean {
  return settings.tweeterMaintenanceEnabled;
}
