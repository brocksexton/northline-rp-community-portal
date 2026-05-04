import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, withNoStoreHeaders } from '@/lib/session';
import { getExternalOrigin } from '@/lib/steam-openid';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = getExternalOrigin(request);
  const response = withNoStoreHeaders(NextResponse.redirect(new URL('/?loggedOut=1', origin)));
  return clearAuthCookies(response, request);
}
