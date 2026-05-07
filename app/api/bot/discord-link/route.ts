import { NextRequest, NextResponse } from 'next/server';
import { requireBotApiSecret } from '@/app/api/bot/auth';
import { consumeDiscordLinkCode } from '@/lib/forum-data';
import { assignLinkedForumRole, discordGuildId } from '@/lib/forum-discord';
import { noStoreHeaders, withNoStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const denied = requireBotApiSecret(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const code = String(body.code ?? '').trim();
  const discordUserId = String(body.discordUserId ?? body.userId ?? '').trim();
  const discordUsername = String(body.discordUsername ?? body.username ?? '').trim();
  if (!code || !/^\d{15,25}$/.test(discordUserId)) {
    return NextResponse.json({ error: 'code and discordUserId are required.' }, { status: 400, headers: noStoreHeaders() });
  }
  const link = await consumeDiscordLinkCode({ code, discordUserId, discordUsername });
  if (!link) return NextResponse.json({ error: 'Invalid or expired link code.' }, { status: 404, headers: noStoreHeaders() });
  const roleAssigned = await assignLinkedForumRole(discordUserId);
  return NextResponse.json({ ok: true, link, guildId: discordGuildId(), roleAssigned }, { headers: noStoreHeaders() });
}

export async function OPTIONS() { return withNoStoreHeaders(new NextResponse(null, { status: 204 })); }
