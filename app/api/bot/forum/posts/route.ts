import { NextRequest, NextResponse } from 'next/server';
import { requireBotApiSecret } from '@/app/api/bot/auth';
import { createDiscordImportedPost, createDiscordImportedThread, hideDiscordImportedPost } from '@/lib/forum-data';
import { noStoreHeaders, withNoStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const denied = requireBotApiSecret(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const discordThreadId = String(body.discordThreadId ?? '').trim();
  const discordMessageId = String(body.discordMessageId ?? '').trim();
  const discordStarterMessageId = String(body.discordStarterMessageId ?? body.discordMessageId ?? '').trim();
  const discordUserId = String(body.discordUserId ?? '').trim();
  const discordUsername = String(body.discordUsername ?? '').trim();
  const discordAvatarUrl = String(body.discordAvatarUrl ?? '').trim() || null;
  const importUnlinked = Boolean(body.importUnlinked);

  const result = await createDiscordImportedPost({
    discordThreadId,
    discordMessageId,
    discordUserId,
    discordUsername,
    discordAvatarUrl,
    body: body.body,
    importUnlinked,
  });
  if (result) return NextResponse.json({ ok: true, thread: result.thread, post: result.post }, { headers: noStoreHeaders() });

  const looksLikeStarter = Boolean(body.isStarter) || (!!discordMessageId && (discordMessageId === discordThreadId || discordMessageId === discordStarterMessageId));
  if (looksLikeStarter) {
    const starter = await createDiscordImportedThread({
      discordThreadId,
      discordStarterMessageId: discordStarterMessageId || discordMessageId || null,
      discordUserId,
      discordUsername,
      discordAvatarUrl,
      title: body.title,
      body: body.body,
      categoryId: body.categoryId ?? 'general',
      importUnlinked,
    });
    if (starter) return NextResponse.json({ ok: true, thread: starter.thread, post: starter.starter, importedAsStarter: true }, { headers: noStoreHeaders() });
  }

  return NextResponse.json({ error: 'Thread/user link not found, duplicate message, or body missing.' }, { status: 409, headers: noStoreHeaders() });
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
