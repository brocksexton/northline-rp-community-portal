import { NextResponse } from 'next/server';
import { getBanRecords, getBanSummary } from '@/lib/ape-data';
export const dynamic = 'force-dynamic';
export async function GET() {
  const [records, summary] = await Promise.all([getBanRecords(), getBanSummary()]);
  return NextResponse.json({ generatedAt: new Date().toISOString(), records, summary }, { headers: { 'Cache-Control': 'no-store' } });
}
