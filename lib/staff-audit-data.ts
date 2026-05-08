import { appendFile, mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { getConnectionEvents, getPlayersBySteamId, getRecentAdminLogs, getRoleAssignments, getRoleDefinitions, type AdminLog } from '@/lib/ape-data';
import { getRecentCommandQueue } from '@/lib/server-admin';
import type { StaffIdentity } from '@/lib/staff-auth';

export type StaffPageKey = 'activity' | 'audit' | 'cases' | 'discord' | 'jobs' | 'maintenance' | 'server' | 'site' | 'status' | 'tweeter';

export const STAFF_PAGE_DEFINITIONS: Array<{ id: StaffPageKey; label: string; href: string; description: string }> = [
  { id: 'activity', label: 'Activity Center', href: '/staff/activity', description: 'Recent admin, chat, and damage signals.' },
  { id: 'audit', label: 'Staff Audit', href: '/staff/audit', description: 'Staff accountability, access overrides, and action patterns.' },
  { id: 'cases', label: 'Daily Drops', href: '/staff/cases', description: 'Case rewards and drop configuration.' },
  { id: 'discord', label: 'Discord Manager', href: '/staff/discord', description: 'Discord bot panels, roles, and member tooling.' },
  { id: 'jobs', label: 'Applications', href: '/staff/jobs', description: 'Staff job postings and application review.' },
  { id: 'maintenance', label: 'Maintenance Studio', href: '/staff/maintenance', description: 'Site and Tweeter maintenance controls.' },
  { id: 'server', label: 'Server Control', href: '/staff/server', description: 'Live console, connected players, power controls, and moderation.' },
  { id: 'site', label: 'Site Settings', href: '/staff/site', description: 'Public features and Ape Tavern display staff.' },
  { id: 'status', label: 'Status Diagnostics', href: '/staff/status', description: 'Host, server, and heartbeat diagnostics.' },
  { id: 'tweeter', label: 'Tweeter Admin', href: '/staff/tweeter', description: 'Tweeter account and content moderation.' },
];

export type StaffAuditActionBreakdown = { type: string; count: number };

export type StaffAuditMember = {
  steamId: string;
  displayName: string;
  role: string;
  permissions: string[];
  lastWebsiteSignInAt: string | null;
  lastServerConnectionAt: string | null;
  lastSeenAt: string | null;
  daysSinceLastSeen: number | null;
  absenceSeverity: 'ok' | 'watch' | 'warning' | 'danger' | 'unknown';
  signIns30d: number;
  signInsAllTime: number;
  actionCount30d: number;
  actionCountAllTime: number;
  actionBreakdown30d: StaffAuditActionBreakdown[];
  disabledPages: StaffPageKey[];
};

export type StaffAuditState = {
  generatedAt: string;
  pages: typeof STAFF_PAGE_DEFINITIONS;
  staff: StaffAuditMember[];
  totals: {
    staffCount: number;
    dangerCount: number;
    warningCount: number;
    watchCount: number;
    overridesCount: number;
  };
};

type WebsiteSignInRecord = { steamId: string; signedInAt: string };
type StaffAccessOverrides = { users: Record<string, { disabledPages?: StaffPageKey[]; updatedAt?: string; updatedBy?: string; updatedByName?: string }> };

type ActionRecord = { staffSteamId: string; type: string; createdAt: string };

function dataDir() {
  return process.env.NORTHLINE_DATA_PATH?.trim() || path.join(process.cwd(), '.northline-data');
}

function signInPath() {
  return path.join(dataDir(), 'staff-website-signins.jsonl');
}

function accessOverridesPath() {
  return path.join(dataDir(), 'staff-access-overrides.json');
}

async function ensureDataDir() {
  await mkdir(dataDir(), { recursive: true });
}

function isStaffRole(role: string, permissions: string[]) {
  const normalized = role.trim().toLowerCase();
  return ['developer', 'admin', 'moderator'].includes(normalized) || permissions.some((permission) => ['AdminTools', 'ViewLogs', 'ModifyServerSettings'].includes(permission));
}

function parseDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function maxIso(values: Array<string | null | undefined>): string | null {
  let max = 0;
  let selected: string | null = null;
  for (const value of values) {
    const parsed = parseDate(value);
    if (parsed !== null && parsed > max) {
      max = parsed;
      selected = new Date(parsed).toISOString();
    }
  }
  return selected;
}

function daysSince(value: string | null): number | null {
  const parsed = parseDate(value);
  if (parsed === null) return null;
  return Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
}

function absenceSeverity(days: number | null): StaffAuditMember['absenceSeverity'] {
  if (days === null) return 'unknown';
  if (days >= 20) return 'danger';
  if (days >= 10) return 'warning';
  if (days >= 5) return 'watch';
  return 'ok';
}

function normalizePageId(value: unknown): StaffPageKey | null {
  const raw = String(value ?? '').trim().toLowerCase();
  return STAFF_PAGE_DEFINITIONS.some((page) => page.id === raw) ? raw as StaffPageKey : null;
}

async function readSignIns(): Promise<WebsiteSignInRecord[]> {
  try {
    const raw = await readFile(signInPath(), 'utf8');
    return raw.split(/\r?\n/).filter(Boolean).map((line: string) => JSON.parse(line) as WebsiteSignInRecord).filter((record: WebsiteSignInRecord) => /^\d{15,20}$/.test(record.steamId));
  } catch {
    return [];
  }
}

export async function recordStaffWebsiteSignIn(steamId: string) {
  if (!/^\d{15,20}$/.test(steamId)) return;
  await ensureDataDir();
  await appendFile(signInPath(), `${JSON.stringify({ steamId, signedInAt: new Date().toISOString() })}\n`, 'utf8');
}

export async function getStaffAccessOverrides(): Promise<StaffAccessOverrides> {
  try {
    const parsed = JSON.parse(await readFile(accessOverridesPath(), 'utf8')) as StaffAccessOverrides;
    const users: StaffAccessOverrides['users'] = {};
    for (const [steamId, value] of Object.entries(parsed.users ?? {})) {
      const disabledPages = Array.isArray(value.disabledPages) ? value.disabledPages.map(normalizePageId).filter(Boolean) as StaffPageKey[] : [];
      users[steamId] = { ...value, disabledPages: [...new Set(disabledPages)] };
    }
    return { users };
  } catch {
    return { users: {} };
  }
}

async function writeStaffAccessOverrides(overrides: StaffAccessOverrides) {
  await ensureDataDir();
  await writeFile(accessOverridesPath(), JSON.stringify(overrides, null, 2), 'utf8');
}

export async function isStaffPageDisabledForSteamId(steamId: string, page: StaffPageKey): Promise<boolean> {
  const overrides = await getStaffAccessOverrides();
  return overrides.users[steamId]?.disabledPages?.includes(page) ?? false;
}

export async function setStaffPageDisabled(input: { steamId: string; page: StaffPageKey; disabled: boolean; actor: Pick<StaffIdentity, 'steamId' | 'displayName'> }) {
  const page = normalizePageId(input.page);
  if (!/^\d{15,20}$/.test(input.steamId) || !page) throw new Error('Invalid staff member or page.');
  if (input.steamId === input.actor.steamId && page === 'audit' && input.disabled) throw new Error('You cannot remove your own Staff Audit access.');

  const overrides = await getStaffAccessOverrides();
  const current = overrides.users[input.steamId] ?? { disabledPages: [] };
  const disabledPages = new Set(current.disabledPages ?? []);
  if (input.disabled) disabledPages.add(page);
  else disabledPages.delete(page);
  overrides.users[input.steamId] = {
    ...current,
    disabledPages: [...disabledPages].sort(),
    updatedAt: new Date().toISOString(),
    updatedBy: input.actor.steamId,
    updatedByName: input.actor.displayName,
  };
  await writeStaffAccessOverrides(overrides);
}

function actionFromAdminLog(log: AdminLog): ActionRecord | null {
  const steamId = String(log.AdminSteamId ?? '').trim();
  if (!/^\d{15,20}$/.test(steamId)) return null;
  const createdAt = new Date(log.Timestamp).toISOString();
  if (!Number.isFinite(Date.parse(createdAt))) return null;
  return { staffSteamId: steamId, type: String(log.ActionType || log.Category || 'Admin action'), createdAt };
}

function addActionCount(map: Map<string, ActionRecord[]>, action: ActionRecord | null) {
  if (!action) return;
  const existing = map.get(action.staffSteamId) ?? [];
  existing.push(action);
  map.set(action.staffSteamId, existing);
}

function breakdown(actions: ActionRecord[]): StaffAuditActionBreakdown[] {
  const counts = new Map<string, number>();
  for (const action of actions) counts.set(action.type, (counts.get(action.type) ?? 0) + 1);
  return [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count || a.type.localeCompare(b.type)).slice(0, 8);
}

export async function getStaffAuditState(): Promise<StaffAuditState> {
  const [assignments, roles, playersBySteam, connectionEvents, signIns, adminLogs, webActions, overrides] = await Promise.all([
    getRoleAssignments(),
    getRoleDefinitions(),
    getPlayersBySteamId(),
    getConnectionEvents(),
    readSignIns(),
    getRecentAdminLogs(2500),
    getRecentCommandQueue(800),
    getStaffAccessOverrides(),
  ]);

  const roleByName = new Map(roles.map((role) => [role.Name, role]));
  const signInsBySteam = new Map<string, WebsiteSignInRecord[]>();
  for (const record of signIns) {
    const rows = signInsBySteam.get(record.steamId) ?? [];
    rows.push(record);
    signInsBySteam.set(record.steamId, rows);
  }

  const lastConnectionBySteam = new Map<string, string>();
  for (const event of connectionEvents) {
    if (!event.IsConnection) continue;
    const steamId = String(event.SteamId);
    const current = lastConnectionBySteam.get(steamId);
    lastConnectionBySteam.set(steamId, maxIso([current, event.Timestamp]) ?? event.Timestamp);
  }

  const actionsBySteam = new Map<string, ActionRecord[]>();
  for (const log of adminLogs) addActionCount(actionsBySteam, actionFromAdminLog(log));
  for (const record of webActions) addActionCount(actionsBySteam, {
    staffSteamId: record.actorSteamId,
    type: record.command.split(/\s+/).slice(0, 2).join(' ') || 'Web action',
    createdAt: record.createdAt,
  });

  const cutoff30d = Date.now() - 30 * 86_400_000;
  const staff = assignments
    .map((assignment) => {
      const steamId = String(assignment.SteamId);
      const role = assignment.RoleName;
      const permissions = roleByName.get(role)?.Permissions ?? [];
      if (!isStaffRole(role, permissions)) return null;
      const player = playersBySteam.get(steamId);
      const memberSignIns = (signInsBySteam.get(steamId) ?? []).filter((record) => parseDate(record.signedInAt) !== null).sort((a, b) => Date.parse(b.signedInAt) - Date.parse(a.signedInAt));
      const memberActions = (actionsBySteam.get(steamId) ?? []).filter((action) => parseDate(action.createdAt) !== null);
      const recentActions = memberActions.filter((action) => Date.parse(action.createdAt) >= cutoff30d);
      const lastWebsiteSignInAt = memberSignIns[0]?.signedInAt ?? null;
      const lastServerConnectionAt = lastConnectionBySteam.get(steamId) ?? null;
      const lastSeenAt = maxIso([lastWebsiteSignInAt, lastServerConnectionAt]);
      const days = daysSince(lastSeenAt);
      return {
        steamId,
        displayName: player?.RpDisplayName || player?.LastKnownDisplayName || `Steam ${steamId.slice(-8)}`,
        role,
        permissions,
        lastWebsiteSignInAt,
        lastServerConnectionAt,
        lastSeenAt,
        daysSinceLastSeen: days,
        absenceSeverity: absenceSeverity(days),
        signIns30d: memberSignIns.filter((record) => Date.parse(record.signedInAt) >= cutoff30d).length,
        signInsAllTime: memberSignIns.length,
        actionCount30d: recentActions.length,
        actionCountAllTime: memberActions.length,
        actionBreakdown30d: breakdown(recentActions),
        disabledPages: overrides.users[steamId]?.disabledPages ?? [],
      } satisfies StaffAuditMember;
    })
    .filter(Boolean) as StaffAuditMember[];

  staff.sort((a, b) => {
    const severityWeight = { danger: 0, warning: 1, watch: 2, unknown: 3, ok: 4 } as const;
    return severityWeight[a.absenceSeverity] - severityWeight[b.absenceSeverity]
      || (b.daysSinceLastSeen ?? -1) - (a.daysSinceLastSeen ?? -1)
      || a.displayName.localeCompare(b.displayName);
  });

  return {
    generatedAt: new Date().toISOString(),
    pages: STAFF_PAGE_DEFINITIONS,
    staff,
    totals: {
      staffCount: staff.length,
      dangerCount: staff.filter((member) => member.absenceSeverity === 'danger').length,
      warningCount: staff.filter((member) => member.absenceSeverity === 'warning').length,
      watchCount: staff.filter((member) => member.absenceSeverity === 'watch').length,
      overridesCount: staff.reduce((sum, member) => sum + member.disabledPages.length, 0),
    },
  };
}
