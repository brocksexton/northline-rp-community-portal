import { NextRequest, NextResponse } from 'next/server';
import { jsonWithSession, noStoreHeaders } from '@/lib/session';
import { deleteTweeterContentFilterRule, listTweeterContentFilterRules, resetTweeterContentFilterRules, upsertTweeterContentFilterRule } from '@/lib/tweeter-content-filter-data';
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
  const rules = await listTweeterContentFilterRules();
  return jsonWithSession({ rules, canManage: access.canManage, role: access.identity.roleLabel }, { headers: noStoreHeaders() }, access.identity.steamId, request);
}

export async function POST(request: NextRequest) {
  const access = await getAccess(request);
  if (!access.identity || !access.allowed) return NextResponse.json({ error: 'Staff access required.' }, { status: 403, headers: noStoreHeaders() });
  if (!access.canManage) return NextResponse.json({ error: 'Ape Tavern staff access required to change Tweeter filtered words.' }, { status: 403, headers: noStoreHeaders() });

  const body = await request.json().catch(() => ({}));
  try {
    if (body?.action === 'reset') {
      const rules = await resetTweeterContentFilterRules();
      await notifyAdminAudit({
        action: 'Reset Tweeter filtered words',
        actor: { steamId: access.identity.steamId, name: access.identity.roleLabel },
        severity: 'warning',
        url: '/staff/tweeter',
        fields: [discordAuditField('Rules after reset', String(rules.length), true)],
      });
      return jsonWithSession({ ok: true, rules }, { headers: noStoreHeaders() }, access.identity.steamId, request);
    }
    const rule = await upsertTweeterContentFilterRule(body);
    const rules = await listTweeterContentFilterRules();
    await notifyAdminAudit({
      action: 'Updated Tweeter filtered word',
      actor: { steamId: access.identity.steamId, name: access.identity.roleLabel },
      target: rule.term,
      severity: 'info',
      url: '/staff/tweeter',
      fields: [discordAuditField('Reason', rule.reason, true), discordAuditField('Match mode', rule.matchMode, true)],
    });
    return jsonWithSession({ ok: true, rule, rules }, { headers: noStoreHeaders() }, access.identity.steamId, request);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'save_failed';
    const message = reason === 'invalid_term'
      ? 'Enter a word or phrase to filter.'
      : reason === 'duplicate_rule'
        ? 'That filtered word already exists with the same reason and match mode.'
        : 'Could not save that filtered word.';
    return NextResponse.json({ error: message }, { status: 400, headers: noStoreHeaders() });
  }
}

export async function DELETE(request: NextRequest) {
  const access = await getAccess(request);
  if (!access.identity || !access.allowed) return NextResponse.json({ error: 'Staff access required.' }, { status: 403, headers: noStoreHeaders() });
  if (!access.canManage) return NextResponse.json({ error: 'Ape Tavern staff access required to change Tweeter filtered words.' }, { status: 403, headers: noStoreHeaders() });

  const body = await request.json().catch(() => ({}));
  try {
    await deleteTweeterContentFilterRule(body.id);
    const rules = await listTweeterContentFilterRules();
    await notifyAdminAudit({
      action: 'Removed Tweeter filtered word',
      actor: { steamId: access.identity.steamId, name: access.identity.roleLabel },
      target: String(body.id ?? '').trim() || 'Unknown rule',
      severity: 'warning',
      url: '/staff/tweeter',
      fields: [discordAuditField('Rules remaining', String(rules.length), true)],
    });
    return jsonWithSession({ ok: true, rules }, { headers: noStoreHeaders() }, access.identity.steamId, request);
  } catch {
    return NextResponse.json({ error: 'Could not remove that filtered word.' }, { status: 400, headers: noStoreHeaders() });
  }
}
