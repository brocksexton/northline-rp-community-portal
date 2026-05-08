import { NextRequest, NextResponse } from 'next/server';
import { buildTweeterUser } from '@/lib/tweeter-view';
import { getCommunityProfile } from '@/lib/community-data';
import { getConversation, getConversationSummaries, sendDirectMessage } from '@/lib/tweeter-social-data';
import { getSessionSteamIdFromRequest, noStoreHeaders, jsonWithSession } from '@/lib/session';
import { hasGameServerIdentity, getTweeterActorActionLock, getTweeterTargetMessageLock } from '@/lib/tweeter-access';
import { cleanSteamId } from '@/lib/tweeter-validators';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionSteamId = getSessionSteamIdFromRequest(request);
  if (!sessionSteamId) return NextResponse.json({ error: 'Sign in with Steam to view messages.' }, { status: 401, headers: noStoreHeaders() });
  const actorLockReason = await getTweeterActorActionLock(sessionSteamId);
  if (actorLockReason) return NextResponse.json({ error: actorLockReason }, { status: 403, headers: noStoreHeaders() });

  const withSteamId = cleanSteamId(request.nextUrl.searchParams.get('with'));
  if (request.nextUrl.searchParams.has('with') && !withSteamId) {
    return NextResponse.json({ error: 'Invalid conversation.' }, { status: 400, headers: noStoreHeaders() });
  }
  if (withSteamId) {
    const targetLockReason = await getTweeterTargetMessageLock(withSteamId);
    if (targetLockReason) return NextResponse.json({ error: targetLockReason }, { status: 403, headers: noStoreHeaders() });
    const [messages, otherUser] = await Promise.all([
      getConversation(sessionSteamId, withSteamId, true),
      buildTweeterUser(withSteamId),
    ]);
    return jsonWithSession({ currentSteamId: sessionSteamId, otherUser, messages }, { headers: noStoreHeaders() }, sessionSteamId, request);
  }

  const summaries = await getConversationSummaries(sessionSteamId);
  const users = Object.fromEntries(await Promise.all(summaries.map(async (summary) => [summary.otherSteamId, await buildTweeterUser(summary.otherSteamId)])));
  return jsonWithSession({ currentSteamId: sessionSteamId, summaries, users }, { headers: noStoreHeaders() }, sessionSteamId, request);
}

export async function POST(request: NextRequest) {
  const sessionSteamId = getSessionSteamIdFromRequest(request);
  if (!sessionSteamId) return NextResponse.json({ error: 'Sign in with Steam to send messages.' }, { status: 401, headers: noStoreHeaders() });
  const actorLockReason = await getTweeterActorActionLock(sessionSteamId);
  if (actorLockReason) return NextResponse.json({ error: actorLockReason }, { status: 403, headers: noStoreHeaders() });

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }
  const toSteamId = cleanSteamId(body.toSteamId);
  if (!toSteamId) return NextResponse.json({ error: 'Invalid recipient.' }, { status: 400, headers: noStoreHeaders() });
  if (toSteamId === sessionSteamId) return NextResponse.json({ error: 'You cannot message yourself.' }, { status: 400, headers: noStoreHeaders() });

  if (!(await hasGameServerIdentity(toSteamId))) return NextResponse.json({ error: 'That account needs to join the game server before messages are available.' }, { status: 400, headers: noStoreHeaders() });
  if (!(await getCommunityProfile(toSteamId))) return NextResponse.json({ error: 'That citizen has not signed into the website yet, so website DMs are locked for now.' }, { status: 400, headers: noStoreHeaders() });
  const targetLockReason = await getTweeterTargetMessageLock(toSteamId);
  if (targetLockReason) return NextResponse.json({ error: targetLockReason }, { status: 403, headers: noStoreHeaders() });

  try {
    const message = await sendDirectMessage(sessionSteamId, toSteamId, body.body);
    return jsonWithSession({ ok: true, message }, { headers: noStoreHeaders() }, sessionSteamId, request);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'message_failed';
    const text = reason === 'empty_message' ? 'Write a message first.' : 'Could not send that message right now.';
    return NextResponse.json({ error: text }, { status: 400, headers: noStoreHeaders() });
  }
}
