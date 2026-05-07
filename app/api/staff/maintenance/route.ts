import { NextRequest, NextResponse } from 'next/server';
import { getMaintenanceSettings, saveMaintenanceSettings } from '@/lib/maintenance-data';
import { jsonWithSession, withNoStoreHeaders } from '@/lib/session';
import { discordAuditField, notifyAdminAudit } from '@/lib/discord-webhooks';
import { canManageSiteConfiguration, getRequestStaffIdentity } from '@/lib/staff-auth';

export async function GET(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canManageSiteConfiguration(identity)) return jsonWithSession({ ok: false, message: 'Website admin access required.' }, { status: 403 }, identity.steamId, request);
  return jsonWithSession({ ok: true, settings: await getMaintenanceSettings() }, undefined, identity.steamId, request);
}

export async function POST(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canManageSiteConfiguration(identity)) return jsonWithSession({ ok: false, message: 'Website admin access required.' }, { status: 403 }, identity.steamId, request);
  const body = await request.json().catch(() => ({}));
  const settings = await saveMaintenanceSettings(body, identity.steamId);
  await notifyAdminAudit({
    action: 'Updated maintenance settings',
    actor: { steamId: identity.steamId, name: identity.roleLabel },
    severity: settings.enabled || settings.tweeterMaintenanceEnabled ? 'warning' : 'success',
    url: '/staff/maintenance',
    fields: [
      discordAuditField('Website maintenance', settings.enabled ? 'Enabled' : 'Disabled', true),
      discordAuditField('Tweeter maintenance', settings.tweeterMaintenanceEnabled ? 'Enabled' : 'Disabled', true),
      discordAuditField('Headline', settings.headline),
    ],
  });
  return jsonWithSession({ ok: true, settings }, undefined, identity.steamId, request);
}

export async function OPTIONS() {
  return withNoStoreHeaders(new NextResponse(null, { status: 204 }));
}
