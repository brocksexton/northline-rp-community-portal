import { NextResponse } from 'next/server';
import { buildLeaderboardData } from '@/lib/leaderboard-data';
import { getSessionSteamId } from '@/lib/session';

export async function GET() {
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
