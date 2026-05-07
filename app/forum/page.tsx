import { ForumBoardClient } from '@/components/ForumBoardClient';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { getForumStateForUser } from '@/lib/forum-data';
import { getSessionSteamId } from '@/lib/session';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Forum',
    description: 'Northline RP website forum for announcements, discussions, and Discord-synced community threads.',
    path: '/forum',
  });
}

export default async function ForumPage() {
  const enabled = await isSiteFeatureEnabled('forum');
  if (!enabled) {
    return (
      <main className="page-shell">
        <section className="card auth-panel">
          <span className="eyebrow">Forum</span>
          <h1>The forum is currently hidden.</h1>
          <p>Staff can enable it from site feature visibility when it is ready for public use.</p>
        </section>
      </main>
    );
  }
  const steamId = await getSessionSteamId();
  const state = await getForumStateForUser(steamId);
  return <main className="page-shell forum-page"><ForumBoardClient initialState={state} signedIn={Boolean(steamId)} /></main>;
}
