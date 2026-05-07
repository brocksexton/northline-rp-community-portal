import { notFound } from 'next/navigation';
import { JobPortalClient } from '@/components/JobPortalClient';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { getPublicJobsState } from '@/lib/jobs-data';
import { getSessionSteamId } from '@/lib/session';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return buildPageMetadata({ title: 'Staff Applications', description: 'Apply for open Northline RP staff roles and track staff application updates.', path: '/jobs' });
}

export default async function JobsPage() {
  if (!(await isSiteFeatureEnabled('jobs'))) notFound();
  const steamId = await getSessionSteamId();
  const state = await getPublicJobsState(steamId);
  return <main className="page-shell jobs-page"><JobPortalClient initialState={state} signedIn={Boolean(steamId)} /></main>;
}
