import { notFound } from 'next/navigation';
import { JobPortalClient } from '@/components/JobPortalClient';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { getPublicJobsState } from '@/lib/jobs-data';
import { getSessionSteamId } from '@/lib/session';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return buildPageMetadata({ title: 'My Staff Applications', description: 'Track submitted staff applications, statuses, and staff notes.', path: '/jobs/applications' });
}

export default async function MyApplicationsPage() {
  if (!(await isSiteFeatureEnabled('jobs'))) notFound();
  const steamId = await getSessionSteamId();
  const state = await getPublicJobsState(steamId);
  return <main className="page-shell jobs-page"><JobPortalClient initialState={state} signedIn={Boolean(steamId)} initialView="applications" /></main>;
}
