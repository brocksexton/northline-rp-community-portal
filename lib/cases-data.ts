import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export type CaseRewardKind = 'cash' | 'item' | 'utility' | 'special';

export type CaseRewardDefinition = {
  id: string;
  label: string;
  description: string;
  kind: CaseRewardKind;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  weight: number;
  value?: number;
  itemId?: string;
};

export type CaseDefinition = {
  id: string;
  label: string;
  description: string;
  status: 'active' | 'retired';
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

export const CASE_DEFINITIONS: CaseDefinition[] = [
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

function dataDir() {
  return process.env.NORTHLINE_DATA_PATH?.trim() || path.join(process.cwd(), '.northline-data');
}

function storePath() {
  return path.join(dataDir(), 'daily-cases-store.json');
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

function dailyCase() {
  return CASE_DEFINITIONS.find((item) => item.id === 'daily-city-supply') ?? CASE_DEFINITIONS[0];
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
  const rewards = definition.rewards.filter((reward) => reward.weight > 0);
  const total = rewards.reduce((sum, reward) => sum + reward.weight, 0);
  let roll = crypto.randomInt(Math.max(1, total));
  for (const reward of rewards) {
    if (roll < reward.weight) return { ...reward, rolledAt: new Date().toISOString() };
    roll -= reward.weight;
  }
  return { ...rewards[0], rolledAt: new Date().toISOString() };
}

export async function getCasesState(steamId: string) {
  const store = await readStore();
  const definition = dailyCase();
  const inventory = store.claimedCases
    .filter((item) => item.steamId === steamId)
    .sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime());
  const lastClaim = store.lastDailyClaimBySteamId[steamId];
  const claimAvailableAt = nextClaimAt(lastClaim, definition.cadenceHours);
  return {
    definitions: CASE_DEFINITIONS,
    dailyCase: definition,
    inventory,
    unopenedCount: inventory.filter((item) => !item.openedAt).length,
    openedCount: inventory.filter((item) => Boolean(item.openedAt)).length,
    rewards: inventory.filter((item) => item.reward).map((item) => ({ caseItemId: item.id, claimedAt: item.claimedAt, openedAt: item.openedAt, reward: item.reward })),
    canClaim: isClaimReady(lastClaim, definition.cadenceHours),
    claimAvailableAt,
  };
}

export async function claimDailyCase(steamId: string) {
  const store = await readStore();
  const definition = dailyCase();
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
  const store = await readStore();
  const item = store.claimedCases.find((entry) => entry.id === caseItemId && entry.steamId === steamId);
  if (!item) return { ok: false as const, reason: 'missing', state: await getCasesState(steamId) };
  if (item.openedAt || item.reward) return { ok: false as const, reason: 'already_opened', state: await getCasesState(steamId) };
  const definition = CASE_DEFINITIONS.find((entry) => entry.id === item.caseId) ?? dailyCase();
  const reward = rollReward(definition);
  item.openedAt = new Date().toISOString();
  item.reward = reward;
  await writeStore(store);
  return { ok: true as const, item, reward, state: await getCasesState(steamId) };
}
