import { NextRequest, NextResponse } from 'next/server';
import { authReturnToCookieName, noStoreHeaders, sessionCookieName } from '@/lib/session';
import { getExternalOrigin, isSecureOrigin } from '@/lib/steam-openid';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = getExternalOrigin(request);
  const response = NextResponse.redirect(new URL('/?loggedOut=1', origin));
  for (const [key, value] of Object.entries(noStoreHeaders())) response.headers.set(key, value);
  for (const name of [sessionCookieName, authReturnToCookieName]) {
    response.cookies.set(name, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecureOrigin(origin),
      path: '/',
      maxAge: 0,
    });
  }
  return response;
}
