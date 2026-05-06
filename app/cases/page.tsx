import { CasesHub } from '@/components/CasesHub';
import { getCasesState } from '@/lib/cases-data';
import { getSessionSteamId } from '@/lib/session';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { notFound } from 'next/navigation';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Cases',
    description: 'Free daily check-in cases and website rewards for Northline RP citizens.',
    path: '/cases',
  });
}

export default async function CasesPage() {
  if (!(await isSiteFeatureEnabled('dailyDrops'))) notFound();

  const steamId = await getSessionSteamId();
  const state = steamId ? await getCasesState(steamId) : null;
  return (
    <main className="page-shell cases-page">
      <CasesHub initialState={state} signedIn={Boolean(steamId)} />
    </main>
  );
}
