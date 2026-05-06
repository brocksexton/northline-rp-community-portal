import { NextRequest, NextResponse } from 'next/server';
import { getPermissionsForSteamId, getPlayer, getRoleForSteamId, hasPermission } from '@/lib/ape-data';
import { getSessionSteamId, getSessionSteamIdFromRequest, noStoreHeaders } from '@/lib/session';
import { getSteamProfile } from '@/lib/steam-openid';

export type StaffIdentity = {
  steamId: string;
  displayName: string;
  role: string;
  permissions: string[];
};

export function canAccessServerAdministration(identity: Pick<StaffIdentity, 'role' | 'permissions'>): boolean {
  const role = identity.role.toLowerCase();
  return role === 'developer' || role === 'admin' || identity.permissions.includes('AdminTools') || identity.permissions.includes('ViewLogs') || identity.permissions.includes('ModifyServerSettings');
}

export function canRunServerPowerActions(identity: Pick<StaffIdentity, 'role' | 'permissions'>): boolean {
  const role = identity.role.toLowerCase();
  return role === 'developer' || identity.permissions.includes('ModifyServerSettings');
}

export function canRunModerationActions(identity: Pick<StaffIdentity, 'role' | 'permissions'>): boolean {
  const role = identity.role.toLowerCase();
  return role === 'developer' || role === 'admin' || identity.permissions.includes('AdminTools');
}

async function buildStaffIdentity(steamId: string): Promise<StaffIdentity> {
  const [role, permissions, player, steamProfile] = await Promise.all([
    getRoleForSteamId(steamId),
    getPermissionsForSteamId(steamId),
    getPlayer(steamId),
    getSteamProfile(steamId),
  ]);

  return {
    steamId,
    role,
    permissions,
    displayName: player?.RpDisplayName || player?.LastKnownDisplayName || steamProfile?.personaName || `Steam ${steamId.slice(-8)}`,
  };
}

export async function getCurrentStaffIdentity(): Promise<StaffIdentity | null> {
  const steamId = await getSessionSteamId();
  if (!steamId) return null;
  return buildStaffIdentity(steamId);
}

export async function requireServerAdministrationPage(): Promise<StaffIdentity | null> {
  const identity = await getCurrentStaffIdentity();
  if (!identity || !canAccessServerAdministration(identity)) return null;
  return identity;
}

export async function requireServerAdministrationRequest(request: NextRequest): Promise<{ identity: StaffIdentity } | { response: NextResponse }> {
  const steamId = getSessionSteamIdFromRequest(request);
  if (!steamId) return { response: NextResponse.json({ error: 'Steam sign-in required.' }, { status: 401, headers: noStoreHeaders() }) };
  const identity = await buildStaffIdentity(steamId);
  if (!canAccessServerAdministration(identity)) return { response: NextResponse.json({ error: 'Staff access required.' }, { status: 403, headers: noStoreHeaders() }) };
  return { identity };
}
