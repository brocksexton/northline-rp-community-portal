import Link from 'next/link';
import { getCityOverview, getDataHealth, getPopulationSummary, getServerConfig, getServerRuntimeStatus, type ServerRuntimeStatus } from '@/lib/ape-data';
import { getStatusUpdates } from '@/lib/community-data';
import { duration, relativeFromDate } from '@/lib/format';
import { getSiteConfig } from '@/lib/site-config';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { getOperationalMetrics } from '@/lib/host-metrics';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Server Status & Metrics',
    description: 'Northline RP server reachability, current population, and lightweight host metrics.',
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
      body: runtime.source === 'server_query'
        ? 'The game server did not answer the configured query. It may be stopped, restarting, firewalled, or temporarily unreachable.'
        : runtime.lastSignalAt
          ? `No fresh server signal has been seen recently. Last visible activity was ${relativeFromDate(runtime.lastSignalAt)}.`
          : 'The portal cannot see a fresh server signal right now. Check Discord for restart or maintenance updates.',
      primaryAction: 'Check Discord',
    };
  }

  if (runtime.state === 'online' && onlineCount > 0) {
    return {
      label: 'Online',
      tone: 'success',
      headline: 'Server online.',
      body: 'The game server is reachable and players are connected right now.',
      primaryAction: 'Join through s&box',
    };
  }

  if (runtime.state === 'quiet' || runtime.state === 'online') {
    return {
      label: runtime.state === 'quiet' ? 'Online, quiet' : 'Online',
      tone: 'neutral',
      headline: 'Online, but quiet.',
      body: runtime.source === 'server_query'
        ? 'The server answered directly, but nobody is connected right now.'
        : latestEventAt
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

function noticeTone(tone: string) {
  if (tone === 'maintenance') return 'maintenance';
  if (tone === 'warning') return 'warning';
  if (tone === 'event') return 'event';
  return 'info';
}

function eventLabel(isConnection: boolean) {
  return isConnection ? 'joined' : 'left';
}

function sourceLabel(source: ServerRuntimeStatus['source']) {
  switch (source) {
    case 'server_status.json': return 'Heartbeat file';
    case 'server_query': return 'Direct server query';
    case 'connection_logs': return 'Connection logs';
    case 'data_path': return 'Data path';
    default: return 'Portal check';
  }
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

function MetricCard({ icon, label, value, detail, percent }: { icon: string; label: string; value: string; detail: string; percent?: number | null }) {
  const width = typeof percent === 'number' ? clampPercent(percent) : null;
  return (
    <article className="status-ops-metric-card">
      <div className="status-ops-metric-top">
        <i className={icon} aria-hidden="true" />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
      {width !== null ? <div className="status-ops-meter" aria-hidden="true"><i style={{ width: `${width}%` }} /></div> : null}
    </article>
  );
}

function QuickCard({ icon, label, value, detail }: { icon: string; label: string; value: string; detail: string }) {
  return (
    <article className="status-ops-quick-card">
      <i className={icon} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export default async function StatusPage() {
  const [config, health, serverConfig, population, updates, overview, metrics] = await Promise.all([
    getSiteConfig(),
    getDataHealth(),
    getServerConfig(),
    getPopulationSummary(),
    getStatusUpdates(4),
    getCityOverview(),
    getOperationalMetrics(),
  ]);

  const runtime = await getServerRuntimeStatus({
    health,
    population,
    staleAfterMinutes: config.status.offlineAfterMinutes,
    serverHost: config.status.serverHost,
    serverPort: config.status.serverPort,
    queryTimeoutMs: config.status.queryTimeoutMs,
  });

  const visiblePlayerCount = runtime.state === 'offline' || runtime.state === 'data_missing'
    ? null
    : runtime.playerCount ?? population.onlineCount;
  const effectiveOnlineCount = visiblePlayerCount ?? 0;
  const state = inferPublicState(runtime, effectiveOnlineCount, runtime.lastSignalAt ?? population.latestEventAt);
  const maxPlayers = runtime.maxPlayers ?? serverConfig.MaxPlayers ?? config.server.maxPlayersFallback;
  const capacityPercent = visiblePlayerCount === null ? 0 : Math.min(100, Math.round((visiblePlayerCount / maxPlayers) * 100));
  const primaryActionHref = state.primaryAction === 'Check Discord' ? config.server.discordUrl : config.server.joinUrl;
  const onlinePlayers = runtime.state === 'offline' ? [] : population.onlinePlayers.slice(0, 6);
  const notices = updates.slice(0, 2);
  const recentEvents = population.recentEvents.slice(0, 4);
  const signalLabel = runtime.lastSignalAt ? relativeFromDate(runtime.lastSignalAt) : 'Not reported';
  const playerValue = visiblePlayerCount === null ? 'Offline' : `${visiblePlayerCount}/${maxPlayers}`;

  return (
    <main className="page-shell status-ops-page">
      <section className={`status-ops-hero tone-${state.tone}`}>
        <div className="status-ops-copy">
          <span className="status-ops-chip"><i aria-hidden="true" /> Server status</span>
          <h1>{state.headline}</h1>
          <p>{state.body}</p>
          <div className="status-ops-actions">
            <a className="button button-primary" href={primaryActionHref} target={state.primaryAction === 'Check Discord' ? '_blank' : undefined} rel={state.primaryAction === 'Check Discord' ? 'noreferrer' : undefined}>
              <i className={state.primaryAction === 'Check Discord' ? 'fa-brands fa-discord' : 'fa-solid fa-gamepad'} aria-hidden="true" /> {state.primaryAction}
            </a>
            <a className="button button-soft" href={config.server.discordUrl} target="_blank" rel="noreferrer"><i className="fa-brands fa-discord" aria-hidden="true" /> Discord</a>
            <Link className="button button-soft" href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> Tweeter</Link>
          </div>
        </div>

        <aside className="status-ops-current" aria-label="Current server state">
          <div className="status-ops-current-head">
            <span>Current state</span>
            <strong>{state.label}</strong>
          </div>
          <div className="status-ops-current-value">
            <strong>{visiblePlayerCount === null ? 'Offline' : visiblePlayerCount}</strong>
            {visiblePlayerCount !== null ? <span>/{maxPlayers}</span> : null}
          </div>
          <p>{visiblePlayerCount === null ? 'Server is not currently reachable.' : visiblePlayerCount === 1 ? '1 player connected.' : `${visiblePlayerCount} players connected.`}</p>
          <div className="status-ops-meter" aria-hidden="true"><i style={{ width: `${capacityPercent}%` }} /></div>
          <dl className="status-ops-current-meta">
            <div><dt>Source</dt><dd>{sourceLabel(runtime.source)}</dd></div>
            <div><dt>Signal</dt><dd>{signalLabel}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="status-ops-metrics" aria-label="Useful server metrics">
        <div className="status-ops-section-head">
          <div>
            <span className="kicker">Server metrics</span>
            <h2>Quick operational snapshot</h2>
          </div>
          <small>Last checked {relativeFromDate(metrics.checkedAt)}</small>
        </div>
        <div className="status-ops-metric-grid">
          <MetricCard
            icon="fa-solid fa-microchip"
            label="CPU load"
            value={metricText(metrics.cpuPercent)}
            detail="Current host utilization sample."
            percent={metrics.cpuPercent}
          />
          <MetricCard
            icon="fa-solid fa-memory"
            label="RAM used"
            value={`${metrics.ram.percent}%`}
            detail={`${mbToGbLabel(metrics.ram.usedMb)} in use.`}
            percent={metrics.ram.percent}
          />
          <MetricCard
            icon="fa-solid fa-globe"
            label="Website uptime"
            value={duration(metrics.webProcess.uptimeSeconds)}
            detail={`${mbToGbLabel(metrics.webProcess.rssMb)} web process memory.`}
          />
          <MetricCard
            icon="fa-solid fa-wifi"
            label="Query source"
            value={sourceLabel(runtime.source)}
            detail={runtime.source === 'server_query' ? `UDP query to ${config.status.serverHost ?? 'configured host'}:${config.status.serverPort ?? 27015}.` : 'Using local server data first.'}
          />
        </div>
      </section>

      <section className="status-ops-quick-grid" aria-label="At a glance">
        <QuickCard icon="fa-solid fa-door-open" label="Join status" value={runtime.label} detail={runtime.message} />
        <QuickCard icon="fa-solid fa-users" label="Players" value={playerValue} detail={visiblePlayerCount === null ? 'When unreachable, the portal treats the server as offline.' : 'Current reachable population.'} />
        <QuickCard icon="fa-solid fa-clock-rotate-left" label="Last signal" value={signalLabel} detail={runtime.signalAgeSeconds === null ? 'No signal age available.' : `Stale after ${duration(runtime.staleAfterSeconds)}.`} />
        <QuickCard icon="fa-solid fa-address-book" label="Known citizens" value={overview.players.toLocaleString()} detail="Saved citizens known to the portal." />
      </section>

      <section className="status-ops-workspace">
        <article className="status-ops-panel status-ops-notices">
          <div className="status-ops-section-head compact">
            <div>
              <span className="kicker">City board</span>
              <h2>Important notices</h2>
            </div>
            <Link href="/support">Need help?</Link>
          </div>
          <div className="status-ops-list">
            {notices.length ? notices.map((update) => (
              <article className={`status-ops-notice tone-${noticeTone(update.tone)}`} key={update.id}>
                <span>{update.tone}</span>
                <div>
                  <strong>{update.title}</strong>
                  <p>{update.body}</p>
                  <small>{relativeFromDate(update.createdAt)} · {update.createdByName}</small>
                </div>
              </article>
            )) : (
              <article className="status-ops-notice tone-info">
                <span>Clear</span>
                <div>
                  <strong>No active notices</strong>
                  <p>No maintenance or city-wide alerts are posted right now.</p>
                  <small>Discord remains the fastest place for live admin updates.</small>
                </div>
              </article>
            )}
          </div>
        </article>

        <aside className="status-ops-panel status-ops-side">
          <div className="status-ops-section-head compact">
            <div>
              <span className="kicker">Activity</span>
              <h2>Recent movement</h2>
            </div>
          </div>

          {onlinePlayers.length ? (
            <div className="status-ops-online-list">
              {onlinePlayers.map((player) => (
                <div key={player.steamId}>
                  <i className="fa-solid fa-circle" aria-hidden="true" />
                  <span><strong>{player.name}</strong><small>Online since {relativeFromDate(player.since)}</small></span>
                </div>
              ))}
            </div>
          ) : (
            <p className="status-ops-empty">{runtime.state === 'offline' ? 'The server is offline, so online players are hidden until it answers again.' : 'Nobody is showing online right now.'}</p>
          )}

          <div className="status-ops-recent-list">
            {recentEvents.length ? recentEvents.map((event, index) => (
              <div key={`${event.SteamId}-${event.Timestamp}-${index}`}>
                <span className={event.IsConnection ? 'join' : 'leave'}>{eventLabel(event.IsConnection)}</span>
                <strong>{event.PlayerName}</strong>
                <small>{relativeFromDate(event.Timestamp)}</small>
              </div>
            )) : <p className="status-ops-empty">No public join or leave records yet.</p>}
          </div>
        </aside>
      </section>
    </main>
  );
}
