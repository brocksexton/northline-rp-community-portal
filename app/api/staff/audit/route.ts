import { NextRequest, NextResponse } from 'next/server';
import { getStaffAuditState, setStaffPageDisabled, STAFF_PAGE_DEFINITIONS, type StaffPageKey } from '@/lib/staff-audit-data';
import { jsonWithSession, noStoreHeaders } from '@/lib/session';
import { requireServerAdministrationRequest } from '@/lib/staff-auth';
import { notifyAdminAudit } from '@/lib/discord-webhooks';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Body = { steamId?: unknown; page?: unknown; disabled?: unknown };

function pageKey(value: unknown): StaffPageKey | null {
  const raw = String(value ?? '').trim().toLowerCase();
  return STAFF_PAGE_DEFINITIONS.some((page) => page.id === raw) ? raw as StaffPageKey : null;
}

export async function GET(request: NextRequest) {
  const staff = await requireServerAdministrationRequest(request, 'audit');
  if ('response' in staff) return staff.response;
  const state = await getStaffAuditState();
  return jsonWithSession(state, { headers: noStoreHeaders() }, staff.identity.steamId, request);
}

export async function POST(request: NextRequest) {
  const staff = await requireServerAdministrationRequest(request, 'audit');
  if ('response' in staff) return staff.response;

  const body = await request.json().catch(() => ({} as Body));
  const steamId = String(body.steamId ?? '').trim();
  const page = pageKey(body.page);
  const disabled = Boolean(body.disabled);

  if (!/^\d{15,20}$/.test(steamId) || !page) {
    return NextResponse.json({ error: 'A valid staff SteamID and staff page are required.' }, { status: 400, headers: noStoreHeaders() });
  }

  try {
    await setStaffPageDisabled({ steamId, page, disabled, actor: staff.identity });
    await notifyAdminAudit({
      action: disabled ? 'Disabled staff page access' : 'Restored staff page access',
      actor: { steamId: staff.identity.steamId, name: staff.identity.displayName },
      target: steamId,
      detail: `${page} access ${disabled ? 'disabled' : 'restored'}`,
      severity: disabled ? 'warning' : 'info',
    });
    const state = await getStaffAuditState();
    return jsonWithSession({ ok: true, state }, { headers: noStoreHeaders() }, staff.identity.steamId, request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update staff access.' }, { status: 400, headers: noStoreHeaders() });
  }
}
