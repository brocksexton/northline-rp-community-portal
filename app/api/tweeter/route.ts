import { NextRequest, NextResponse } from 'next/server';
import { getSessionSteamIdFromRequest, jsonWithSession, noStoreHeaders } from '@/lib/session';
import { buildTweeterPayload } from '@/lib/tweeter-view';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!(await isSiteFeatureEnabled('tweeter'))) {
    return NextResponse.json({ ok: false, message: 'Tweeter is not enabled.' }, { status: 404, headers: noStoreHeaders() });
  }
  const sessionSteamId = getSessionSteamIdFromRequest(request);
  return jsonWithSession(await buildTweeterPayload(sessionSteamId), { headers: noStoreHeaders() }, sessionSteamId, request);
}
