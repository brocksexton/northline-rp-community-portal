import { NextRequest, NextResponse } from 'next/server';
import { getHomeHeroSettings, saveHomeHeroSettings } from '@/lib/home-hero-data';
import { jsonWithSession, withNoStoreHeaders } from '@/lib/session';
import { discordAuditField, notifyAdminAudit } from '@/lib/discord-webhooks';
import { canManageSiteConfiguration, getRequestStaffIdentity } from '@/lib/staff-auth';

export async function GET(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canManageSiteConfiguration(identity)) return jsonWithSession({ ok: false, message: 'Website admin access required.' }, { status: 403 }, identity.steamId, request);
  return jsonWithSession({ ok: true, settings: await getHomeHeroSettings() }, undefined, identity.steamId, request);
}

export async function POST(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canManageSiteConfiguration(identity)) return jsonWithSession({ ok: false, message: 'Website admin access required.' }, { status: 403 }, identity.steamId, request);

  const body = await request.json().catch(() => ({}));
  const settings = await saveHomeHeroSettings(body, identity.steamId);
  const liveCount = settings.messages.filter((message) => message.enabled).length;
  await notifyAdminAudit({
    action: 'Updated homepage hero messages',
    actor: { steamId: identity.steamId, name: identity.roleLabel },
    severity: 'info',
    url: '/staff/site',
    fields: [
      discordAuditField('Live messages', String(liveCount), true),
      discordAuditField('Total messages', String(settings.messages.length), true),
    ],
  });
  return jsonWithSession({ ok: true, settings }, undefined, identity.steamId, request);
}

export async function OPTIONS() {
  return withNoStoreHeaders(new NextResponse(null, { status: 204 }));
}
