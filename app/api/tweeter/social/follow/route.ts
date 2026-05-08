import { NextRequest, NextResponse } from 'next/server';
import { getFollowState, setFollowState } from '@/lib/tweeter-social-data';
import { getSessionSteamIdFromRequest, noStoreHeaders, jsonWithSession } from '@/lib/session';
import { getTweeterActorActionLock, getTweeterTargetFollowLock } from '@/lib/tweeter-access';
import { cleanSteamId } from '@/lib/tweeter-validators';

export const dynamic = 'force-dynamic';

function targetFromRequest(request: NextRequest) {
  return cleanSteamId(request.nextUrl.searchParams.get('targetSteamId') ?? request.nextUrl.searchParams.get('target') ?? '');
}

export async function GET(request: NextRequest) {
  const sessionSteamId = getSessionSteamIdFromRequest(request);
  const targetSteamId = targetFromRequest(request);
  if (!targetSteamId) return NextResponse.json({ error: 'Invalid citizen.' }, { status: 400, headers: noStoreHeaders() });
  return jsonWithSession(await getFollowState(sessionSteamId, targetSteamId), { headers: noStoreHeaders() }, sessionSteamId, request);
}

export async function POST(request: NextRequest) {
  const sessionSteamId = getSessionSteamIdFromRequest(request);
  if (!sessionSteamId) return NextResponse.json({ error: 'Sign in with Steam to follow citizens.' }, { status: 401, headers: noStoreHeaders() });
  const actorLockReason = await getTweeterActorActionLock(sessionSteamId);
  if (actorLockReason) return NextResponse.json({ error: actorLockReason }, { status: 403, headers: noStoreHeaders() });

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }
  const targetSteamId = cleanSteamId(body.targetSteamId ?? targetFromRequest(request));
  if (!targetSteamId) return NextResponse.json({ error: 'Invalid citizen.' }, { status: 400, headers: noStoreHeaders() });
  if (targetSteamId === sessionSteamId) return NextResponse.json({ error: 'You cannot follow yourself.' }, { status: 400, headers: noStoreHeaders() });
  const follow = typeof body.follow === 'boolean' ? body.follow : undefined;
  const targetLockReason = await getTweeterTargetFollowLock(targetSteamId);
  if (targetLockReason) return NextResponse.json({ error: targetLockReason }, { status: 403, headers: noStoreHeaders() });

  try {
    return jsonWithSession(await setFollowState(sessionSteamId, targetSteamId, follow), { headers: noStoreHeaders() }, sessionSteamId, request);
  } catch {
    return NextResponse.json({ error: 'Could not update that follow right now.' }, { status: 400, headers: noStoreHeaders() });
  }
}
