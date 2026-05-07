import { NextRequest, NextResponse } from 'next/server';
import { requireBotApiSecret } from '@/app/api/bot/auth';
import { buildModerationCommand, runServerPowerAction, sendServerCommand } from '@/lib/server-admin';
import { noStoreHeaders } from '@/lib/session';
import { notifyAdminAudit, notifyWebServerAction } from '@/lib/discord-webhooks';
import type { StaffIdentity } from '@/lib/staff-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Body = Record<string, unknown>;

function stringValue(value: unknown, max = 300) {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

function durationValue(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.min(Math.round(number), 5256000);
}

function botActor(body: Body): StaffIdentity {
  const username = stringValue(body.actorName, 80) || 'Discord Bot';
  const id = stringValue(body.actorId, 80) || 'discord-bot';
  return {
    steamId: `discord:${id}`,
    displayName: username,
    role: 'discord-bot',
    permissions: ['AdminTools', 'ModifyServerSettings', 'ViewLogs'],
  };
}

export async function POST(request: NextRequest) {
  const unauthorized = requireBotApiSecret(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => ({} as Body));
  const type = stringValue(body.type, 80);
  const actor = botActor(body);

  if (type === 'moderation') {
    const action = stringValue(body.action, 20) === 'ban' ? 'ban' : 'kick';
    const steamId = stringValue(body.steamId, 32);
    const name = stringValue(body.name, 80) || steamId;
    const reason = stringValue(body.reason, 180) || 'No reason provided';
    if (!/^\d{15,20}$/.test(steamId)) return NextResponse.json({ error: 'A valid SteamID64 is required.' }, { status: 400, headers: noStoreHeaders() });

    const command = buildModerationCommand({ action, steamId, name, reason, durationMinutes: durationValue(body.durationMinutes) });
    const record = await sendServerCommand({ command, actor, targetSteamId: steamId, targetName: name, reason });
    await notifyWebServerAction({ action: `Discord ${action} command requested`, actor, targetSteamId: steamId, targetName: name, reason, command: record.command, result: record.result, status: record.status, severity: action === 'ban' ? 'danger' : 'warning' });
    await notifyAdminAudit({ action: `Requested game ${action} from Discord bot`, actor, target: `${name} (${steamId})`, detail: reason, severity: action === 'ban' ? 'danger' : 'warning', url: '/staff/server' });
    return NextResponse.json({ ok: record.status !== 'failed', record }, { headers: noStoreHeaders() });
  }

  if (type === 'broadcast') {
    const message = stringValue(body.message, 180);
    if (message.length < 2) return NextResponse.json({ error: 'Broadcast message is required.' }, { status: 400, headers: noStoreHeaders() });
    const command = `say "${message.replace(/"/g, '')}"`;
    const record = await sendServerCommand({ command, actor, reason: message });
    await notifyWebServerAction({ action: 'Discord broadcast command requested', actor, reason: message, command: record.command, result: record.result, status: record.status, severity: 'info' });
    await notifyAdminAudit({ action: 'Requested server broadcast from Discord bot', actor, detail: message, severity: 'info', url: '/staff/server' });
    return NextResponse.json({ ok: record.status !== 'failed', record }, { headers: noStoreHeaders() });
  }

  if (type === 'server-control') {
    const requested = stringValue(body.action, 20);
    const action = requested === 'start' || requested === 'kill' || requested === 'restart' || requested === 'update' ? requested : null;
    if (!action) return NextResponse.json({ error: 'Unsupported server control action.' }, { status: 400, headers: noStoreHeaders() });
    const record = await runServerPowerAction(action, actor);
    await notifyWebServerAction({ action: `Discord server ${action} requested`, actor, command: record.command, result: record.result, status: record.status, severity: action === 'kill' || action === 'restart' ? 'danger' : action === 'update' ? 'warning' : 'success' });
    await notifyAdminAudit({ action: `Requested server ${action} from Discord bot`, actor, detail: record.result || record.command, severity: action === 'kill' || action === 'restart' ? 'danger' : action === 'update' ? 'warning' : 'success', url: '/staff/server' });
    return NextResponse.json({ ok: record.status !== 'failed', record }, { headers: noStoreHeaders() });
  }

  return NextResponse.json({ error: 'Unsupported bot action.' }, { status: 400, headers: noStoreHeaders() });
}
