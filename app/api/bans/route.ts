import { NextResponse } from 'next/server';
import { getBanRecords, getBanSummary } from '@/lib/ape-data';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!(await isSiteFeatureEnabled('bans'))) return NextResponse.json({ ok: false, message: 'Ban list is not enabled.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const [records, summary] = await Promise.all([getBanRecords(), getBanSummary()]);
  return NextResponse.json({ generatedAt: new Date().toISOString(), records, summary }, { headers: { 'Cache-Control': 'no-store' } });
}
