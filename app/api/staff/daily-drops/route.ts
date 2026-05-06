import { NextRequest, NextResponse } from 'next/server';
import { getRoleForSteamId } from '@/lib/ape-data';
import { getDailyDropsAdminState, saveCaseDefinitions } from '@/lib/cases-data';
import { getSessionSteamIdFromRequest, jsonWithSession, withNoStoreHeaders } from '@/lib/session';
import { discordAuditField, notifyAdminAudit } from '@/lib/discord-webhooks';

function isDeveloper(role: string) {
  return role.toLowerCase() === 'developer';
}

export async function GET(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);
  if (!steamId) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, steamId, request);
  const role = await getRoleForSteamId(steamId);
  if (!isDeveloper(role)) return jsonWithSession({ ok: false, message: 'Developer access required.' }, { status: 403 }, steamId, request);
  return jsonWithSession({ ok: true, state: await getDailyDropsAdminState() }, undefined, steamId, request);
}

export async function POST(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);
  if (!steamId) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, steamId, request);
  const role = await getRoleForSteamId(steamId);
  if (!isDeveloper(role)) return jsonWithSession({ ok: false, message: 'Developer access required.' }, { status: 403 }, steamId, request);
  const body = await request.json().catch(() => ({}));
  const definitions = await saveCaseDefinitions(body);
  const activeCount = definitions.filter((definition) => definition.status === 'active').length;
  await notifyAdminAudit({
    action: 'Updated Daily Drops cases',
    actor: { steamId, name: role },
    severity: 'info',
    url: '/cases',
    fields: [
      discordAuditField('Cases', String(definitions.length), true),
      discordAuditField('Active', String(activeCount), true),
      discordAuditField('Visible labels', definitions.filter((definition) => definition.status === 'active').map((definition) => definition.label).join(', ') || 'None'),
    ],
  });
  return jsonWithSession({ ok: true, state: await getDailyDropsAdminState() }, undefined, steamId, request);
}

export async function OPTIONS() {
  return withNoStoreHeaders(new NextResponse(null, { status: 204 }));
}
