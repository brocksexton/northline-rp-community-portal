import { NextRequest, NextResponse } from 'next/server';
import { jsonWithSession, noStoreHeaders } from '@/lib/session';
import { listTweeterAccountModeration, setTweeterAccountModeration } from '@/lib/tweeter-moderation-data';
import { discordAuditField, notifyAdminAudit } from '@/lib/discord-webhooks';
import { canAccessServerAdministration, canManageTweeterConfiguration, getRequestStaffIdentity } from '@/lib/staff-auth';

export const dynamic = 'force-dynamic';

async function getAccess(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return { identity: null, allowed: false, canManage: false };
  return { identity, allowed: canAccessServerAdministration(identity), canManage: canManageTweeterConfiguration(identity) };
}

export async function GET(request: NextRequest) {
  const access = await getAccess(request);
  if (!access.identity || !access.allowed) return NextResponse.json({ error: 'Staff access required.' }, { status: 403, headers: noStoreHeaders() });
  const accounts = await listTweeterAccountModeration();
  return jsonWithSession({ accounts, canManage: access.canManage, role: access.identity.roleLabel }, { headers: noStoreHeaders() }, access.identity.steamId, request);
}

export async function POST(request: NextRequest) {
  const access = await getAccess(request);
  if (!access.identity || !access.allowed) return NextResponse.json({ error: 'Staff access required.' }, { status: 403, headers: noStoreHeaders() });
  if (!access.canManage) return NextResponse.json({ error: 'Website admin access required to change Tweeter account restrictions.' }, { status: 403, headers: noStoreHeaders() });

  const body = await request.json().catch(() => ({}));
  try {
    const account = await setTweeterAccountModeration({
      steamId: body.steamId,
      status: body.status,
      reason: body.reason,
      note: body.note,
      expiresAt: body.expiresAt,
      staffSteamId: access.identity.steamId,
      staffName: access.identity.roleLabel,
    });
    const accounts = await listTweeterAccountModeration();
    const requestedStatus = String(body.status ?? 'none');
    await notifyAdminAudit({
      action: account ? 'Updated Tweeter account restriction' : 'Cleared Tweeter account restriction',
      actor: { steamId: access.identity.steamId, name: access.identity.roleLabel },
      target: String(account?.steamId ?? body.steamId ?? ''),
      detail: String(account?.reason ?? body.reason ?? '').trim() || (account ? 'No public reason provided.' : 'Restriction cleared.'),
      severity: account ? 'warning' : 'success',
      url: '/staff/tweeter',
      fields: [
        discordAuditField('Status', String(account?.status ?? requestedStatus), true),
        discordAuditField('Expires', String(account?.expiresAt ?? body.expiresAt ?? 'Never'), true),
      ],
    });
    return jsonWithSession({ ok: true, account, accounts }, { headers: noStoreHeaders() }, access.identity.steamId, request);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'save_failed';
    return NextResponse.json({ error: reason === 'invalid_steam_id' ? 'Enter a valid SteamID64.' : 'Could not save that Tweeter moderation action.' }, { status: 400, headers: noStoreHeaders() });
  }
}
