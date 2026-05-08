import Link from 'next/link';
import {
  getCityOverview,
  getDataHealth,
  getPopulationSummary,
  getPopulationTrends,
  getServerConfig,
  getServerRuntimeStatus,
  type PopulationTrendPoint,
  type ServerRuntimeStatus,
} from '@/lib/ape-data';
import { getMetricSamples, getStatusUpdates } from '@/lib/community-data';
import { duration, relativeFromDate } from '@/lib/format';
import { getSiteConfig } from '@/lib/site-config';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { getOperationalMetrics } from '@/lib/host-metrics';
import { notFound } from 'next/navigation';
import { enabledFeatureIds, getSiteFeatureSettings, isSiteFeatureEnabled } from '@/lib/site-features-data';
import { StatusNoticeBoard } from '@/components/StatusNoticeBoard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Server Status & Metrics',
    description: 'Northline RP server reachability, current population, notices, player trends, and host metrics.',
    path: '/status',
  });
}

type StatusTone = 'success' | 'warning' | 'neutral' | 'danger';

type PublicState = {
  label: string;
  tone: StatusTone;
  headline: string;
  body: string;
  primaryAction: string;
};

function inferPublicState(runtime: ServerRuntimeStatus, onlineCount: number, latestEventAt: string | null): PublicState {
  if (runtime.state === 'data_missing') {
    return {
      label: 'Checking',
      tone: 'warning',
      headline: 'Status data is unavailable.',
      body: 'The portal cannot read the configured game data folder right now. The game server may still be reachable, but the website cannot verify the city state from local files.',
      primaryAction: 'Check Discord',
    };
  }

  if (runtime.state === 'offline') {
    return {
      label: 'Offline',
      tone: 'danger',
      headline: 'Server offline.',
      body: runtime.lastSignalAt
        ? `No fresh server signal has been seen recently. Last visible activity was ${relativeFromDate(runtime.lastSignalAt)}.`
        : 'The portal cannot confirm the server is reachable right now. Check Discord for restart or maintenance updates.',
      primaryAction: 'Check Discord',
    };
  }

  if (runtime.state === 'online' && onlineCount > 0) {
    return {
      label: 'Online',
      tone: 'success',
      headline: 'Server online.',
      body: 'The city is reachable and players are connected right now.',
      primaryAction: 'Join through s&box',
    };
  }

  if (runtime.state === 'quiet' || runtime.state === 'online') {
    return {
      label: runtime.state === 'quiet' ? 'Online, quiet' : 'Online',
      tone: 'neutral',
      headline: 'Online, but quiet.',
      body: latestEventAt
        ? `Nobody is showing online at the moment. The latest visible activity was ${relativeFromDate(latestEventAt)}.`
        : 'The game server appears online, but nobody is showing as connected.',
      primaryAction: 'Join through s&box',
    };
  }

  return {
    label: 'Unknown',
    tone: 'warning',
    headline: 'Status unclear.',
    body: 'The portal can read some data, but it cannot confidently tell whether the game server is online. Discord is the safest place to check.',
    primaryAction: 'Check Discord',
  };
}

function metricText(value: number | null, suffix = '%') {
  return value === null ? 'Sampling' : `${value}${suffix}`;
}

function clampPercent(value: number | null | undefined) {
  return Math.max(0, Math.min(100, Math.round(Number(value ?? 0))));
}

function mbToGbLabel(mb: number) {
  if (mb >= 1024) return `${Math.round((mb / 1024) * 10) / 10} GB`;
  return `${mb.toLocaleString()} MB`;
}

function gbLabel(value: number | null | undefined) {
  return typeof value === 'number' ? `${value.toLocaleString()} GB` : 'Unavailable';
}

function eventLabel(isConnection: boolean) {
  return isConnection ? 'joined' : 'left';
}

function safeMax(values: number[]) {
  return Math.max(1, ...values.filter((value) => Number.isFinite(value)));
}

