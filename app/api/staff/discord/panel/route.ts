import { NextRequest } from 'next/server';
import { sendDiscordPanel } from '@/lib/discord-manager';
import { getRequestStaffIdentity, canManageSiteConfiguration } from '@/lib/staff-auth';
import { jsonWithSession } from '@/lib/session';
import { discordAuditField, notifyAdminAudit } from '@/lib/discord-webhooks';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canManageSiteConfiguration(identity)) return jsonWithSession({ ok: false, message: 'Website admin access required to send Discord panels.' }, { status: 403 }, identity.steamId, request);
  const body = await request.json().catch(() => ({}));
  try {
    const message = await sendDiscordPanel(body);
    await notifyAdminAudit({
      action: 'Sent Discord panel from staff site',
      actor: { steamId: identity.steamId, name: identity.displayName },
      severity: 'info',
      url: '/staff/discord',
      fields: [discordAuditField('Channel', String(body.channelId ?? ''), true), discordAuditField('Title', String(body.title ?? 'Untitled'), true)],
    });
    return jsonWithSession({ ok: true, messageId: message?.id ?? null }, undefined, identity.steamId, request);
  } catch (error) {
    return jsonWithSession({ ok: false, message: error instanceof Error ? error.message : 'Could not send Discord panel.' }, { status: 400 }, identity.steamId, request);
  }
}
