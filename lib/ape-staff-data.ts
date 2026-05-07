import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { APE_TAVERN_BADGE_IMAGE_PATH, APE_TAVERN_BADGE_KIND, DEFAULT_APE_TAVERN_STAFF_IDS, type ApeStaffState } from '@/lib/ape-staff-shared';

export { APE_TAVERN_BADGE_IMAGE_PATH, APE_TAVERN_BADGE_KIND, DEFAULT_APE_TAVERN_STAFF_IDS, type ApeStaffState } from '@/lib/ape-staff-shared';

function dataDir() {
  return process.env.NORTHLINE_DATA_PATH?.trim() || path.join(process.cwd(), '.northline-data');
}

function statePath() {
  return path.join(dataDir(), 'ape-tavern-staff.json');
}

async function ensureDir() {
  await mkdir(dataDir(), { recursive: true });
}

function clean(value: unknown, fallback: string, max = 120) {
  const raw = String(value ?? '').trim();
  return (raw || fallback).slice(0, max);
}

function normalizeSteamId(value: unknown) {
  const digits = String(value ?? '').trim().replace(/\D+/g, '');
  return /^\d{15,20}$/.test(digits) ? digits : '';
}

export function normalizeApeStaffState(input: unknown): ApeStaffState {
  const raw = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const inputIds = Array.isArray(raw.staffSteamIds)
    ? raw.staffSteamIds.map(normalizeSteamId)
    : DEFAULT_APE_TAVERN_STAFF_IDS.map((steamId) => normalizeSteamId(steamId));
  const seen = new Set<string>();
  const staffSteamIds = inputIds.filter((steamId) => {
    if (!steamId || seen.has(steamId)) return false;
    seen.add(steamId);
    return true;
  });
  return {
    badgeLabel: clean(raw.badgeLabel, APE_TAVERN_BADGE_KIND, 80),
    badgeImagePath: clean(raw.badgeImagePath, APE_TAVERN_BADGE_IMAGE_PATH, 200),
    staffSteamIds: staffSteamIds.length ? staffSteamIds : [...DEFAULT_APE_TAVERN_STAFF_IDS],
    updatedAt: raw.updatedAt ? clean(raw.updatedAt, '', 80) : null,
    updatedBy: raw.updatedBy ? clean(raw.updatedBy, '', 32) : null,
  };
}

function defaultState(): ApeStaffState {
  return normalizeApeStaffState({
    badgeLabel: APE_TAVERN_BADGE_KIND,
    badgeImagePath: APE_TAVERN_BADGE_IMAGE_PATH,
    staffSteamIds: [...DEFAULT_APE_TAVERN_STAFF_IDS],
    updatedAt: null,
    updatedBy: null,
  });
}

export async function getApeStaffState(): Promise<ApeStaffState> {
  try {
    const raw = await readFile(statePath(), 'utf8');
    return normalizeApeStaffState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

export async function saveApeStaffState(input: unknown, updatedBy: string): Promise<ApeStaffState> {
  const normalized = normalizeApeStaffState(input);
  const next: ApeStaffState = {
    ...normalized,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  await ensureDir();
  await writeFile(statePath(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

export async function getApeStaffSteamIds(): Promise<Set<string>> {
  const state = await getApeStaffState();
  return new Set(state.staffSteamIds);
}

export async function isApeStaffSteamId(steamId: string | null | undefined): Promise<boolean> {
  if (!steamId) return false;
  const ids = await getApeStaffSteamIds();
  return ids.has(String(steamId));
}

export async function resolveVerifiedBadgeKind(steamId: string, role: string, fallbackKind?: string | null): Promise<string> {
  const state = await getApeStaffState();
  if (state.staffSteamIds.includes(steamId)) return state.badgeLabel || APE_TAVERN_BADGE_KIND;
  const normalizedRole = (role || '').trim();
  if (normalizedRole && normalizedRole !== 'User') return normalizedRole;
  return clean(fallbackKind, 'None', 80) || 'None';
}

export function parseSteamIdList(value: unknown): string[] {
  const source = Array.isArray(value)
    ? value.map((item) => String(item ?? ''))
    : String(value ?? '').split(/[,\n]/g);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of source) {
    const normalized = normalizeSteamId(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}
