import { NextRequest, NextResponse } from 'next/server';
import { getPermissionsForSteamId, getPlayer, getRoleForSteamId } from '@/lib/ape-data';
import { getSessionSteamIdFromRequest, noStoreHeaders } from '@/lib/session';
import { getSteamProfile } from '@/lib/steam-openid';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);

  if (!steamId) {
    return NextResponse.json({ authenticated: false }, { status: 401, headers: noStoreHeaders() });
  }

  const [profile, player, role, permissions] = await Promise.all([
    getSteamProfile(steamId),
    getPlayer(steamId),
    getRoleForSteamId(steamId),
    getPermissionsForSteamId(steamId),
  ]);

  return NextResponse.json({
    authenticated: true,
    steamId,
    profile,
    player,
    role,
    permissions,
  }, { headers: noStoreHeaders() });
}
