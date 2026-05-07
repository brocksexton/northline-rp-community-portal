import { NextRequest, NextResponse } from 'next/server';
import { requireBotApiSecret } from '@/app/api/bot/auth';
import { createDiscordImportedThread } from '@/lib/forum-data';
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
    title: body.title,
    body: body.body,
    categoryId: body.categoryId ?? 'general',
  });
  if (!result) return NextResponse.json({ error: 'Discord user is not linked or thread already exists without a starter.' }, { status: 409, headers: noStoreHeaders() });
  return NextResponse.json({ ok: true, thread: result.thread, starter: result.starter }, { headers: noStoreHeaders() });
}

export async function OPTIONS() { return withNoStoreHeaders(new NextResponse(null, { status: 204 })); }
