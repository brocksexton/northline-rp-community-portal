import { NextRequest, NextResponse } from 'next/server';
import { getRoleForSteamId, hasPermission } from '@/lib/ape-data';
import { getSessionSteamIdFromRequest, jsonWithSession, noStoreHeaders } from '@/lib/session';
import { listTweeterAccountModeration, setTweeterAccountModeration } from '@/lib/tweeter-moderation-data';

export const dynamic = 'force-dynamic';

async function getAccess(steamId: string | null) {
  if (!steamId) return { allowed: false, canManage: false, role: 'Guest' };
  const role = await getRoleForSteamId(steamId);
  const developer = role.toLowerCase() === 'developer';
  const allowed = developer || await hasPermission(steamId, 'ViewLogs');
  return { allowed, canManage: developer, role };
}

export async function GET(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);
  const access = await getAccess(steamId);
  if (!steamId || !access.allowed) return NextResponse.json({ error: 'Staff access required.' }, { status: 403, headers: noStoreHeaders() });
  const accounts = await listTweeterAccountModeration();
  return jsonWithSession({ accounts, canManage: access.canManage, role: access.role }, { headers: noStoreHeaders() }, steamId, request);
}

export async function POST(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);
  const access = await getAccess(steamId);
  if (!steamId || !access.allowed) return NextResponse.json({ error: 'Staff access required.' }, { status: 403, headers: noStoreHeaders() });
  if (!access.canManage) return NextResponse.json({ error: 'Developer access required to change Tweeter account restrictions.' }, { status: 403, headers: noStoreHeaders() });

  const body = await request.json().catch(() => ({}));
  try {
    const account = await setTweeterAccountModeration({
      steamId: body.steamId,
      status: body.status,
      reason: body.reason,
      note: body.note,
      expiresAt: body.expiresAt,
      staffSteamId: steamId,
      staffName: access.role,
    });
    const accounts = await listTweeterAccountModeration();
    return jsonWithSession({ ok: true, account, accounts }, { headers: noStoreHeaders() }, steamId, request);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'save_failed';
    return NextResponse.json({ error: reason === 'invalid_steam_id' ? 'Enter a valid SteamID64.' : 'Could not save that Tweeter moderation action.' }, { status: 400, headers: noStoreHeaders() });
  }
}
