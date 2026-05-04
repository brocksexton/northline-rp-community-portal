import { NextRequest, NextResponse } from 'next/server';
import { getExternalOrigin, verifySteamCallback } from '@/lib/steam-openid';
import { authReturnToCookieName, setSessionCookie, withNoStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = getExternalOrigin(request);
  const url = new URL(request.url);
  const steamId = await verifySteamCallback(url);
  const returnTo = request.cookies.get(authReturnToCookieName)?.value || '/dashboard';

  if (!steamId) {
    return withNoStoreHeaders(NextResponse.redirect(new URL('/?login=failed', origin)));
  }

  const response = withNoStoreHeaders(NextResponse.redirect(new URL(returnTo, origin)));
  setSessionCookie(response, steamId, request);
  response.cookies.set(authReturnToCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https://'),
    path: '/',
    maxAge: 0,
  });
  return response;
}
