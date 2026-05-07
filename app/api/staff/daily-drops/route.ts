import { NextRequest, NextResponse } from 'next/server';
import { getDailyDropsAdminState, saveCaseDefinitions } from '@/lib/cases-data';
import { jsonWithSession, withNoStoreHeaders } from '@/lib/session';
import { discordAuditField, notifyAdminAudit } from '@/lib/discord-webhooks';
import { canManageSiteConfiguration, getRequestStaffIdentity } from '@/lib/staff-auth';

export async function GET(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canManageSiteConfiguration(identity)) return jsonWithSession({ ok: false, message: 'Website admin access required.' }, { status: 403 }, identity.steamId, request);
  return jsonWithSession({ ok: true, state: await getDailyDropsAdminState() }, undefined, identity.steamId, request);
}

export async function POST(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canManageSiteConfiguration(identity)) return jsonWithSession({ ok: false, message: 'Website admin access required.' }, { status: 403 }, identity.steamId, request);
  const body = await request.json().catch(() => ({}));
  const definitions = await saveCaseDefinitions(body);
  const activeCount = definitions.filter((definition) => definition.status === 'active').length;
  await notifyAdminAudit({
    action: 'Updated Daily Drops cases',
    actor: { steamId: identity.steamId, name: identity.roleLabel },
    severity: 'info',
    url: '/cases',
    fields: [
      discordAuditField('Cases', String(definitions.length), true),
      discordAuditField('Active', String(activeCount), true),
      discordAuditField('Visible labels', definitions.filter((definition) => definition.status === 'active').map((definition) => definition.label).join(', ') || 'None'),
    ],
  });
  return jsonWithSession({ ok: true, state: await getDailyDropsAdminState() }, undefined, identity.steamId, request);
}

export async function OPTIONS() {
  return withNoStoreHeaders(new NextResponse(null, { status: 204 }));
}
