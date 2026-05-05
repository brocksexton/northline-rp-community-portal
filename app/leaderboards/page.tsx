import type { Metadata } from 'next';
import { LeaderboardsClient } from '@/components/LeaderboardsClient';
import { buildLeaderboardData } from '@/lib/leaderboard-data';
import { getSessionSteamId } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Leaderboards',
  description: 'Public Northline RP leaderboards for opted-in citizens.',
};

export default async function LeaderboardsPage() {
  const steamId = await getSessionSteamId();
  const data = await buildLeaderboardData(steamId);

  return (
    <main className="page-shell leaderboards-page">
      <LeaderboardsClient summary={data.summary} boards={data.boards} />
    </main>
  );
}
