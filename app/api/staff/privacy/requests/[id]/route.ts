import { NextRequest, NextResponse } from 'next/server';
import { updatePrivacyRequestStatus, type PrivacyRequestStatus } from '@/lib/privacy-data';
import { canManageStaffAudit, getRequestStaffIdentity } from '@/lib/staff-auth';
import { noStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';
const allowed: PrivacyRequestStatus[] = ['approved', 'rejected', 'completed', 'cancelled'];

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const identity = await getRequestStaffIdentity(request);
  if (!identity || !canManageStaffAudit(identity)) return NextResponse.json({ error: 'Admin access required.' }, { status: 403, headers: noStoreHeaders() });
  const params = await context.params;
  const body = await request.json().catch(() => ({}));
  const status = String(body.status || '') as PrivacyRequestStatus;
  if (!allowed.includes(status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400, headers: noStoreHeaders() });
  try { return NextResponse.json(await updatePrivacyRequestStatus(params.id, status, identity.steamId, identity.displayName, String(body.note || '')), { headers: noStoreHeaders() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update request.' }, { status: 400, headers: noStoreHeaders() }); }
}
