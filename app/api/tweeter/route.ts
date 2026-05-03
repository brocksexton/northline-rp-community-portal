import { NextRequest, NextResponse } from 'next/server';
import { getSessionSteamIdFromRequest, noStoreHeaders } from '@/lib/session';
import { buildTweeterPayload } from '@/lib/tweeter-view';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionSteamId = getSessionSteamIdFromRequest(request);
  return NextResponse.json(await buildTweeterPayload(sessionSteamId), { headers: noStoreHeaders() });
}
