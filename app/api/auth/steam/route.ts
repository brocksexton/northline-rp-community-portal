import { NextRequest, NextResponse } from 'next/server';
import { buildSteamLoginUrl, getExternalOrigin, normalizeReturnTo } from '@/lib/steam-openid';
import { setAuthReturnToCookie, setSessionCookie, withNoStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = getExternalOrigin(request);
  const url = new URL(request.url);
  const returnTo = normalizeReturnTo(url.searchParams.get('returnTo'));

  if (url.searchParams.get('dev') === '1' && process.env.ENABLE_DEV_STEAM_LOGIN === 'true') {
    const steamId = process.env.DEV_STEAM_ID || '76561198000000000';
    const response = withNoStoreHeaders(NextResponse.redirect(new URL(returnTo, origin)));
    return setSessionCookie(response, steamId, request);
  }

  const response = withNoStoreHeaders(NextResponse.redirect(buildSteamLoginUrl(origin)));
  return setAuthReturnToCookie(response, returnTo, request);
}
