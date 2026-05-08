import { NextRequest, NextResponse } from 'next/server';
import { createDeletionRequest } from '@/lib/privacy-data';
import { getSessionSteamIdFromRequest, noStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);
  if (!steamId) return NextResponse.json({ error: 'Steam sign-in required.' }, { status: 401, headers: noStoreHeaders() });
  try {
    const requestRecord = await createDeletionRequest(steamId, await request.json().catch(() => ({})));
    return NextResponse.json({ ok: true, request: requestRecord }, { headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not submit deletion request.' }, { status: 400, headers: noStoreHeaders() });
  }
}
