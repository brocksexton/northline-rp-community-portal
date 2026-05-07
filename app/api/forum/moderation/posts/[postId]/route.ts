import { NextRequest, NextResponse } from 'next/server';
import { moderateForumPost } from '@/lib/forum-data';
import { deleteDiscordForumMessage, deleteDiscordForumThread } from '@/lib/forum-discord';
import { canRunModerationActions, getRequestStaffIdentity } from '@/lib/staff-auth';
import { jsonWithSession, noStoreHeaders, withNoStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ postId: string }> };

async function requireForumModerator(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return { response: NextResponse.json({ message: 'Steam sign-in required.' }, { status: 401, headers: noStoreHeaders() }) };
  if (!canRunModerationActions(identity)) return { response: NextResponse.json({ message: 'Forum moderation access required.' }, { status: 403, headers: noStoreHeaders() }) };
  return { identity };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requireForumModerator(request);
  if ('response' in guard) return guard.response;
  const { postId } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body.action === 'unhide' ? 'unhide' : 'hide';
  const result = await moderateForumPost({ postId, action });
  if (!result) return NextResponse.json({ message: 'Post not found.' }, { status: 404, headers: noStoreHeaders() });
  if (action === 'hide') {
    if (result.starterDeleted) await deleteDiscordForumThread(result.thread.discordThreadId);
    else await deleteDiscordForumMessage(result.thread.discordThreadId, result.post.discordMessageId);
  }
  return jsonWithSession({ ok: true, post: result.post, thread: result.thread }, { headers: noStoreHeaders() }, guard.identity.steamId, request);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const guard = await requireForumModerator(request);
  if ('response' in guard) return guard.response;
  const { postId } = await params;
  const result = await moderateForumPost({ postId, action: 'delete' });
  if (!result) return NextResponse.json({ message: 'Post not found.' }, { status: 404, headers: noStoreHeaders() });
  if (result.starterDeleted) await deleteDiscordForumThread(result.thread.discordThreadId);
  else await deleteDiscordForumMessage(result.thread.discordThreadId, result.post.discordMessageId);
  return jsonWithSession({ ok: true, post: result.post, thread: result.thread }, { headers: noStoreHeaders() }, guard.identity.steamId, request);
}

export async function OPTIONS() { return withNoStoreHeaders(new NextResponse(null, { status: 204 })); }
