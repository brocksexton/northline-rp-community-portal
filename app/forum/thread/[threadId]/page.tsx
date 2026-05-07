import { notFound } from 'next/navigation';
import { ForumThreadClient } from '@/components/ForumThreadClient';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { getForumThread } from '@/lib/forum-data';
import { getSessionSteamId } from '@/lib/session';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

type Props = { params: Promise<{ threadId: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { threadId } = await params;
  const data = await getForumThread(threadId);
  return buildPageMetadata({
    title: data?.thread.title ?? 'Forum thread',
    description: data?.thread.excerpt ?? 'Northline RP forum thread.',
    path: `/forum/thread/${threadId}`,
  });
}

export default async function ForumThreadPage({ params }: Props) {
  const enabled = await isSiteFeatureEnabled('forum');
  if (!enabled) notFound();
  const { threadId } = await params;
  const data = await getForumThread(threadId);
  if (!data) notFound();
  const steamId = await getSessionSteamId();
  return <main className="page-shell forum-page"><ForumThreadClient thread={data.thread} initialPosts={data.posts} signedIn={Boolean(steamId)} /></main>;
}
