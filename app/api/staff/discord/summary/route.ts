import { NextRequest } from 'next/server';
import { getDiscordGuildSummary } from '@/lib/discord-manager';
import { getRequestStaffIdentity, canAccessServerAdministration } from '@/lib/staff-auth';
import { jsonWithSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canAccessServerAdministration(identity)) return jsonWithSession({ ok: false, message: 'Staff access required.' }, { status: 403 }, identity.steamId, request);
  const summary = await getDiscordGuildSummary();
  return jsonWithSession({ ok: true, summary }, undefined, identity.steamId, request);
}
