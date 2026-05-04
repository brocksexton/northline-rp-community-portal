import { NextRequest, NextResponse } from 'next/server';
import { getSessionSteamIdFromRequest, noStoreHeaders, secureSessionCookieName, sessionCookieName } from '@/lib/session';
import { getExternalOrigin } from '@/lib/steam-openid';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);
  return NextResponse.json({
    authenticated: Boolean(steamId),
    steamIdSuffix: steamId ? steamId.slice(-6) : null,
    cookies: {
      secureSessionPresent: Boolean(request.cookies.get(secureSessionCookieName)?.value),
      legacySessionPresent: Boolean(request.cookies.get(sessionCookieName)?.value),
    },
    origin: getExternalOrigin(request),
    forwardedProto: request.headers.get('x-forwarded-proto'),
    forwardedHost: request.headers.get('x-forwarded-host'),
  }, { headers: noStoreHeaders() });
}
