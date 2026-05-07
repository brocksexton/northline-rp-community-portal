import { NextRequest, NextResponse } from 'next/server';
import { createForumPost } from '@/lib/forum-data';
import { mirrorWebsitePostToDiscord } from '@/lib/forum-discord';
import { getSessionSteamIdFromRequest, jsonWithSession, noStoreHeaders, withNoStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ threadId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const steamId = getSessionSteamIdFromRequest(request);
  if (!steamId) return NextResponse.json({ message: 'Steam sign-in required.' }, { status: 401, headers: noStoreHeaders() });
  const { threadId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const result = await createForumPost({ threadId, body: body.body, steamId });
    await mirrorWebsitePostToDiscord(result.thread, result.post);
    return jsonWithSession({ ok: true, post: result.post, thread: result.thread }, { headers: noStoreHeaders() }, steamId, request);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'save_failed';
    const message = reason === 'thread_locked' ? 'This thread is locked.' : reason === 'thread_not_found' ? 'Thread not found.' : reason === 'body_required' ? 'Write a reply before posting.' : 'Could not post that reply.';
    return NextResponse.json({ message }, { status: 400, headers: noStoreHeaders() });
  }
}

export async function OPTIONS() { return withNoStoreHeaders(new NextResponse(null, { status: 204 })); }
