import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, withNoStoreHeaders } from '@/lib/session';
import { getExternalOrigin } from '@/lib/steam-openid';

export const dynamic = 'force-dynamic';

function redirectHome(request: NextRequest, loggedOut: boolean) {
  const origin = getExternalOrigin(request);
  const url = new URL(loggedOut ? '/?loggedOut=1' : '/', origin);
  return withNoStoreHeaders(NextResponse.redirect(url, { status: 303 }));
}

// Keep logout POST-only so Next/link prefetch, crawlers, browser previews, or CDN probes
// cannot accidentally clear a user's Steam session by requesting a GET URL.
export async function GET(request: NextRequest) {
  return redirectHome(request, false);
}

export async function POST(request: NextRequest) {
  const response = redirectHome(request, true);
  return clearAuthCookies(response, request);
}
