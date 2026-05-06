import { LeaderboardsClient } from '@/components/LeaderboardsClient';
import { buildLeaderboardData } from '@/lib/leaderboard-data';
import { getSessionSteamId } from '@/lib/session';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { notFound } from 'next/navigation';
import { enabledFeatureIds, getSiteFeatureSettings, isSiteFeatureEnabled } from '@/lib/site-features-data';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Leaderboards',
    description: 'Public Northline RP leaderboards for opted-in citizens, playtime, progress, and city stats.',
    path: '/leaderboards',
  });
}

export default async function LeaderboardsPage() {
  if (!(await isSiteFeatureEnabled('leaderboards'))) notFound();

  const [steamId, featureSettings] = await Promise.all([getSessionSteamId(), getSiteFeatureSettings()]);
  const enabledFeatures = enabledFeatureIds(featureSettings);
  const playersVisible = enabledFeatures.has('players');
  const tweeterVisible = enabledFeatures.has('tweeter');
  const data = await buildLeaderboardData(steamId);
  const boards = tweeterVisible ? data.boards : data.boards.filter((board) => board.category !== 'Tweeter');

  return (
    <main className="page-shell leaderboards-page">
      <LeaderboardsClient summary={data.summary} boards={boards} playersVisible={playersVisible} />
    </main>
  );
}
