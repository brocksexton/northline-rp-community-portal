import { NextRequest, NextResponse } from 'next/server';
import { reviewJobApplication } from '@/lib/jobs-data';
import { jsonWithSession, withNoStoreHeaders } from '@/lib/session';
import { discordAuditField, notifyAdminAudit } from '@/lib/discord-webhooks';
import { canReviewJobApplications, getRequestStaffIdentity } from '@/lib/staff-auth';

export async function POST(request: NextRequest) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity) return jsonWithSession({ ok: false, message: 'Sign in required.' }, { status: 401 }, null, request);
  if (!canReviewJobApplications(identity)) return jsonWithSession({ ok: false, message: 'Staff review access required.' }, { status: 403 }, identity.steamId, request);
  const body = await request.json().catch(() => ({}));
  const state = await reviewJobApplication(body, identity.steamId, identity.roleLabel);
  await notifyAdminAudit({
    action: 'Reviewed staff application',
    actor: { steamId: identity.steamId, name: identity.roleLabel },
    severity: 'info',
    url: '/staff',
    fields: [
      discordAuditField('Application ID', typeof body === 'object' && body !== null ? String((body as Record<string, unknown>).applicationId ?? '') : ''),
      discordAuditField('Status', typeof body === 'object' && body !== null ? String((body as Record<string, unknown>).status ?? '') : '', true),
    ],
  });
  return jsonWithSession({ ok: true, state }, undefined, identity.steamId, request);
}

export async function OPTIONS() {
  return withNoStoreHeaders(new NextResponse(null, { status: 204 }));
}
