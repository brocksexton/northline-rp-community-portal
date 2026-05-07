import { NextRequest, NextResponse } from 'next/server';
import { requireBotApiSecret } from '@/app/api/bot/auth';
import { noStoreHeaders } from '@/lib/session';
import { getDeathSummary, getPopulationSummary, getServerConfig, getServerRuntimeStatus } from '@/lib/ape-data';
import { getConnectedServerPlayers, scanGameModerationActions } from '@/lib/server-admin';
import { getSiteConfig } from '@/lib/site-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  const unauthorized = requireBotApiSecret(request);
  if (unauthorized) return unauthorized;

  await scanGameModerationActions().catch(() => ({ sent: 0, scanned: 0 }));

  const [siteConfig, serverConfig, population, deaths, players] = await Promise.all([
    getSiteConfig(),
    getServerConfig(),
    getPopulationSummary(),
    getDeathSummary(),
    getConnectedServerPlayers(),
  ]);

  const runtime = await getServerRuntimeStatus({
    population,
    staleAfterMinutes: siteConfig.status.offlineAfterMinutes,
    serverHost: siteConfig.status.serverHost,
    serverPort: siteConfig.status.serverPort,
    queryTimeoutMs: siteConfig.status.queryTimeoutMs,
    fallbackQueryHosts: siteConfig.status.fallbackQueryHosts,
    processNames: siteConfig.status.processNames,
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    site: {
      name: siteConfig.brand.name,
      url: process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || siteConfig.brand.siteUrl,
      imageUrl: siteConfig.brand.embedImageUrl,
    },
    server: {
      name: serverConfig.ServerName ?? 'Northline RP',
      subtitle: serverConfig.ServerSubtitle ?? 'Community Server',
      maxPlayers: runtime.maxPlayers ?? serverConfig.MaxPlayers ?? null,
    },
    runtime: {
      state: runtime.state,
      label: runtime.label,
      message: runtime.message,
      online: runtime.online,
      playerCount: runtime.playerCount,
      maxPlayers: runtime.maxPlayers,
      lastSignalAt: runtime.lastSignalAt,
      source: runtime.source,
    },
    population,
    players,
    deaths: {
      ...deaths,
      fatalityRate: deaths.damageEvents > 0 ? deaths.total / deaths.damageEvents : 0,
    },
  }, { headers: noStoreHeaders() });
}
