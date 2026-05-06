import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export type CaseRewardKind = 'cash' | 'item' | 'utility' | 'special';
export type CaseRewardRarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type CaseStatus = 'active' | 'hidden' | 'retired';

export type CaseRewardDefinition = {
  id: string;
  label: string;
  description: string;
  kind: CaseRewardKind;
  icon: string;
  rarity: CaseRewardRarity;
  weight: number;
  hidden?: boolean;
  value?: number;
  itemId?: string;
};

export type CaseDefinition = {
  id: string;
  label: string;
  description: string;
  status: CaseStatus;
  cadenceHours: number;
  accent: string;
  rewards: CaseRewardDefinition[];
};

export type CaseRewardRecord = CaseRewardDefinition & {
  rolledAt: string;
};

export type ClaimedCase = {
  id: string;
  steamId: string;
  caseId: string;
  claimedAt: string;
  openedAt?: string;
  reward?: CaseRewardRecord;
};

type CaseStore = {
  claimedCases: ClaimedCase[];
  lastDailyClaimBySteamId: Record<string, string>;
};

const DEFAULT_STORE: CaseStore = { claimedCases: [], lastDailyClaimBySteamId: {} };

export const DEFAULT_CASE_DEFINITIONS: CaseDefinition[] = [
  {
    id: 'daily-city-supply',
    label: 'Daily City Supply Case',
    description: 'A free daily case with small useful rewards for checking in on the website.',
    status: 'active',
    cadenceHours: 24,
    accent: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
    rewards: [
      { id: 'cash-250', label: '$250 city cash', description: 'A small wallet boost for errands, snacks, or questionable ideas.', kind: 'cash', icon: 'fa-solid fa-sack-dollar', rarity: 'common', weight: 38, value: 250 },
      { id: 'cash-750', label: '$750 city cash', description: 'A nicer payday for the next time you load in.', kind: 'cash', icon: 'fa-solid fa-money-bill-wave', rarity: 'uncommon', weight: 24, value: 750 },
      { id: 'cash-1500', label: '$1,500 city cash', description: 'A lucky little windfall.', kind: 'cash', icon: 'fa-solid fa-vault', rarity: 'rare', weight: 10, value: 1500 },
      { id: 'food-drink-pack', label: 'Snack run voucher', description: 'A simple food and drink bundle for a future in-game bridge.', kind: 'utility', icon: 'fa-solid fa-burger', rarity: 'common', weight: 20, itemId: 'utility.food_drink_pack' },
      { id: 'repair-kit', label: 'Repair kit voucher', description: 'A useful item voucher for staff or bridge fulfillment later.', kind: 'item', icon: 'fa-solid fa-screwdriver-wrench', rarity: 'uncommon', weight: 7, itemId: 'item.repair_kit' },
      { id: 'assault-rifle', label: 'Assault Rifle voucher', description: 'A rare item voucher. Fulfillment waits for a safe game bridge or staff tool.', kind: 'item', icon: 'fa-solid fa-crosshairs', rarity: 'legendary', weight: 1, itemId: 'weapon.assault_rifle' },
    ],
  },
];

// Backward-compatible static export for older imports. Runtime reads use getCaseDefinitions().
export const CASE_DEFINITIONS: CaseDefinition[] = DEFAULT_CASE_DEFINITIONS;

function dataDir() {
  return process.env.NORTHLINE_DATA_PATH?.trim() || path.join(process.cwd(), '.northline-data');
}

function storePath() {
  return path.join(dataDir(), 'daily-cases-store.json');
}

function definitionsPath() {
  return path.join(dataDir(), 'daily-cases-config.json');
}

async function ensureDir() {
  await mkdir(dataDir(), { recursive: true });
}

