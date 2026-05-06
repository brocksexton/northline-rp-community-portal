import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { notFound } from 'next/navigation';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

export default async function LeaderboardRedirectPage() {
  if (!(await isSiteFeatureEnabled('leaderboards'))) notFound();

  redirect('/leaderboards');
}
