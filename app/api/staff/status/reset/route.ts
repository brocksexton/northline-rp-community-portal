import { NextRequest, NextResponse } from 'next/server';
import { resetStatusRuntimeData } from '@/lib/ape-data';
import { notifyAdminAudit } from '@/lib/discord-webhooks';
import { canPostStatusUpdates, requireServerAdministrationRequest } from '@/lib/staff-auth';
import { jsonWithSession, noStoreHeaders } from '@/lib/session';
import { rateLimit, readJsonBody, requireSameSiteRequest } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Body = Record<string, unknown>;

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'staff-status-reset', 6, 60_000);
  if (limited) return limited;

  const sameSite = requireSameSiteRequest(request);
  if (sameSite) return sameSite;

  const staff = await requireServerAdministrationRequest(request, 'status');
  if ('response' in staff) return staff.response;

  if (!canPostStatusUpdates(staff.identity)) {
    return NextResponse.json({ error: 'AdminTools or server settings permission is required.' }, { status: 403, headers: noStoreHeaders() });
  }

  let body: Body = {};
  try { body = await readJsonBody<Body>(request, 8 * 1024); }
  catch { return NextResponse.json({ error: 'Request body is too large or invalid.' }, { status: 413, headers: noStoreHeaders() }); }

  try {
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 240) : undefined;
    const reset = await resetStatusRuntimeData({ actorSteamId: staff.identity.steamId, actorName: staff.identity.displayName, reason });

    await notifyAdminAudit({
      action: 'Reset public server status snapshot',
      actor: staff.identity,
      detail: reason || 'Cleared stale connected-player/status data shown by the website.',
      severity: 'warning',
      url: '/staff/status',
    });

    return jsonWithSession({ ok: true, reset }, { headers: noStoreHeaders() }, staff.identity.steamId, request);
  } catch (error) {
    const message = error instanceof Error && error.message === 'data_path_not_configured'
      ? 'APE_RP_DATA_PATH is not configured, so the status reset marker could not be written.'
      : 'Could not reset status data right now.';
    return NextResponse.json({ error: message }, { status: 500, headers: noStoreHeaders() });
  }
}
