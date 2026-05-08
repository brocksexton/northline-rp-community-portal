import { NextRequest, NextResponse } from 'next/server';
import { buildUserExportZip, createExportRequest } from '@/lib/privacy-data';
import { getSessionSteamIdFromRequest, noStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);
  if (!steamId) return NextResponse.json({ error: 'Steam sign-in required.' }, { status: 401, headers: noStoreHeaders() });
  await createExportRequest(steamId);
  const zip = await buildUserExportZip(steamId);
  return new NextResponse(zip, { headers: { ...noStoreHeaders(), 'content-type': 'application/zip', 'content-disposition': `attachment; filename="northline-data-export-${steamId}.zip"` } });
}
