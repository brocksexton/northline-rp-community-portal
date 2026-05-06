import { NextResponse } from 'next/server';
import { noStoreHeaders } from '@/lib/session';
import { getDataHealth, getPopulationSummary, getServerConfig, getServerRuntimeStatus } from '@/lib/ape-data';
import { captureMetricSample, getMetricSamples, getStatusUpdates } from '@/lib/community-data';
import { getSiteConfig } from '@/lib/site-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  const [config, health, serverConfig, population, sample, samples, updates] = await Promise.all([
    getSiteConfig(),
    getDataHealth(),
    getServerConfig(),
    getPopulationSummary(),
    captureMetricSample(),
    getMetricSamples(144),
    getStatusUpdates(8),
  ]);

  const runtime = await getServerRuntimeStatus({ health, population, staleAfterMinutes: config.status.offlineAfterMinutes, serverHost: config.status.serverHost, serverPort: config.status.serverPort, queryTimeoutMs: config.status.queryTimeoutMs, fallbackQueryHosts: config.status.fallbackQueryHosts, processNames: config.status.processNames });
  const publicRuntime = {
    state: runtime.state,
    label: runtime.label,
    message: runtime.message,
    source: runtime.source,
    online: runtime.online,
    playerCount: runtime.playerCount,
    maxPlayers: runtime.maxPlayers,
    lastSignalAt: runtime.lastSignalAt,
    signalAgeSeconds: runtime.signalAgeSeconds,
    staleAfterSeconds: runtime.staleAfterSeconds,
  };

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    state: runtime.state,
    runtime: publicRuntime,
    health,
    server: {
      name: serverConfig.ServerName ?? 'Northline RP',
      subtitle: serverConfig.ServerSubtitle ?? 's&box roleplay server',
      maxPlayers: runtime.maxPlayers ?? serverConfig.MaxPlayers ?? null,
      discordUrl: serverConfig.ServerDiscordUrl ?? null,
      isOnline: runtime.online,
      lastSignalAt: runtime.lastSignalAt,
    },
    population,
    current: sample,
    samples,
    updates,
    notes: {
      metrics: 'CPU, RAM, disk, and process memory are sampled by the web process. True NIC bytes in/out can be added later with a Windows performance-counter collector.',
      serverStatus: 'Fresh heartbeat data is preferred. If it is missing or stale, the portal checks the configured server query hosts and then verifies the local game process when available.',
    },
  }, { headers: noStoreHeaders() });
}