function TrendChart({ points, label }: { points: PopulationTrendPoint[]; label: string }) {
  const max = safeMax(points.map((point) => point.count));
  const width = 760;
  const height = 220;
  const paddingX = 24;
  const paddingY = 22;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;
  const coords = points.map((point, index) => {
    const x = paddingX + (points.length <= 1 ? 0 : (usableWidth / (points.length - 1)) * index);
    const y = paddingY + usableHeight - (point.count / max) * usableHeight;
    return { ...point, x, y };
  });
  const pathData = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const areaData = `${pathData} L ${paddingX + usableWidth} ${paddingY + usableHeight} L ${paddingX} ${paddingY + usableHeight} Z`;
  const axisValues = [max, Math.round(max / 2), 0];
  const labels = coords.filter((_, index) => index === 0 || index === coords.length - 1 || index === Math.floor(coords.length / 2));

  return (
    <div className="status-command-chart" role="img" aria-label={label}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="statusPopulationFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {axisValues.map((value, index) => {
          const y = paddingY + (usableHeight / 2) * index;
          return <line key={value + index} x1={paddingX} x2={paddingX + usableWidth} y1={y} y2={y} />;
        })}
        <path className="status-command-chart-area" d={areaData} />
        <path className="status-command-chart-line" d={pathData} />
        {coords.map((point, index) => <circle key={`${point.at}-${index}`} cx={point.x} cy={point.y} r="4" />)}
      </svg>
      <div className="status-command-chart-axis y-axis">
        {axisValues.map((value, index) => <span key={`${value}-${index}`}>{value}</span>)}
      </div>
      <div className="status-command-chart-axis x-axis">
        {labels.map((point) => <span key={point.at}>{point.label}</span>)}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, detail, percent }: { icon: string; label: string; value: string; detail: string; percent?: number | null }) {
  const width = typeof percent === 'number' ? clampPercent(percent) : null;
  return (
    <article className="status-command-metric-card">
      <div className="status-command-card-top">
        <i className={icon} aria-hidden="true" />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
      {width !== null ? <div className="status-command-meter" aria-hidden="true"><i style={{ width: `${width}%` }} /></div> : null}
    </article>
  );
}

function MiniStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="status-command-mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export default async function StatusPage() {
  if (!(await isSiteFeatureEnabled('status'))) notFound();
  const featureSettings = await getSiteFeatureSettings();
  const enabledFeatures = enabledFeatureIds(featureSettings);
  const tweeterVisible = enabledFeatures.has('tweeter');
  const supportVisible = enabledFeatures.has('support');

  const [config, health, serverConfig, population, trends, updates, overview, metrics, metricSamples] = await Promise.all([
    getSiteConfig(),
    getDataHealth(),
    getServerConfig(),
    getPopulationSummary(),
    getPopulationTrends(),
    getStatusUpdates(6),
    getCityOverview(),
    getOperationalMetrics(),
    getMetricSamples(48),
  ]);

  const runtime = await getServerRuntimeStatus({
    health,
    population,
    staleAfterMinutes: config.status.offlineAfterMinutes,
    serverHost: config.status.serverHost,
    serverPort: config.status.serverPort,
    queryTimeoutMs: config.status.queryTimeoutMs,
    fallbackQueryHosts: config.status.fallbackQueryHosts,
    processNames: config.status.processNames,
  });

  const visiblePlayerCount = runtime.state === 'offline' || runtime.state === 'data_missing'
    ? null
    : runtime.playerCount ?? population.onlineCount;
  const effectiveOnlineCount = visiblePlayerCount ?? 0;
  const state = inferPublicState(runtime, effectiveOnlineCount, runtime.lastSignalAt ?? population.latestEventAt);
  const maxPlayers = runtime.maxPlayers ?? serverConfig.MaxPlayers ?? config.server.maxPlayersFallback;
  const capacityPercent = visiblePlayerCount === null ? 0 : Math.min(100, Math.round((visiblePlayerCount / maxPlayers) * 100));
  const primaryActionHref = state.primaryAction === 'Check Discord' ? config.server.discordUrl : config.server.joinUrl;
  const onlinePlayers = runtime.state === 'offline' ? [] : population.onlinePlayers.slice(0, 12);
  const recentEvents = population.recentEvents.slice(0, 7);
  const signalLabel = runtime.lastSignalAt ? relativeFromDate(runtime.lastSignalAt) : 'Not reported';
  const playerValue = visiblePlayerCount === null ? 'Offline' : `${visiblePlayerCount}/${maxPlayers}`;
  const query = runtime.diagnostics?.query;
  const mapName = query?.mapName ?? serverConfig.StartingMap ?? 'Unknown';
  const diskSample = [...metricSamples].reverse().find((sample) => typeof sample.diskPercent === 'number');
  const latestStoredSample = metricSamples.at(-1);
  const avgCpu = metricSamples.length
    ? Math.round(metricSamples.reduce((sum, sample) => sum + (sample.cpuPercent ?? 0), 0) / metricSamples.length)
    : null;
  const avgRam = metricSamples.length
    ? Math.round(metricSamples.reduce((sum, sample) => sum + sample.ramPercent, 0) / metricSamples.length)
    : null;

  return (
    <main className="page-shell status-command-page">
      <section className={`status-command-hero tone-${state.tone}`}>
        <div className="status-command-hero-copy">
          <span className="status-command-chip"><i aria-hidden="true" /> Live server information</span>
          <h1>{state.headline}</h1>
          <p>{state.body}</p>
          <div className="status-command-actions">
            <a className="button button-primary" href={primaryActionHref} target={state.primaryAction === 'Check Discord' ? '_blank' : undefined} rel={state.primaryAction === 'Check Discord' ? 'noreferrer' : undefined}>
              <i className={state.primaryAction === 'Check Discord' ? 'fa-brands fa-discord' : 'fa-solid fa-gamepad'} aria-hidden="true" /> {state.primaryAction}
            </a>
            <a className="button button-soft" href={config.server.discordUrl} target="_blank" rel="noreferrer"><i className="fa-brands fa-discord" aria-hidden="true" /> Discord</a>
            {tweeterVisible ? <Link className="button button-soft" href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> Tweeter</Link> : null}
          </div>
        </div>

        <aside className="status-command-live-card" aria-label="Current server state">
          <div className="status-command-live-head">
            <span>Current state</span>
            <strong>{state.label}</strong>
          </div>
          <div className="status-command-live-value">
            <strong>{visiblePlayerCount === null ? 'Offline' : visiblePlayerCount}</strong>
            {visiblePlayerCount !== null ? <span>/{maxPlayers}</span> : null}
          </div>
          <p>{visiblePlayerCount === null ? 'Server is not currently reachable.' : visiblePlayerCount === 1 ? '1 player connected.' : `${visiblePlayerCount} players connected.`}</p>
          <div className="status-command-meter large" aria-label={`${capacityPercent}% capacity`}><i style={{ width: `${capacityPercent}%` }} /></div>
          <dl>
            <div><dt>Signal</dt><dd>{signalLabel}</dd></div>
            <div><dt>Source</dt><dd>{runtime.source.replace(/_/g, ' ')}</dd></div>
            <div><dt>Endpoint</dt><dd>{query?.selectedHost ? `${query.selectedHost}:${query.port}` : `${config.status.serverHost}:${config.status.serverPort}`}</dd></div>
            <div><dt>Map</dt><dd>{mapName}</dd></div>
          </dl>
        </aside>
      </section>

      <StatusNoticeBoard updates={updates} supportHref={supportVisible ? '/support' : null} />

      <section className="status-command-overview-grid" aria-label="Server information and player snapshot">
        <article className="status-command-panel status-command-server-info">
          <div className="status-command-section-head">
            <div>
              <span className="kicker">Server information</span>
              <h2>At a glance</h2>
            </div>
            <small>Last checked {relativeFromDate(metrics.checkedAt)}</small>
          </div>
          <div className="status-command-info-grid">
            <MiniStat label="Join status" value={runtime.label} detail={runtime.message} />
            <MiniStat label="Current players" value={playerValue} detail="Reachable population reported by the best available source." />
            <MiniStat label="Known citizens" value={overview.players.toLocaleString()} detail="Saved citizens known to the portal." />
            <MiniStat label="Sessions recorded" value={population.totalSessions.toLocaleString()} detail={`Average session ${duration(population.avgSessionSeconds)}.`} />
          </div>
        </article>

        <article className="status-command-panel status-command-users">
          <div className="status-command-section-head compact">
            <div>
              <span className="kicker">Connected users</span>
              <h2>Currently in city</h2>
            </div>
            <strong>{visiblePlayerCount === null ? '—' : visiblePlayerCount}</strong>
          </div>
          {onlinePlayers.length ? (
            <div className="status-command-user-list">
              {onlinePlayers.map((player) => (
                <Link href={`/u/${player.steamId}`} key={player.steamId}>
                  <span>{player.name.slice(0, 1).toUpperCase()}</span>
                  <strong>{player.name}</strong>
                  <small>Online since {relativeFromDate(player.since)}</small>
                </Link>
              ))}
            </div>
          ) : (
            <p className="status-command-empty">{runtime.state === 'offline' ? 'The server is offline, so connected users are hidden until it answers again.' : 'Nobody is showing online right now.'}</p>
          )}
        </article>
      </section>

      <section className="status-command-panel status-command-trends" aria-label="Player population trend">
        <div className="status-command-section-head">
          <div>
            <span className="kicker">Player trends</span>
            <h2>Population movement</h2>
          </div>
          <small>{trends.windowLabel} · {trends.sampledFromEvents.toLocaleString()} movement records</small>
        </div>
        <div className="status-command-trend-layout">
          <TrendChart points={trends.points} label={`Player count trend for ${trends.windowLabel}`} />
          <aside className="status-command-peak-card">
            <span>All-time peak</span>
            <strong>{trends.peakCount}</strong>
            <p>{trends.peakAt ? `Reached ${relativeFromDate(trends.peakAt)}.` : 'No peak has been recorded yet.'}</p>
            <div className="status-command-peak-grid">
              <MiniStat label="Joins / 24h" value={trends.joins24h.toLocaleString()} detail="Connection events recorded." />
              <MiniStat label="Leaves / 24h" value={trends.leaves24h.toLocaleString()} detail="Disconnect events recorded." />
              <MiniStat label="Unique / 24h" value={trends.uniquePlayers24h.toLocaleString()} detail="Distinct Steam IDs seen." />
              <MiniStat label="First joins" value={trends.firstJoins24h.toLocaleString()} detail="New players in the window." />
            </div>
          </aside>
        </div>
      </section>

      <section className="status-command-panel status-command-metrics" aria-label="Server metrics">
        <div className="status-command-section-head">
          <div>
            <span className="kicker">Server metrics</span>
            <h2>Operational health</h2>
          </div>
          <small>{latestStoredSample ? `Stored sample ${relativeFromDate(latestStoredSample.capturedAt)}` : 'Live host sample'}</small>
        </div>
        <div className="status-command-metric-grid">
          <MetricCard icon="fa-solid fa-microchip" label="CPU load" value={metricText(metrics.cpuPercent)} detail={avgCpu === null ? 'Current host utilization sample.' : `Average stored sample: ${avgCpu}%.`} percent={metrics.cpuPercent} />
          <MetricCard icon="fa-solid fa-memory" label="RAM used" value={`${metrics.ram.percent}%`} detail={`${mbToGbLabel(metrics.ram.usedMb)} of ${mbToGbLabel(metrics.ram.totalMb)} in use.`} percent={metrics.ram.percent} />
          <MetricCard icon="fa-solid fa-hard-drive" label="Disk used" value={metricText(diskSample?.diskPercent ?? null)} detail={diskSample ? `${gbLabel(diskSample.diskUsedGb)} of ${gbLabel(diskSample.diskTotalGb)} used.` : 'Disk sampling will appear once metric capture runs.'} percent={diskSample?.diskPercent ?? null} />
          <MetricCard icon="fa-solid fa-globe" label="Website uptime" value={duration(metrics.webProcess.uptimeSeconds)} detail={`${mbToGbLabel(metrics.webProcess.rssMb)} web process memory.`} />
          <MetricCard icon="fa-solid fa-server" label="Host uptime" value={duration(metrics.hostUptimeSeconds)} detail="Operating system uptime on the portal host." />
          <MetricCard icon="fa-solid fa-chart-simple" label="Metric history" value={metricSamples.length.toLocaleString()} detail={avgRam === null ? 'No stored host metric samples yet.' : `Average stored RAM usage: ${avgRam}%.`} />
        </div>
      </section>

      <section className="status-command-lower-grid">
        <article className="status-command-panel">
          <div className="status-command-section-head compact">
            <div>
              <span className="kicker">Activity</span>
              <h2>Recent joins and leaves</h2>
            </div>
          </div>
          <div className="status-command-event-list">
            {recentEvents.length ? recentEvents.map((event, index) => (
              <div key={`${event.SteamId}-${event.Timestamp}-${index}`}>
                <span className={event.IsConnection ? 'join' : 'leave'}>{eventLabel(event.IsConnection)}</span>
                <strong>{event.PlayerName}</strong>
                <small>{relativeFromDate(event.Timestamp)}</small>
              </div>
            )) : <p className="status-command-empty">No public join or leave records yet.</p>}
          </div>
        </article>

        <article className="status-command-panel status-command-diagnostics">
          <div className="status-command-section-head compact">
            <div>
              <span className="kicker">Diagnostics</span>
              <h2>How this status was decided</h2>
            </div>
          </div>
          <dl>
            <div><dt>Decision source</dt><dd>{runtime.source.replace(/_/g, ' ')}</dd></div>
            <div><dt>Signal age</dt><dd>{runtime.signalAgeSeconds === null ? 'Unavailable' : duration(runtime.signalAgeSeconds)}</dd></div>
            <div><dt>Stale threshold</dt><dd>{duration(runtime.staleAfterSeconds)}</dd></div>
            <div><dt>Query answered</dt><dd>{query ? (query.answered ? 'Yes' : 'No') : 'Not used'}</dd></div>
            <div><dt>Timeout</dt><dd>{query ? `${query.timeoutMs}ms` : `${config.status.queryTimeoutMs}ms`}</dd></div>
          </dl>
        </article>
      </section>
    </main>
  );
}
