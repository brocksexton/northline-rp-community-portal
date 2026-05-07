import { NextRequest, NextResponse } from 'next/server';
import { requireBotApiSecret } from '@/app/api/bot/auth';
import { createDiscordImportedThread, hideDiscordImportedPost } from '@/lib/forum-data';
import { noStoreHeaders, withNoStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const denied = requireBotApiSecret(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const result = await createDiscordImportedThread({
    discordThreadId: String(body.discordThreadId ?? '').trim(),
    discordStarterMessageId: String(body.discordStarterMessageId ?? body.discordMessageId ?? '').trim() || null,
    discordUserId: String(body.discordUserId ?? '').trim(),
    discordUsername: String(body.discordUsername ?? '').trim(),
    discordAvatarUrl: String(body.discordAvatarUrl ?? '').trim() || null,
    title: body.title,
    body: body.body,
    categoryId: body.categoryId ?? 'general',
    importUnlinked: Boolean(body.importUnlinked),
  });
  if (!result) return NextResponse.json({ error: 'Discord user is not linked or thread already exists without a starter.' }, { status: 409, headers: noStoreHeaders() });
  return NextResponse.json({ ok: true, thread: result.thread, starter: result.starter }, { headers: noStoreHeaders() });
}


export async function DELETE(request: NextRequest) {
  const denied = requireBotApiSecret(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const result = await hideDiscordImportedPost({ discordThreadId: String(body.discordThreadId ?? '').trim() });
  return NextResponse.json({ ok: result.ok }, { headers: noStoreHeaders() });
}

export async function OPTIONS() { return withNoStoreHeaders(new NextResponse(null, { status: 204 })); }
