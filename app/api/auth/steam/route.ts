import { NextRequest, NextResponse } from 'next/server';
import { buildSteamLoginUrl, getExternalOrigin, isSecureOrigin, normalizeReturnTo } from '@/lib/steam-openid';
import { authReturnToCookieName, createSessionCookieValue, noStoreHeaders, sessionCookieName } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = getExternalOrigin(request);
  const url = new URL(request.url);
  const returnTo = normalizeReturnTo(url.searchParams.get('returnTo'));
  const secure = isSecureOrigin(origin);

  if (url.searchParams.get('dev') === '1' && process.env.ENABLE_DEV_STEAM_LOGIN === 'true') {
    const steamId = process.env.DEV_STEAM_ID || '76561198000000000';
    const response = NextResponse.redirect(new URL(returnTo, origin));
    for (const [key, value] of Object.entries(noStoreHeaders())) response.headers.set(key, value);
    response.cookies.set(sessionCookieName, createSessionCookieValue(steamId), {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 60 * 60 * 24 * 14,
    });
    return response;
  }

  const response = NextResponse.redirect(buildSteamLoginUrl(origin));
  for (const [key, value] of Object.entries(noStoreHeaders())) response.headers.set(key, value);
  response.cookies.set(authReturnToCookieName, returnTo, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 10,
  });
  return response;
}
