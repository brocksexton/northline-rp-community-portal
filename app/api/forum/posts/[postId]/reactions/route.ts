import { NextRequest, NextResponse } from 'next/server';
import { toggleForumPostReaction } from '@/lib/forum-data';
import { getSessionSteamIdFromRequest, jsonWithSession, noStoreHeaders, withNoStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ postId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const steamId = getSessionSteamIdFromRequest(request);
  if (!steamId) return NextResponse.json({ message: 'Steam sign-in required.' }, { status: 401, headers: noStoreHeaders() });
  const { postId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const post = await toggleForumPostReaction({ postId, steamId, emoji: body.emoji });
    return jsonWithSession({ ok: true, post }, { headers: noStoreHeaders() }, steamId, request);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'reaction_failed';
    const message = reason === 'post_not_found'
      ? 'That post could not be found.'
      : reason === 'invalid_reaction'
        ? 'That reaction is not available.'
        : 'Could not update that reaction.';
    return NextResponse.json({ message }, { status: 400, headers: noStoreHeaders() });
  }
}

export async function OPTIONS() { return withNoStoreHeaders(new NextResponse(null, { status: 204 })); }
