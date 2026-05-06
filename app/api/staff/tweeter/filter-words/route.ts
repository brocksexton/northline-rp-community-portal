import { NextRequest, NextResponse } from 'next/server';
import { getRoleForSteamId, hasPermission } from '@/lib/ape-data';
import { getSessionSteamIdFromRequest, jsonWithSession, noStoreHeaders } from '@/lib/session';
import { deleteTweeterContentFilterRule, listTweeterContentFilterRules, resetTweeterContentFilterRules, upsertTweeterContentFilterRule } from '@/lib/tweeter-content-filter-data';

export const dynamic = 'force-dynamic';

async function getAccess(steamId: string | null) {
  if (!steamId) return { allowed: false, canManage: false, role: 'Guest' };
  const role = await getRoleForSteamId(steamId);
  const developer = role.toLowerCase() === 'developer';
  const allowed = developer || await hasPermission(steamId, 'ViewLogs');
  return { allowed, canManage: developer, role };
}

export async function GET(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);
  const access = await getAccess(steamId);
  if (!steamId || !access.allowed) return NextResponse.json({ error: 'Staff access required.' }, { status: 403, headers: noStoreHeaders() });
  const rules = await listTweeterContentFilterRules();
  return jsonWithSession({ rules, canManage: access.canManage, role: access.role }, { headers: noStoreHeaders() }, steamId, request);
}

export async function POST(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);
  const access = await getAccess(steamId);
  if (!steamId || !access.allowed) return NextResponse.json({ error: 'Staff access required.' }, { status: 403, headers: noStoreHeaders() });
  if (!access.canManage) return NextResponse.json({ error: 'Developer access required to change Tweeter filtered words.' }, { status: 403, headers: noStoreHeaders() });

  const body = await request.json().catch(() => ({}));
  try {
    if (body?.action === 'reset') {
      const rules = await resetTweeterContentFilterRules();
      return jsonWithSession({ ok: true, rules }, { headers: noStoreHeaders() }, steamId, request);
    }
    const rule = await upsertTweeterContentFilterRule(body);
    const rules = await listTweeterContentFilterRules();
    return jsonWithSession({ ok: true, rule, rules }, { headers: noStoreHeaders() }, steamId, request);
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
  const steamId = getSessionSteamIdFromRequest(request);
  const access = await getAccess(steamId);
  if (!steamId || !access.allowed) return NextResponse.json({ error: 'Staff access required.' }, { status: 403, headers: noStoreHeaders() });
  if (!access.canManage) return NextResponse.json({ error: 'Developer access required to change Tweeter filtered words.' }, { status: 403, headers: noStoreHeaders() });

  const body = await request.json().catch(() => ({}));
  try {
    await deleteTweeterContentFilterRule(body.id);
    const rules = await listTweeterContentFilterRules();
    return jsonWithSession({ ok: true, rules }, { headers: noStoreHeaders() }, steamId, request);
  } catch {
    return NextResponse.json({ error: 'Could not remove that filtered word.' }, { status: 400, headers: noStoreHeaders() });
  }
}
