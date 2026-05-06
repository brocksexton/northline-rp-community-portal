import { NextRequest, NextResponse } from 'next/server';
import { getRoleForSteamId } from '@/lib/ape-data';
import { getMaintenanceSettings, saveMaintenanceSettings } from '@/lib/maintenance-data';
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
  return jsonWithSession({ ok: true, settings: await getMaintenanceSettings() }, undefined, steamId, request);
}

export async function POST(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);
  if (!steamId) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, steamId, request);
  const role = await getRoleForSteamId(steamId);
  if (!isDeveloper(role)) return jsonWithSession({ ok: false, message: 'Developer access required.' }, { status: 403 }, steamId, request);
  const body = await request.json().catch(() => ({}));
  const settings = await saveMaintenanceSettings(body, steamId);
  await notifyAdminAudit({
    action: 'Updated maintenance settings',
    actor: { steamId, name: role },
    severity: settings.enabled || settings.tweeterMaintenanceEnabled ? 'warning' : 'success',
    url: '/staff/maintenance',
    fields: [
      discordAuditField('Website maintenance', settings.enabled ? 'Enabled' : 'Disabled', true),
      discordAuditField('Tweeter maintenance', settings.tweeterMaintenanceEnabled ? 'Enabled' : 'Disabled', true),
      discordAuditField('Headline', settings.headline),
    ],
  });
  return jsonWithSession({ ok: true, settings }, undefined, steamId, request);
}

export async function OPTIONS() {
  return withNoStoreHeaders(new NextResponse(null, { status: 204 }));
}
