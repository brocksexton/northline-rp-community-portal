import { NextRequest, NextResponse } from 'next/server';
import { moderateForumThread } from '@/lib/forum-data';
import { deleteDiscordForumThread } from '@/lib/forum-discord';
import { canRunModerationActions, getRequestStaffIdentity } from '@/lib/staff-auth';
import { jsonWithSession, noStoreHeaders, withNoStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ threadId: string }> };

type ThreadAction = 'open' | 'lock' | 'archive' | 'hide' | 'unhide' | 'delete' | 'pin' | 'unpin';

const actions = new Set<ThreadAction>(['open', 'lock', 'archive', 'hide', 'unhide', 'delete', 'pin', 'unpin']);

async function requireForumModerator(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return { response: NextResponse.json({ message: 'Steam sign-in required.' }, { status: 401, headers: noStoreHeaders() }) };
  if (!canRunModerationActions(identity)) return { response: NextResponse.json({ message: 'Forum moderation access required.' }, { status: 403, headers: noStoreHeaders() }) };
  return { identity };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requireForumModerator(request);
  if ('response' in guard) return guard.response;
  const { threadId } = await params;
  const body = await request.json().catch(() => ({}));
  const action = actions.has(body.action) ? body.action as ThreadAction : 'lock';
  const result = await moderateForumThread({ threadId, action });
  if (!result) return NextResponse.json({ message: 'Thread not found.' }, { status: 404, headers: noStoreHeaders() });
  if (action === 'hide' || action === 'delete') await deleteDiscordForumThread(result.thread.discordThreadId);
  return jsonWithSession({ ok: true, thread: result.thread, posts: result.posts }, { headers: noStoreHeaders() }, guard.identity.steamId, request);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const guard = await requireForumModerator(request);
  if ('response' in guard) return guard.response;
  const { threadId } = await params;
  const result = await moderateForumThread({ threadId, action: 'delete' });
  if (!result) return NextResponse.json({ message: 'Thread not found.' }, { status: 404, headers: noStoreHeaders() });
  await deleteDiscordForumThread(result.thread.discordThreadId);
  return jsonWithSession({ ok: true, thread: result.thread, posts: result.posts }, { headers: noStoreHeaders() }, guard.identity.steamId, request);
}

export async function OPTIONS() { return withNoStoreHeaders(new NextResponse(null, { status: 204 })); }
