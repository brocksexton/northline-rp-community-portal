import { NextResponse } from 'next/server';
import { buildLeaderboardData } from '@/lib/leaderboard-data';
import { getSessionSteamId } from '@/lib/session';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

export async function GET() {
  if (!(await isSiteFeatureEnabled('leaderboards'))) return NextResponse.json({ ok: false, message: 'Leaderboards are not enabled.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const steamId = await getSessionSteamId();
  const data = await buildLeaderboardData(steamId);
  return NextResponse.json(data, {
    headers: {
      'cache-control': 'private, no-store, max-age=0',
      'cdn-cache-control': 'no-store',
      'cloudflare-cdn-cache-control': 'no-store',
      vary: 'Cookie, Authorization',
    },
  });
}
