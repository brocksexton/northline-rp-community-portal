import { NextRequest, NextResponse } from 'next/server';
import { markApplicationViewed } from '@/lib/jobs-data';
import { getSessionSteamIdFromRequest, jsonWithSession, withNoStoreHeaders } from '@/lib/session';
type Context = { params: Promise<{ applicationId: string }> };
export async function POST(request: NextRequest, context: Context) { const steamId = getSessionSteamIdFromRequest(request); if (!steamId) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, steamId, request); const { applicationId } = await context.params; const state = await markApplicationViewed(steamId, applicationId); return jsonWithSession({ ok: true, state }, undefined, steamId, request); }
export async function OPTIONS() { return withNoStoreHeaders(new NextResponse(null, { status: 204 })); }
