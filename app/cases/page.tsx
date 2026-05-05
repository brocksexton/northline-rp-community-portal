import type { Metadata } from 'next';
import { CasesHub } from '@/components/CasesHub';
import { getCasesState } from '@/lib/cases-data';
import { getSessionSteamId } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Cases',
  description: 'Free daily check-in cases for Northline RP citizens.',
};

export default async function CasesPage() {
  const steamId = await getSessionSteamId();
  const state = steamId ? await getCasesState(steamId) : null;
  return (
    <main className="page-shell cases-page">
      <CasesHub initialState={state} signedIn={Boolean(steamId)} />
    </main>
  );
}
