import { NextRequest, NextResponse } from 'next/server';
import { requireBotApiSecret } from '@/app/api/bot/auth';
import { createDiscordImportedPost, hideDiscordImportedPost } from '@/lib/forum-data';
import { noStoreHeaders, withNoStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const denied = requireBotApiSecret(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const result = await createDiscordImportedPost({
    discordThreadId: String(body.discordThreadId ?? '').trim(),
    discordMessageId: String(body.discordMessageId ?? '').trim(),
    discordUserId: String(body.discordUserId ?? '').trim(),
    discordUsername: String(body.discordUsername ?? '').trim(),
    discordAvatarUrl: String(body.discordAvatarUrl ?? '').trim() || null,
    body: body.body,
    importUnlinked: Boolean(body.importUnlinked),
  });
  if (!result) return NextResponse.json({ error: 'Thread/user link not found, duplicate message, or body missing.' }, { status: 409, headers: noStoreHeaders() });
  return NextResponse.json({ ok: true, thread: result.thread, post: result.post }, { headers: noStoreHeaders() });
}


export async function DELETE(request: NextRequest) {
  const denied = requireBotApiSecret(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const result = await hideDiscordImportedPost({
    discordThreadId: String(body.discordThreadId ?? '').trim(),
    discordMessageId: String(body.discordMessageId ?? '').trim(),
  });
  return NextResponse.json({ ok: result.ok }, { headers: noStoreHeaders() });
}

export async function OPTIONS() { return withNoStoreHeaders(new NextResponse(null, { status: 204 })); }
