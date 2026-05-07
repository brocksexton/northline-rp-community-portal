import { NextRequest, NextResponse } from 'next/server';
import { createForumThread, getForumStateForUser } from '@/lib/forum-data';
import { mirrorWebsiteThreadToDiscord } from '@/lib/forum-discord';
import { getCurrentStaffIdentity, canPostStatusUpdates } from '@/lib/staff-auth';
import { getSessionSteamIdFromRequest, jsonWithSession, noStoreHeaders, withNoStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);
  return jsonWithSession({ state: await getForumStateForUser(steamId) }, { headers: noStoreHeaders() }, steamId, request);
}

export async function POST(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);
  if (!steamId) return NextResponse.json({ message: 'Steam sign-in required.' }, { status: 401, headers: noStoreHeaders() });
  const body = await request.json().catch(() => ({}));
  const identity = await getCurrentStaffIdentity();
  const staffCanAnnounce = identity ? canPostStatusUpdates(identity) : false;
  try {
    const result = await createForumThread({
      title: body.title,
      body: body.body,
      categoryId: body.categoryId,
      steamId,
      kind: staffCanAnnounce && body.kind === 'announcement' ? 'announcement' : 'discussion',
      pinned: staffCanAnnounce && Boolean(body.pinned),
    });
    await mirrorWebsiteThreadToDiscord(result.thread, result.starter);
    return jsonWithSession({ ok: true, thread: result.thread, starter: result.starter }, { headers: noStoreHeaders() }, steamId, request);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'save_failed';
    const message = reason === 'title_required' ? 'Give the thread a clear title.' : reason === 'body_required' ? 'Write an opening post before publishing.' : 'Could not create that thread.';
    return NextResponse.json({ message }, { status: 400, headers: noStoreHeaders() });
  }
}

export async function OPTIONS() { return withNoStoreHeaders(new NextResponse(null, { status: 204 })); }
