import { NextRequest } from 'next/server';
import { timeoutDiscordMember } from '@/lib/discord-manager';
import { getRequestStaffIdentity, canRunModerationActions } from '@/lib/staff-auth';
import { jsonWithSession } from '@/lib/session';
import { discordAuditField, notifyAdminAudit } from '@/lib/discord-webhooks';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canRunModerationActions(identity)) return jsonWithSession({ ok: false, message: 'Moderation access required.' }, { status: 403 }, identity.steamId, request);
  const body = await request.json().catch(() => ({}));
  try {
    await timeoutDiscordMember(String(body.discordUserId ?? ''), Number(body.minutes ?? 10), String(body.reason ?? ''));
    await notifyAdminAudit({
      action: 'Timed out Discord member from staff site',
      actor: { steamId: identity.steamId, name: identity.displayName },
      severity: 'warning',
      url: '/staff/discord',
      fields: [discordAuditField('Discord user', String(body.discordUserId ?? ''), true), discordAuditField('Minutes', String(body.minutes ?? 10), true)],
    });
    return jsonWithSession({ ok: true }, undefined, identity.steamId, request);
  } catch (error) {
    return jsonWithSession({ ok: false, message: error instanceof Error ? error.message : 'Could not timeout Discord member.' }, { status: 400 }, identity.steamId, request);
  }
}
