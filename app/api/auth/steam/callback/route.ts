import { NextRequest, NextResponse } from 'next/server';
import { getExternalOrigin, isSecureOrigin, verifySteamCallback } from '@/lib/steam-openid';
import { authReturnToCookieName, createSessionCookieValue, noStoreHeaders, sessionCookieName } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = getExternalOrigin(request);
  const url = new URL(request.url);
  const steamId = await verifySteamCallback(url);
  const returnTo = request.cookies.get(authReturnToCookieName)?.value || '/dashboard';
  const secure = isSecureOrigin(origin);

  if (!steamId) {
    const failed = NextResponse.redirect(new URL('/?login=failed', origin));
    for (const [key, value] of Object.entries(noStoreHeaders())) failed.headers.set(key, value);
    return failed;
  }

  const response = NextResponse.redirect(new URL(returnTo, origin));
  for (const [key, value] of Object.entries(noStoreHeaders())) response.headers.set(key, value);
  response.cookies.set(sessionCookieName, createSessionCookieValue(steamId), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  });
  response.cookies.set(authReturnToCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 0,
  });
  return response;
}
