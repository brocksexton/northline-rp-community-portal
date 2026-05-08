import { NextRequest, NextResponse } from 'next/server';
import { getPermissionsForSteamId, getPlayer, getRoleForSteamId } from '@/lib/ape-data';
import { getSessionSteamId, getSessionSteamIdFromRequest, noStoreHeaders } from '@/lib/session';
import { getSteamProfile } from '@/lib/steam-openid';
import { isApeStaffSteamId } from '@/lib/ape-staff-data';
import { APE_TAVERN_BADGE_KIND } from '@/lib/ape-staff-shared';
import { isStaffPageDisabledForSteamId, type StaffPageKey } from '@/lib/staff-audit-data';

export type StaffIdentity = {
  steamId: string;
  displayName: string;
  role: string;
  permissions: string[];
  isApeTavernStaff: boolean;
  roleLabel: string;
};

function normalizedRole(role: string) {
  return (role || '').trim().toLowerCase();
}

function isBadgeOnlyIdentity(identity: Pick<StaffIdentity, 'isApeTavernStaff'>): boolean {
  return identity.isApeTavernStaff;
}

export function canManageSiteConfiguration(identity: Pick<StaffIdentity, 'role' | 'permissions' | 'isApeTavernStaff'>): boolean {
  if (isBadgeOnlyIdentity(identity)) return false;
  const role = normalizedRole(identity.role);
  return role === 'developer' || identity.permissions.includes('AdminTools') || identity.permissions.includes('ModifyServerSettings');
}

export function canAccessServerAdministration(identity: Pick<StaffIdentity, 'role' | 'permissions' | 'isApeTavernStaff'>): boolean {
  if (isBadgeOnlyIdentity(identity)) return false;
  const role = normalizedRole(identity.role);
  return role === 'developer' || role === 'admin' || role === 'moderator' || identity.permissions.includes('AdminTools') || identity.permissions.includes('ViewLogs') || identity.permissions.includes('ModifyServerSettings');
}

export function canRunServerPowerActions(identity: Pick<StaffIdentity, 'role' | 'permissions' | 'isApeTavernStaff'>): boolean {
  if (isBadgeOnlyIdentity(identity)) return false;
  const role = normalizedRole(identity.role);
  return role === 'developer' || identity.permissions.includes('ModifyServerSettings');
}

export function canRunModerationActions(identity: Pick<StaffIdentity, 'role' | 'permissions' | 'isApeTavernStaff'>): boolean {
  if (isBadgeOnlyIdentity(identity)) return false;
  const role = normalizedRole(identity.role);
  return role === 'developer' || role === 'admin' || identity.permissions.includes('AdminTools');
}

export function canManageTweeterConfiguration(identity: Pick<StaffIdentity, 'role' | 'permissions' | 'isApeTavernStaff'>): boolean {
  if (isBadgeOnlyIdentity(identity)) return false;
  const role = normalizedRole(identity.role);
  return role === 'developer' || identity.permissions.includes('AdminTools');
}

export function canManageJobPostings(identity: Pick<StaffIdentity, 'role' | 'permissions' | 'isApeTavernStaff'>): boolean {
  if (isBadgeOnlyIdentity(identity)) return false;
  const role = normalizedRole(identity.role);
  return role === 'developer' || identity.permissions.includes('AdminTools');
}

export function canReviewJobApplications(identity: Pick<StaffIdentity, 'role' | 'permissions' | 'isApeTavernStaff'>): boolean {
  if (isBadgeOnlyIdentity(identity)) return false;
  const role = normalizedRole(identity.role);
  return role === 'developer' || role === 'admin' || role === 'moderator' || identity.permissions.includes('ViewLogs') || identity.permissions.includes('AdminTools');
}

export function canPostStatusUpdates(identity: Pick<StaffIdentity, 'role' | 'permissions' | 'isApeTavernStaff'>): boolean {
  if (isBadgeOnlyIdentity(identity)) return false;
  const role = normalizedRole(identity.role);
  return role === 'developer' || role === 'admin' || identity.permissions.includes('AdminTools') || identity.permissions.includes('ModifyServerSettings');
}

export function canManageStaffAudit(identity: Pick<StaffIdentity, 'role' | 'permissions' | 'isApeTavernStaff'>): boolean {
  if (isBadgeOnlyIdentity(identity)) return false;
  const role = normalizedRole(identity.role);
  return role === 'developer' || role === 'admin';
}

export async function canAccessStaffPage(identity: Pick<StaffIdentity, 'steamId' | 'role' | 'permissions' | 'isApeTavernStaff'>, page: StaffPageKey): Promise<boolean> {
  if (!canAccessServerAdministration(identity)) return false;
  if (page === 'audit' && !canManageStaffAudit(identity)) return false;
  return !(await isStaffPageDisabledForSteamId(identity.steamId, page));
}


async function buildStaffIdentity(steamId: string): Promise<StaffIdentity> {
  const [role, permissions, player, steamProfile, isApeTavernStaff] = await Promise.all([
    getRoleForSteamId(steamId),
    getPermissionsForSteamId(steamId),
    getPlayer(steamId),
    getSteamProfile(steamId),
    isApeStaffSteamId(steamId),
  ]);

  return {
    steamId,
    role,
    permissions,
    isApeTavernStaff,
    roleLabel: isApeTavernStaff ? APE_TAVERN_BADGE_KIND : role,
    displayName: player?.RpDisplayName || player?.LastKnownDisplayName || steamProfile?.personaName || `Steam ${steamId.slice(-8)}`,
  };
}

export async function getCurrentStaffIdentity(): Promise<StaffIdentity | null> {
  const steamId = await getSessionSteamId();
  if (!steamId) return null;
  return buildStaffIdentity(steamId);
}

export async function requireServerAdministrationPage(page?: StaffPageKey): Promise<StaffIdentity | null> {
  const identity = await getCurrentStaffIdentity();
  if (!identity || !canAccessServerAdministration(identity)) return null;
  if (page && !(await canAccessStaffPage(identity, page))) return null;
  return identity;
}

export async function requireServerAdministrationRequest(request: NextRequest, page?: StaffPageKey): Promise<{ identity: StaffIdentity } | { response: NextResponse }> {
  const steamId = getSessionSteamIdFromRequest(request);
  if (!steamId) return { response: NextResponse.json({ error: 'Steam sign-in required.' }, { status: 401, headers: noStoreHeaders() }) };
  const identity = await buildStaffIdentity(steamId);
  if (!canAccessServerAdministration(identity)) return { response: NextResponse.json({ error: 'Staff access required.' }, { status: 403, headers: noStoreHeaders() }) };
  if (page && !(await canAccessStaffPage(identity, page))) return { response: NextResponse.json({ error: 'This staff page has been disabled for your account.' }, { status: 403, headers: noStoreHeaders() }) };
  return { identity };
}

export async function getRequestStaffIdentity(request: NextRequest): Promise<StaffIdentity | null> {
  const steamId = getSessionSteamIdFromRequest(request);
  if (!steamId) return null;
  return buildStaffIdentity(steamId);
}
