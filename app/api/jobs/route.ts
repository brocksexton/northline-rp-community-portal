import { NextRequest, NextResponse } from 'next/server';
import { getPublicJobsState } from '@/lib/jobs-data';
import { getSessionSteamIdFromRequest, jsonWithSession, withNoStoreHeaders } from '@/lib/session';
export async function GET(request: NextRequest) { const steamId = getSessionSteamIdFromRequest(request); return jsonWithSession({ ok: true, state: await getPublicJobsState(steamId) }, undefined, steamId, request); }
export async function OPTIONS() { return withNoStoreHeaders(new NextResponse(null, { status: 204 })); }
