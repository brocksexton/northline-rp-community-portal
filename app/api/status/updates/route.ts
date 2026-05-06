import { NextRequest, NextResponse } from 'next/server';
import { getPlayer, getPermissionsForSteamId, getRoleForSteamId } from '@/lib/ape-data';
import { createStatusUpdate, deleteStatusUpdate, updateStatusUpdate, type StatusUpdateTone } from '@/lib/community-data';
import { getSessionSteamIdFromRequest, jsonWithSession, noStoreHeaders } from '@/lib/session';
import { getSteamProfile } from '@/lib/steam-openid';
import { discordAuditField, notifyAdminAudit, notifyStatusUpdatePosted } from '@/lib/discord-webhooks';

export const dynamic = 'force-dynamic';

type StaffIdentity = {
  steamId: string;
  displayName: string;
};

function canPostStatus(role: string, permissions: string[]): boolean {
  return ['Developer', 'Admin'].includes(role) || permissions.includes('AdminTools') || permissions.includes('ModifyServerSettings');
}

function normalizeTone(value: unknown): StatusUpdateTone {
  if (value === 'event' || value === 'warning' || value === 'maintenance') return value;
  return 'info';
}

function normalizeAccent(value: unknown): string | undefined {
  const accentColor = String(value ?? '').trim();
  return /^#[0-9a-f]{6}$/i.test(accentColor) ? accentColor : undefined;
}

async function requireStaff(request: NextRequest): Promise<{ identity: StaffIdentity } | { response: NextResponse }> {
  const steamId = getSessionSteamIdFromRequest(request);
  if (!steamId) {
    return { response: NextResponse.json({ error: 'Steam sign-in required.' }, { status: 401, headers: noStoreHeaders() }) };
  }

  const [role, permissions, player, steamProfile] = await Promise.all([
    getRoleForSteamId(steamId),
    getPermissionsForSteamId(steamId),
    getPlayer(steamId),
    getSteamProfile(steamId),
  ]);

  if (!canPostStatus(role, permissions)) {
    return { response: NextResponse.json({ error: 'Admin or Developer access required.' }, { status: 403, headers: noStoreHeaders() }) };
  }

  return {
    identity: {
      steamId,
      displayName: player?.RpDisplayName || player?.LastKnownDisplayName || steamProfile?.personaName || `Steam ${steamId.slice(-8)}`,
    },
  };
}

function validateCopy(body: Record<string, unknown>) {
  const title = String(body.title ?? '').trim();
  const message = String(body.body ?? '').trim();
  if (title.length < 3 || message.length < 5) {
    return { error: 'Title and body are required.' };
  }
  return { title, message };
}

export async function POST(request: NextRequest) {
  const staff = await requireStaff(request);
  if ('response' in staff) return staff.response;

  const body = await request.json().catch(() => ({}));
  const copy = validateCopy(body);
  if ('error' in copy) return NextResponse.json({ error: copy.error }, { status: 400, headers: noStoreHeaders() });

  const update = await createStatusUpdate({
    title: copy.title,
    body: copy.message,
    tone: normalizeTone(body.tone),
    accentColor: normalizeAccent(body.accentColor),
    createdBySteamId: staff.identity.steamId,
    createdByName: staff.identity.displayName,
  });

  await notifyStatusUpdatePosted(update, staff.identity);
  await notifyAdminAudit({
    action: 'Posted public status update',
    actor: staff.identity,
    target: update.title,
    detail: update.body,
    severity: update.tone === 'warning' || update.tone === 'maintenance' ? 'warning' : 'success',
    url: '/status',
    fields: [discordAuditField('Tone', update.tone, true)],
  });

  return jsonWithSession({ update }, undefined, staff.identity.steamId, request);
}

export async function PATCH(request: NextRequest) {
  const staff = await requireStaff(request);
  if ('response' in staff) return staff.response;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? '').trim();
  if (!id) return NextResponse.json({ error: 'Notice ID is required.' }, { status: 400, headers: noStoreHeaders() });

  const copy = validateCopy(body);
  if ('error' in copy) return NextResponse.json({ error: copy.error }, { status: 400, headers: noStoreHeaders() });

  const update = await updateStatusUpdate(id, {
    title: copy.title,
    body: copy.message,
    tone: normalizeTone(body.tone),
    accentColor: normalizeAccent(body.accentColor),
    updatedBySteamId: staff.identity.steamId,
    updatedByName: staff.identity.displayName,
  });

  if (!update) return NextResponse.json({ error: 'Notice not found.' }, { status: 404, headers: noStoreHeaders() });
  await notifyAdminAudit({
    action: 'Edited public status update',
    actor: staff.identity,
    target: update.title,
    detail: update.body,
    severity: 'info',
    url: '/status',
    fields: [discordAuditField('Notice ID', update.id, true), discordAuditField('Tone', update.tone, true)],
  });
  return jsonWithSession({ update }, undefined, staff.identity.steamId, request);
}

export async function DELETE(request: NextRequest) {
  const staff = await requireStaff(request);
  if ('response' in staff) return staff.response;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? '').trim();
  if (!id) return NextResponse.json({ error: 'Notice ID is required.' }, { status: 400, headers: noStoreHeaders() });

  const deleted = await deleteStatusUpdate(id);
  if (!deleted) return NextResponse.json({ error: 'Notice not found.' }, { status: 404, headers: noStoreHeaders() });
  await notifyAdminAudit({
    action: 'Removed public status update',
    actor: staff.identity,
    target: id,
    severity: 'warning',
    url: '/status',
  });
  return jsonWithSession({ ok: true, id }, undefined, staff.identity.steamId, request);
}
