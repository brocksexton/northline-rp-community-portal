import { NextRequest, NextResponse } from 'next/server';
import { generateDiscordLinkCode, getDiscordLinkForSteamId } from '@/lib/forum-data';
import { getSessionSteamIdFromRequest, jsonWithSession, noStoreHeaders, withNoStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);
  if (!steamId) return NextResponse.json({ message: 'Steam sign-in required.' }, { status: 401, headers: noStoreHeaders() });
  const [code, link] = await Promise.all([generateDiscordLinkCode(steamId), getDiscordLinkForSteamId(steamId)]);
  return jsonWithSession({ ok: true, ...code, link }, { headers: noStoreHeaders() }, steamId, request);
}

export async function OPTIONS() { return withNoStoreHeaders(new NextResponse(null, { status: 204 })); }
