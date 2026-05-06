import { NextRequest, NextResponse } from 'next/server';
import { buildModerationCommand, getServerAdminSnapshot, runServerPowerAction, sendServerCommand } from '@/lib/server-admin';
import { canRunModerationActions, canRunServerPowerActions, requireServerAdministrationRequest } from '@/lib/staff-auth';
import { jsonWithSession, noStoreHeaders } from '@/lib/session';
import { notifyAdminAudit, notifyWebServerAction } from '@/lib/discord-webhooks';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Body = Record<string, unknown>;

function stringValue(value: unknown) {
  return String(value ?? '').trim();
}

function durationValue(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.min(Math.round(number), 5256000);
}

export async function GET(request: NextRequest) {
  const staff = await requireServerAdministrationRequest(request);
  if ('response' in staff) return staff.response;
  const snapshot = await getServerAdminSnapshot();
  return jsonWithSession(snapshot, { headers: noStoreHeaders() }, staff.identity.steamId, request);
}

export async function POST(request: NextRequest) {
  const staff = await requireServerAdministrationRequest(request);
  if ('response' in staff) return staff.response;

  const body = await request.json().catch(() => ({} as Body));
  const type = stringValue(body.type);

  if (type === 'moderation') {
    if (!canRunModerationActions(staff.identity)) return NextResponse.json({ error: 'Admin tools permission is required.' }, { status: 403, headers: noStoreHeaders() });
    const action = stringValue(body.action) === 'ban' ? 'ban' : 'kick';
    const steamId = stringValue(body.steamId);
    const name = stringValue(body.name) || steamId;
    const reason = stringValue(body.reason) || 'No reason provided';
    if (!/^\d{15,20}$/.test(steamId)) return NextResponse.json({ error: 'A valid SteamID64 is required.' }, { status: 400, headers: noStoreHeaders() });

    const command = buildModerationCommand({ action, steamId, name, reason, durationMinutes: durationValue(body.durationMinutes) });
    const record = await sendServerCommand({ command, actor: staff.identity, targetSteamId: steamId, targetName: name, reason });

    await notifyWebServerAction({
      action: action === 'ban' ? 'Website ban command requested' : 'Website kick command requested',
      actor: staff.identity,
      targetSteamId: steamId,
      targetName: name,
      reason,
      command: record.command,
      result: record.result,
      status: record.status,
      severity: action === 'ban' ? 'danger' : 'warning',
    });
    await notifyAdminAudit({
      action: action === 'ban' ? 'Requested game ban from web panel' : 'Requested game kick from web panel',
      actor: staff.identity,
      target: `${name} (${steamId})`,
      detail: reason,
      severity: action === 'ban' ? 'danger' : 'warning',
      url: '/staff/server',
    });

    return jsonWithSession({ ok: record.status !== 'failed', record }, undefined, staff.identity.steamId, request);
  }

  if (type === 'server-control') {
    if (!canRunServerPowerActions(staff.identity)) return NextResponse.json({ error: 'Developer or server settings permission is required.' }, { status: 403, headers: noStoreHeaders() });
    const requested = stringValue(body.action);
    const action = requested === 'start' || requested === 'kill' || requested === 'restart' || requested === 'update' ? requested : null;
    if (!action) return NextResponse.json({ error: 'Unsupported server control action.' }, { status: 400, headers: noStoreHeaders() });

    const record = await runServerPowerAction(action, staff.identity);
    await notifyWebServerAction({
      action: `Website server ${action} requested`,
      actor: staff.identity,
      command: record.command,
      result: record.result,
      status: record.status,
      severity: action === 'kill' || action === 'restart' ? 'danger' : action === 'update' ? 'warning' : 'success',
    });
    await notifyAdminAudit({
      action: `Requested server ${action} from web panel`,
      actor: staff.identity,
      detail: record.result || record.command,
      severity: action === 'kill' || action === 'restart' ? 'danger' : action === 'update' ? 'warning' : 'success',
      url: '/staff/server',
    });

    return jsonWithSession({ ok: record.status !== 'failed', record }, undefined, staff.identity.steamId, request);
  }

  if (type === 'broadcast') {
    if (!canRunModerationActions(staff.identity)) return NextResponse.json({ error: 'Admin tools permission is required.' }, { status: 403, headers: noStoreHeaders() });
    const message = stringValue(body.message).replace(/[\r\n]+/g, ' ').slice(0, 180);
    if (message.length < 2) return NextResponse.json({ error: 'Write a broadcast message first.' }, { status: 400, headers: noStoreHeaders() });
    const command = `say "${message.replace(/"/g, '')}"`;
    const record = await sendServerCommand({ command, actor: staff.identity, reason: message });
    await notifyWebServerAction({ action: 'Website broadcast command requested', actor: staff.identity, reason: message, command: record.command, result: record.result, status: record.status, severity: 'info' });
    return jsonWithSession({ ok: record.status !== 'failed', record }, undefined, staff.identity.steamId, request);
  }

  return NextResponse.json({ error: 'Unsupported server action.' }, { status: 400, headers: noStoreHeaders() });
}
