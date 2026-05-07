import { NextRequest, NextResponse } from 'next/server';
import { getSiteFeatureSettings, saveSiteFeatureSettings } from '@/lib/site-features-data';
import { jsonWithSession, withNoStoreHeaders } from '@/lib/session';
import { discordAuditField, notifyAdminAudit } from '@/lib/discord-webhooks';
import { canManageSiteConfiguration, getRequestStaffIdentity } from '@/lib/staff-auth';

export async function GET(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canManageSiteConfiguration(identity)) return jsonWithSession({ ok: false, message: 'Website admin access required.' }, { status: 403 }, identity.steamId, request);
  return jsonWithSession({ ok: true, settings: await getSiteFeatureSettings() }, undefined, identity.steamId, request);
}

export async function POST(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canManageSiteConfiguration(identity)) return jsonWithSession({ ok: false, message: 'Website admin access required.' }, { status: 403 }, identity.steamId, request);
  const body = await request.json().catch(() => ({}));
  const settings = await saveSiteFeatureSettings(body, identity.steamId);
  const enabled = settings.features.filter((feature) => feature.enabled).map((feature) => feature.label).join(', ') || 'None';
  const disabled = settings.features.filter((feature) => !feature.enabled).map((feature) => feature.label).join(', ') || 'None';
  await notifyAdminAudit({
    action: 'Updated site feature visibility',
    actor: { steamId: identity.steamId, name: identity.roleLabel },
    severity: 'warning',
    url: '/staff',
    fields: [discordAuditField('Enabled', enabled), discordAuditField('Disabled', disabled)],
  });
  return jsonWithSession({ ok: true, settings }, undefined, identity.steamId, request);
}

export async function OPTIONS() {
  return withNoStoreHeaders(new NextResponse(null, { status: 204 }));
}
