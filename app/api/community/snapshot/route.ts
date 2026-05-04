import { NextResponse } from 'next/server';
import { getAllDamageLogs, getCityOverview, getDeathSummary } from '@/lib/ape-data';
import { noStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

function recentFatalId(log: Awaited<ReturnType<typeof getAllDamageLogs>>[number]) {
  return `${log.Timestamp}-${log.VictimSteamId}-${log.Cause ?? 'unknown'}-${log.HealthAfter ?? 'na'}`;
}

export async function GET() {
  const [overview, deathSummary, damageLogs] = await Promise.all([
    getCityOverview(),
    getDeathSummary(),
    getAllDamageLogs(),
  ]);
  const recentFatal = damageLogs.find((log) => Boolean(log.IsFatal));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    overview: {
      players: overview.players,
      tweets: overview.tweets,
      propertyLayouts: overview.propertyLayouts,
      propertyProps: overview.propertyProps,
      totalCash: overview.totalCash,
      totalBank: overview.totalBank,
    },
    deathSummary,
    recentFatal: recentFatal ? {
      id: recentFatalId(recentFatal),
      victimName: recentFatal.VictimName || 'Someone',
      cause: recentFatal.Cause || 'Unknown',
      timestamp: recentFatal.Timestamp,
    } : null,
  }, { headers: noStoreHeaders() });
}
