import { NextRequest, NextResponse } from 'next/server';
import { getJobsAdminState, saveJobPostings } from '@/lib/jobs-data';
import { jsonWithSession, withNoStoreHeaders } from '@/lib/session';
import { discordAuditField, notifyAdminAudit } from '@/lib/discord-webhooks';
import { canAccessServerAdministration, canManageJobPostings, getRequestStaffIdentity } from '@/lib/staff-auth';

export async function GET(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canAccessServerAdministration(identity)) return jsonWithSession({ ok: false, message: 'Staff access required.' }, { status: 403 }, identity.steamId, request);
  return jsonWithSession({ ok: true, state: await getJobsAdminState() }, undefined, identity.steamId, request);
}

export async function POST(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canManageJobPostings(identity)) return jsonWithSession({ ok: false, message: 'Ape Tavern staff or AdminTools access required.' }, { status: 403 }, identity.steamId, request);
  const body = await request.json().catch(() => ({}));
  const state = await saveJobPostings(body, identity.steamId);
  await notifyAdminAudit({
    action: 'Updated staff job postings',
    actor: { steamId: identity.steamId, name: identity.roleLabel },
    severity: 'warning',
    url: '/staff',
    fields: [
      discordAuditField('Postings', String(state.postings.length), true),
      discordAuditField('Active', String(state.postings.filter((posting) => posting.status === 'active').length), true),
      discordAuditField('Active labels', state.postings.filter((posting) => posting.status === 'active').map((posting) => posting.title).join(', ') || 'None'),
    ],
  });
  return jsonWithSession({ ok: true, state }, undefined, identity.steamId, request);
}

export async function OPTIONS() {
  return withNoStoreHeaders(new NextResponse(null, { status: 204 }));
}
