import { NextRequest } from 'next/server';
import { updateDiscordMemberRole } from '@/lib/discord-manager';
import { getRequestStaffIdentity, canRunModerationActions } from '@/lib/staff-auth';
import { jsonWithSession } from '@/lib/session';
import { discordAuditField, notifyAdminAudit } from '@/lib/discord-webhooks';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canRunModerationActions(identity)) return jsonWithSession({ ok: false, message: 'Moderation access required.' }, { status: 403 }, identity.steamId, request);
  const body = await request.json().catch(() => ({}));
  const action = body.action === 'remove' ? 'remove' : 'add';
  try {
    await updateDiscordMemberRole(action, String(body.discordUserId ?? ''), String(body.roleId ?? ''));
    await notifyAdminAudit({
      action: `${action === 'add' ? 'Added' : 'Removed'} Discord member role`,
      actor: { steamId: identity.steamId, name: identity.displayName },
      severity: 'warning',
      url: '/staff/discord',
      fields: [discordAuditField('Discord user', String(body.discordUserId ?? ''), true), discordAuditField('Role', String(body.roleId ?? ''), true)],
    });
    return jsonWithSession({ ok: true }, undefined, identity.steamId, request);
  } catch (error) {
    return jsonWithSession({ ok: false, message: error instanceof Error ? error.message : 'Could not update Discord member role.' }, { status: 400 }, identity.steamId, request);
  }
}
