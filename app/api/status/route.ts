import { NextResponse } from 'next/server';
import { noStoreHeaders } from '@/lib/session';
import { getDataHealth, getPopulationSummary, getServerConfig } from '@/lib/ape-data';
import { captureMetricSample, getMetricSamples, getStatusUpdates } from '@/lib/community-data';

export const dynamic = 'force-dynamic';

function inferServerState(healthExists: boolean, onlineCount: number, latestEventAt: string | null) {
  if (!healthExists) return 'data_missing';
  if (onlineCount > 0) return 'online';
  if (!latestEventAt) return 'unknown';
  const ageMs = Date.now() - new Date(latestEventAt).getTime();
  if (Number.isFinite(ageMs) && ageMs < 1000 * 60 * 20) return 'quiet';
  return 'unknown';
}

export async function GET() {
  const [health, serverConfig, population, sample, samples, updates] = await Promise.all([
    getDataHealth(),
    getServerConfig(),
    getPopulationSummary(),
    captureMetricSample(),
    getMetricSamples(144),
    getStatusUpdates(8),
  ]);

  const state = inferServerState(health.exists, population.onlineCount, population.latestEventAt);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    state,
    health,
    server: {
      name: serverConfig.ServerName ?? 'Northline RP',
      subtitle: serverConfig.ServerSubtitle ?? 's&box roleplay server',
      maxPlayers: serverConfig.MaxPlayers ?? null,
      discordUrl: serverConfig.ServerDiscordUrl ?? null,
    },
    population,
    current: sample,
    samples,
    updates,
    notes: {
      metrics: 'CPU, RAM, disk, and process memory are sampled by the web process. True NIC bytes in/out can be added later with a Windows performance-counter collector.',
    },
  }, { headers: noStoreHeaders() });
}
