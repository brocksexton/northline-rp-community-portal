import { NextRequest, NextResponse } from 'next/server';
import { getApeStaffState, parseSteamIdList, saveApeStaffState } from '@/lib/ape-staff-data';
import { jsonWithSession, withNoStoreHeaders } from '@/lib/session';
import { discordAuditField, notifyAdminAudit } from '@/lib/discord-webhooks';
import { canManageSiteConfiguration, getRequestStaffIdentity } from '@/lib/staff-auth';

export async function GET(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canManageSiteConfiguration(identity)) return jsonWithSession({ ok: false, message: 'Website admin access required.' }, { status: 403 }, identity.steamId, request);
  return jsonWithSession({ ok: true, state: await getApeStaffState() }, undefined, identity.steamId, request);
}

export async function POST(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canManageSiteConfiguration(identity)) return jsonWithSession({ ok: false, message: 'Website admin access required.' }, { status: 403 }, identity.steamId, request);
  const body = await request.json().catch(() => ({}));
  const staffSteamIds = parseSteamIdList(typeof body === 'object' && body !== null ? (body as Record<string, unknown>).staffSteamIds : []);
  const state = await saveApeStaffState({ staffSteamIds }, identity.steamId);
  await notifyAdminAudit({
    action: 'Updated Ape Tavern badge list',
    actor: { steamId: identity.steamId, name: identity.roleLabel },
    severity: 'warning',
    url: '/staff',
    fields: [discordAuditField('Badge IDs', String(state.staffSteamIds.length), true), discordAuditField('Badge label', state.badgeLabel, true)],
  });
  return jsonWithSession({ ok: true, state }, undefined, identity.steamId, request);
}

export async function OPTIONS() {
  return withNoStoreHeaders(new NextResponse(null, { status: 204 }));
}
