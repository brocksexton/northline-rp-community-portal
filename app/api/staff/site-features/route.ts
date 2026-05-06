import { NextRequest, NextResponse } from 'next/server';
import { getRoleForSteamId } from '@/lib/ape-data';
import { getSiteFeatureSettings, saveSiteFeatureSettings } from '@/lib/site-features-data';
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
  return jsonWithSession({ ok: true, settings: await getSiteFeatureSettings() }, undefined, steamId, request);
}

export async function POST(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);
  if (!steamId) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, steamId, request);
  const role = await getRoleForSteamId(steamId);
  if (!isDeveloper(role)) return jsonWithSession({ ok: false, message: 'Developer access required.' }, { status: 403 }, steamId, request);
  const body = await request.json().catch(() => ({}));
  const settings = await saveSiteFeatureSettings(body, steamId);
  const enabled = settings.features.filter((feature) => feature.enabled).map((feature) => feature.label).join(', ') || 'None';
  const disabled = settings.features.filter((feature) => !feature.enabled).map((feature) => feature.label).join(', ') || 'None';
  await notifyAdminAudit({
    action: 'Updated site feature visibility',
    actor: { steamId, name: role },
    severity: 'warning',
    url: '/staff',
    fields: [discordAuditField('Enabled', enabled), discordAuditField('Disabled', disabled)],
  });
  return jsonWithSession({ ok: true, settings }, undefined, steamId, request);
}

export async function OPTIONS() {
  return withNoStoreHeaders(new NextResponse(null, { status: 204 }));
}