async function readStore(): Promise<CaseStore> {
  try {
    const raw = await readFile(storePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<CaseStore>;
    return {
      claimedCases: parsed.claimedCases ?? [],
      lastDailyClaimBySteamId: parsed.lastDailyClaimBySteamId ?? {},
    };
  } catch {
    return { ...DEFAULT_STORE };
  }
}

async function writeStore(store: CaseStore) {
  await ensureDir();
  await writeFile(storePath(), JSON.stringify(store, null, 2), 'utf8');
}

function slugify(value: unknown, fallback: string) {
  const raw = String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  return raw || fallback;
}

function shortText(value: unknown, fallback: string, max: number) {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim();
  return raw ? raw.slice(0, max) : fallback;
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function rewardKind(value: unknown): CaseRewardKind {
  return ['cash', 'item', 'utility', 'special'].includes(String(value)) ? String(value) as CaseRewardKind : 'item';
}

function rewardRarity(value: unknown): CaseRewardRarity {
  return ['common', 'uncommon', 'rare', 'legendary'].includes(String(value)) ? String(value) as CaseRewardRarity : 'common';
}

function caseStatus(value: unknown): CaseStatus {
  return ['active', 'hidden', 'retired'].includes(String(value)) ? String(value) as CaseStatus : 'hidden';
}

function normalizeReward(input: unknown, index: number): CaseRewardDefinition {
  const item = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const label = shortText(item.label, `Reward ${index + 1}`, 80);
  const fallbackId = `reward-${index + 1}`;
  const value = item.value === '' || item.value === undefined || item.value === null ? undefined : Math.round(boundedNumber(item.value, 0, 0, 1_000_000_000));
  const itemId = String(item.itemId ?? '').trim().slice(0, 120) || undefined;

  return {
    id: slugify(item.id, slugify(label, fallbackId)),
    label,
    description: shortText(item.description, 'A configurable website reward.', 220),
    kind: rewardKind(item.kind),
    icon: shortText(item.icon, 'fa-solid fa-gift', 80),
    rarity: rewardRarity(item.rarity),
    weight: Math.round(boundedNumber(item.weight, 1, 0, 1_000_000)),
    hidden: Boolean(item.hidden),
    ...(value === undefined ? {} : { value }),
    ...(itemId ? { itemId } : {}),
  };
}

export function normalizeCaseDefinition(input: unknown, index: number): CaseDefinition {
  const item = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const label = shortText(item.label, `Daily Drop ${index + 1}`, 80);
  const rewards = Array.isArray(item.rewards) ? item.rewards.map(normalizeReward) : [];
  const safeRewards = rewards.length ? rewards : [normalizeReward({ label: '$250 city cash', kind: 'cash', rarity: 'common', weight: 1, value: 250 }, 0)];

  return {
    id: slugify(item.id, slugify(label, `daily-drop-${index + 1}`)),
    label,
    description: shortText(item.description, 'A configurable daily drop for website check-ins.', 280),
    status: caseStatus(item.status),
    cadenceHours: boundedNumber(item.cadenceHours, 24, 1, 720),
    accent: shortText(item.accent, 'linear-gradient(135deg, #0ea5e9, #2563eb)', 140),
    rewards: safeRewards,
  };
}

export function normalizeCaseDefinitions(input: unknown): CaseDefinition[] {
  const raw = Array.isArray(input) ? input : (typeof input === 'object' && input !== null && Array.isArray((input as Record<string, unknown>).definitions) ? (input as Record<string, unknown>).definitions as unknown[] : DEFAULT_CASE_DEFINITIONS);
  const seen = new Set<string>();
  return raw.map(normalizeCaseDefinition).map((definition, index) => {
    let id = definition.id;
    while (seen.has(id)) id = `${definition.id}-${index + 1}`;
    seen.add(id);
    return { ...definition, id };
  });
}

export async function getCaseDefinitions(): Promise<CaseDefinition[]> {
  try {
    const raw = await readFile(definitionsPath(), 'utf8');
    return normalizeCaseDefinitions(JSON.parse(raw));
  } catch {
    return normalizeCaseDefinitions(DEFAULT_CASE_DEFINITIONS);
  }
}

export async function saveCaseDefinitions(input: unknown): Promise<CaseDefinition[]> {
  const definitions = normalizeCaseDefinitions(input);
  await ensureDir();
  await writeFile(definitionsPath(), JSON.stringify({ definitions, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  return definitions;
}

function publicDefinitions(definitions: CaseDefinition[]) {
  return definitions
    .filter((definition) => definition.status === 'active')
    .map((definition) => ({ ...definition, rewards: definition.rewards.filter((reward) => !reward.hidden) }));
}

function dailyCase(definitions: CaseDefinition[]) {
  return publicDefinitions(definitions).find((item) => item.rewards.some((reward) => reward.weight > 0)) ?? null;
}

function nextClaimAt(lastClaim: string | undefined, cadenceHours: number) {
  if (!lastClaim) return null;
  const time = new Date(lastClaim).getTime();
  if (!Number.isFinite(time)) return null;
  return new Date(time + cadenceHours * 60 * 60 * 1000).toISOString();
}

function isClaimReady(lastClaim: string | undefined, cadenceHours: number) {
  const next = nextClaimAt(lastClaim, cadenceHours);
  if (!next) return true;
  return Date.now() >= new Date(next).getTime();
}

function rollReward(definition: CaseDefinition): CaseRewardRecord {
  const rewards = definition.rewards.filter((reward) => !reward.hidden && reward.weight > 0);
  if (!rewards.length) {
    return { id: 'empty', label: 'No reward configured', description: 'This case did not have an active reward pool.', kind: 'special', icon: 'fa-solid fa-circle-question', rarity: 'common', weight: 1, rolledAt: new Date().toISOString() };
  }
  const total = rewards.reduce((sum, reward) => sum + reward.weight, 0);
  let roll = crypto.randomInt(Math.max(1, total));
  for (const reward of rewards) {
    if (roll < reward.weight) return { ...reward, rolledAt: new Date().toISOString() };
    roll -= reward.weight;
  }
  return { ...rewards[0], rolledAt: new Date().toISOString() };
}

export async function getCasesState(steamId: string) {
  const [store, allDefinitions] = await Promise.all([readStore(), getCaseDefinitions()]);
  const definitions = publicDefinitions(allDefinitions);
  const definition = dailyCase(allDefinitions);
  const inventory = store.claimedCases
    .filter((item) => item.steamId === steamId)
    .sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime());
  const lastClaim = store.lastDailyClaimBySteamId[steamId];
  const claimAvailableAt = definition ? nextClaimAt(lastClaim, definition.cadenceHours) : null;
  return {
    definitions,
    dailyCase: definition,
    inventory,
    unopenedCount: inventory.filter((item) => !item.openedAt).length,
    openedCount: inventory.filter((item) => Boolean(item.openedAt)).length,
    rewards: inventory.filter((item) => item.reward).map((item) => ({ caseItemId: item.id, claimedAt: item.claimedAt, openedAt: item.openedAt, reward: item.reward })),
    canClaim: definition ? isClaimReady(lastClaim, definition.cadenceHours) : false,
    claimAvailableAt,
  };
}

export async function claimDailyCase(steamId: string) {
  const [store, definitions] = await Promise.all([readStore(), getCaseDefinitions()]);
  const definition = dailyCase(definitions);
  if (!definition) return { ok: false as const, reason: 'disabled', state: await getCasesState(steamId) };
  if (!isClaimReady(store.lastDailyClaimBySteamId[steamId], definition.cadenceHours)) {
    return { ok: false as const, reason: 'not_ready', state: await getCasesState(steamId) };
  }
  const now = new Date().toISOString();
  const item: ClaimedCase = { id: crypto.randomUUID(), steamId, caseId: definition.id, claimedAt: now };
  store.claimedCases = [item, ...store.claimedCases].slice(0, 5000);
  store.lastDailyClaimBySteamId[steamId] = now;
  await writeStore(store);
  return { ok: true as const, item, state: await getCasesState(steamId) };
}

export async function openClaimedCase(steamId: string, caseItemId: string) {
  const [store, definitions] = await Promise.all([readStore(), getCaseDefinitions()]);
  const item = store.claimedCases.find((entry) => entry.id === caseItemId && entry.steamId === steamId);
  if (!item) return { ok: false as const, reason: 'missing', state: await getCasesState(steamId) };
  if (item.openedAt || item.reward) return { ok: false as const, reason: 'already_opened', state: await getCasesState(steamId) };
  const definition = definitions.find((entry) => entry.id === item.caseId) ?? dailyCase(definitions);
  if (!definition) return { ok: false as const, reason: 'disabled', state: await getCasesState(steamId) };
  const reward = rollReward(definition);
  item.openedAt = new Date().toISOString();
  item.reward = reward;
  await writeStore(store);
  return { ok: true as const, item, reward, state: await getCasesState(steamId) };
}

export async function getDailyDropsAdminState() {
  const [definitions, store] = await Promise.all([getCaseDefinitions(), readStore()]);
  return {
    definitions,
    claimedCount: store.claimedCases.length,
    openedCount: store.claimedCases.filter((item) => item.openedAt).length,
    activeCount: definitions.filter((item) => item.status === 'active').length,
    hiddenCount: definitions.filter((item) => item.status === 'hidden').length,
    retiredCount: definitions.filter((item) => item.status === 'retired').length,
    updatedAt: new Date().toISOString(),
  };
}
