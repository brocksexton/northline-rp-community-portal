import { BanListClient } from '@/components/BanListClient';
import { getBanRecords, getBanSummary } from '@/lib/ape-data';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ban List' };
export default async function BansPage() {
  const [records, summary] = await Promise.all([getBanRecords(), getBanSummary()]);
  return <BanListClient initialData={{ generatedAt: new Date().toISOString(), records, summary }} />;
}
