import { NextResponse } from 'next/server';
import { noStoreHeaders } from '@/lib/session';
import { getDataHealth, getPopulationSummary, getServerConfig, getServerRuntimeStatus } from '@/lib/ape-data';
import { captureMetricSample, getMetricSamples, getStatusUpdates } from '@/lib/community-data';
import { getSiteConfig } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

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

  const runtime = await getServerRuntimeStatus({ health, population, staleAfterMinutes: config.status.offlineAfterMinutes, serverHost: config.status.serverHost, serverPort: config.status.serverPort, queryTimeoutMs: config.status.queryTimeoutMs });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    state: runtime.state,
    runtime,
    health,
    server: {
      name: serverConfig.ServerName ?? 'Northline RP',
      subtitle: serverConfig.ServerSubtitle ?? 's&box roleplay server',
      maxPlayers: runtime.maxPlayers ?? serverConfig.MaxPlayers ?? null,
      discordUrl: serverConfig.ServerDiscordUrl ?? null,
      isOnline: runtime.online,
      statusSource: runtime.source,
      lastSignalAt: runtime.lastSignalAt,
    },
    population,
    current: sample,
    samples,
    updates,
    notes: {
      metrics: 'CPU, RAM, disk, and process memory are sampled by the web process. True NIC bytes in/out can be added later with a Windows performance-counter collector.',
      serverStatus: 'If APE_RP_DATA_PATH/server_status.json exists, it is treated as the preferred server heartbeat. Otherwise, the portal queries the configured game server at NORTHLINE_SERVER_QUERY_HOST:NORTHLINE_SERVER_QUERY_PORT, defaulting to 203.0.113.10:27015.',
    },
  }, { headers: noStoreHeaders() });
}
