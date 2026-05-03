import { NextRequest, NextResponse } from 'next/server';
import { getPermissionsForSteamId, getPlayer, getRoleForSteamId, hasPermission } from '@/lib/ape-data';
import { getSessionSteamIdFromRequest, noStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ steamId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const sessionSteamId = getSessionSteamIdFromRequest(_request);
  const { steamId } = await params;

  const canView = sessionSteamId === steamId || (await hasPermission(sessionSteamId, 'ViewLogs'));
  if (!canView) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: noStoreHeaders() });
  }

  const player = await getPlayer(steamId);
  if (!player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404, headers: noStoreHeaders() });
  }

  const [role, permissions] = await Promise.all([
    getRoleForSteamId(steamId),
    getPermissionsForSteamId(steamId),
  ]);

  return NextResponse.json({ player, role, permissions }, { headers: noStoreHeaders() });
}
