import { NextRequest, NextResponse } from 'next/server';
import { getFollowState, setFollowState } from '@/lib/tweeter-social-data';
import { getSessionSteamIdFromRequest, noStoreHeaders, jsonWithSession } from '@/lib/session';
import { GAME_SERVER_IDENTITY_MESSAGE, hasGameServerIdentity } from '@/lib/tweeter-access';

export const dynamic = 'force-dynamic';

function targetFromRequest(request: NextRequest) {
  return request.nextUrl.searchParams.get('targetSteamId') ?? request.nextUrl.searchParams.get('target') ?? '';
}

export async function GET(request: NextRequest) {
  const sessionSteamId = getSessionSteamIdFromRequest(request);
  const targetSteamId = targetFromRequest(request);
  return jsonWithSession(await getFollowState(sessionSteamId, targetSteamId), { headers: noStoreHeaders() }, sessionSteamId, request);
}

export async function POST(request: NextRequest) {
  const sessionSteamId = getSessionSteamIdFromRequest(request);
  if (!sessionSteamId) return NextResponse.json({ error: 'Sign in with Steam to follow citizens.' }, { status: 401, headers: noStoreHeaders() });
  if (!(await hasGameServerIdentity(sessionSteamId))) return NextResponse.json({ error: GAME_SERVER_IDENTITY_MESSAGE }, { status: 403, headers: noStoreHeaders() });

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }
  const targetSteamId = String(body.targetSteamId ?? targetFromRequest(request) ?? '').trim();
  const follow = typeof body.follow === 'boolean' ? body.follow : undefined;


  try {
    return jsonWithSession(await setFollowState(sessionSteamId, targetSteamId, follow), { headers: noStoreHeaders() }, sessionSteamId, request);
  } catch {
    return NextResponse.json({ error: 'Could not update that follow right now.' }, { status: 400, headers: noStoreHeaders() });
  }
}
