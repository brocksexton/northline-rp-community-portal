import crypto from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { DEFAULT_TEXT_FILTER_RULES, type TextFilterMatchMode, type TextFilterReason, type TextFilterRule } from '@/lib/content-filter';

type ContentFilterStore = {
  version: 1;
  rules: TextFilterRule[];
  updatedAt: string;
};

type UpsertRuleInput = {
  id?: unknown;
  term?: unknown;
  reason?: unknown;
  matchMode?: unknown;
};

function dataDir() {
  return process.env.NORTHLINE_DATA_PATH?.trim() || path.join(process.cwd(), '.northline-data');
}

function storePath() {
  return path.join(dataDir(), 'tweeter-content-filter-store.json');
}

async function ensureDir() {
  await mkdir(dataDir(), { recursive: true });
}

function cleanReason(value: unknown): TextFilterReason {
  return value === 'slur' ? 'slur' : 'profanity';
}

function cleanMatchMode(value: unknown): TextFilterMatchMode {
  return value === 'contains' ? 'contains' : 'word';
}

function cleanTerm(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function normalizeRule(rule: Partial<TextFilterRule>): TextFilterRule | null {
  const id = String(rule.id || crypto.randomUUID()).trim();
  const term = cleanTerm(rule.term);
  if (!id || !term) return null;
  return {
    id,
    term,
    reason: cleanReason(rule.reason),
    matchMode: cleanMatchMode(rule.matchMode),
  };
}

function normalizeRules(value: unknown): TextFilterRule[] {
  const raw = Array.isArray(value) ? value : DEFAULT_TEXT_FILTER_RULES;
  const seen = new Set<string>();
  const rules: TextFilterRule[] = [];
  for (const item of raw) {
    const rule = normalizeRule(item as Partial<TextFilterRule>);
    if (!rule) continue;
    const key = `${rule.term.toLowerCase()}::${rule.reason}::${rule.matchMode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rules.push(rule);
  }
  return rules.sort((a, b) => a.reason.localeCompare(b.reason) || a.term.localeCompare(b.term));
}

function normalizeStore(value: unknown): ContentFilterStore {
  if (!value || typeof value !== 'object') return { version: 1, rules: normalizeRules(DEFAULT_TEXT_FILTER_RULES), updatedAt: new Date().toISOString() };
  const raw = value as Partial<ContentFilterStore>;
  return {
    version: 1,
    rules: normalizeRules(raw.rules),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
  };
}

async function readStore(): Promise<ContentFilterStore> {
  try {
    const raw = await readFile(storePath(), 'utf8');
    return normalizeStore(JSON.parse(raw));
  } catch {
    return { version: 1, rules: normalizeRules(DEFAULT_TEXT_FILTER_RULES), updatedAt: new Date().toISOString() };
  }
}

async function writeStore(store: ContentFilterStore) {
  await ensureDir();
  const normalized = normalizeStore({ ...store, updatedAt: new Date().toISOString() });
  await writeFile(storePath(), `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

export async function listTweeterContentFilterRules(): Promise<TextFilterRule[]> {
  const store = await readStore();
  return store.rules;
}

export async function upsertTweeterContentFilterRule(input: UpsertRuleInput): Promise<TextFilterRule> {
  const term = cleanTerm(input.term);
  if (!term) throw new Error('invalid_term');

  const store = await readStore();
  const requestedId = String(input.id || '').trim();
  const existingIndex = requestedId ? store.rules.findIndex((rule) => rule.id === requestedId) : -1;
  const rule: TextFilterRule = {
    id: existingIndex >= 0 ? store.rules[existingIndex].id : crypto.randomUUID(),
    term,
    reason: cleanReason(input.reason),
    matchMode: cleanMatchMode(input.matchMode),
  };

  const duplicate = store.rules.find((candidate, index) => index !== existingIndex
    && candidate.term.toLowerCase() === rule.term.toLowerCase()
    && candidate.reason === rule.reason
    && (candidate.matchMode ?? 'word') === (rule.matchMode ?? 'word'));
  if (duplicate) throw new Error('duplicate_rule');

  if (existingIndex >= 0) store.rules[existingIndex] = rule;
  else store.rules.push(rule);
  await writeStore(store);
  return rule;
}

export async function deleteTweeterContentFilterRule(id: unknown) {
  const cleanId = String(id ?? '').trim();
  if (!cleanId) throw new Error('invalid_rule');
  const store = await readStore();
  const before = store.rules.length;
  store.rules = store.rules.filter((rule) => rule.id !== cleanId);
  if (store.rules.length === before) throw new Error('not_found');
  await writeStore(store);
}

export async function resetTweeterContentFilterRules() {
  const store = await writeStore({ version: 1, rules: normalizeRules(DEFAULT_TEXT_FILTER_RULES), updatedAt: new Date().toISOString() });
  return store.rules;
}
