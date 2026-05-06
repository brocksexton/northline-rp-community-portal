import { NextRequest, NextResponse } from 'next/server';
import { claimDailyCase, getCasesState, openClaimedCase } from '@/lib/cases-data';
import { getSessionSteamId } from '@/lib/session';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

function noStore<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'cache-control': 'private, no-store, max-age=0',
      'cdn-cache-control': 'no-store',
      'cloudflare-cdn-cache-control': 'no-store',
      vary: 'Cookie, Authorization',
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET() {
  if (!(await isSiteFeatureEnabled('dailyDrops'))) return noStore({ authenticated: false, state: null, message: 'Daily drops are not enabled.' }, { status: 404 });
  const steamId = await getSessionSteamId();
  if (!steamId) return noStore({ authenticated: false, state: null }, { status: 401 });
  return noStore({ authenticated: true, state: await getCasesState(steamId) });
}

export async function POST(request: NextRequest) {
  if (!(await isSiteFeatureEnabled('dailyDrops'))) return noStore({ ok: false, message: 'Daily drops are not enabled.' }, { status: 404 });
  const steamId = await getSessionSteamId();
  if (!steamId) return noStore({ ok: false, message: 'Sign in again before using cases.' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { action?: string; caseItemId?: string };
  if (body.action === 'claim') {
    const result = await claimDailyCase(steamId);
    return noStore({ ...result, message: result.ok ? 'Case claimed.' : 'Your daily case is not ready yet.' });
  }
  if (body.action === 'open') {
    const result = await openClaimedCase(steamId, String(body.caseItemId ?? ''));
    return noStore({ ...result, message: result.ok ? 'Case opened.' : 'Could not open that case.' });
  }

  return noStore({ ok: false, message: 'Unknown case action.' }, { status: 400 });
}
