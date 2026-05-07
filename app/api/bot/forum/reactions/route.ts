import { NextRequest, NextResponse } from 'next/server';
import { requireBotApiSecret } from '@/app/api/bot/auth';
import { setDiscordForumReaction } from '@/lib/forum-data';
import { noStoreHeaders, withNoStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

async function handle(request: NextRequest, active: boolean) {
  const denied = requireBotApiSecret(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const result = await setDiscordForumReaction({
    discordThreadId: String(body.discordThreadId ?? '').trim() || null,
    discordMessageId: String(body.discordMessageId ?? '').trim() || null,
    discordUserId: String(body.discordUserId ?? '').trim(),
    emoji: body.emoji,
    active,
  });
  if (!result) return NextResponse.json({ ok: false, message: 'Reaction target not found or unsupported emoji.' }, { status: 404, headers: noStoreHeaders() });
  return NextResponse.json({ ok: true, thread: result.thread, post: result.post }, { headers: noStoreHeaders() });
}

export async function POST(request: NextRequest) { return handle(request, true); }
export async function DELETE(request: NextRequest) { return handle(request, false); }
export async function OPTIONS() { return withNoStoreHeaders(new NextResponse(null, { status: 204 })); }
