import { BanListClient } from '@/components/BanListClient';
import { getBanRecords, getBanSummary } from '@/lib/ape-data';
import { buildPageMetadata } from '@/lib/embed-metadata';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Ban List',
    description: 'Public Northline RP moderation and ban records for community transparency.',
    path: '/bans',
  });
}
export default async function BansPage() {
  const [records, summary] = await Promise.all([getBanRecords(), getBanSummary()]);
  return <BanListClient initialData={{ generatedAt: new Date().toISOString(), records, summary }} />;
}
