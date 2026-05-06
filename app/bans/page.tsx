import { BanListClient } from '@/components/BanListClient';
import { getBanRecords, getBanSummary } from '@/lib/ape-data';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { notFound } from 'next/navigation';
import { enabledFeatureIds, getSiteFeatureSettings, isSiteFeatureEnabled } from '@/lib/site-features-data';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Ban List',
    description: 'Public Northline RP moderation and ban records for community transparency.',
    path: '/bans',
  });
}
export default async function BansPage() {
  if (!(await isSiteFeatureEnabled('bans'))) notFound();

  const [records, summary, featureSettings] = await Promise.all([getBanRecords(), getBanSummary(), getSiteFeatureSettings()]);
  const enabledFeatures = enabledFeatureIds(featureSettings);
  return <BanListClient initialData={{ generatedAt: new Date().toISOString(), records, summary }} tweeterVisible={enabledFeatures.has('tweeter')} />;
}
