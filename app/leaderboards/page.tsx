import { LeaderboardsClient } from '@/components/LeaderboardsClient';
import { buildLeaderboardData } from '@/lib/leaderboard-data';
import { getSessionSteamId } from '@/lib/session';
import { buildPageMetadata } from '@/lib/embed-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Leaderboards',
    description: 'Public Northline RP leaderboards for opted-in citizens, playtime, progress, and city stats.',
    path: '/leaderboards',
  });
}

export default async function LeaderboardsPage() {
  const steamId = await getSessionSteamId();
  const data = await buildLeaderboardData(steamId);

  return (
    <main className="page-shell leaderboards-page">
      <LeaderboardsClient summary={data.summary} boards={data.boards} />
    </main>
  );
}
