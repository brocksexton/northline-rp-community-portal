import Link from 'next/link';
import { getCityOverview, getDataHealth, getPopulationSummary, getServerConfig } from '@/lib/ape-data';
import { captureMetricSample, getMetricSamples, getStatusUpdates } from '@/lib/community-data';
import { duration, fullDate, relativeFromDate } from '@/lib/format';
import { getSiteConfig } from '@/lib/site-config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Server Status' };

type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

function inferState(healthExists: boolean, onlineCount: number, latestEventAt: string | null) {
  if (!healthExists) return { label: 'Data link offline', tone: 'danger' as StatusTone, body: 'The web process cannot read APE_RP_DATA_PATH.', headline: 'Needs attention' };
  if (onlineCount > 0) return { label: 'Operational', tone: 'success' as StatusTone, body: 'Players are connected and Northbound RP data is flowing.', headline: 'City live' };
  if (latestEventAt) return { label: 'Quiet', tone: 'warning' as StatusTone, body: `Last server activity was ${relativeFromDate(latestEventAt)}.`, headline: 'Monitoring' };
  return { label: 'Collecting signal', tone: 'neutral' as StatusTone, body: 'Server files are connected; waiting for enough fresh activity to infer state.', headline: 'Standing by' };
}

function metricTone(value: number | null | undefined, warning: number, danger: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'neutral';
  if (value >= danger) return 'danger';
  if (value >= warning) return 'warning';
  return 'success';
}

function metricValue(value: number | null | undefined, suffix = '%') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Learning';
  return `${Math.round(value)}${suffix}`;
}

function noticeTone(tone: string) {
  if (tone === 'maintenance') return 'maintenance';
  if (tone === 'warning') return 'warning';
  if (tone === 'event') return 'event';
  return 'info';
}

export default async function StatusPage() {
  const [config, health, serverConfig, population, sample, samples, updates, overview] = await Promise.all([
    getSiteConfig(),
    getDataHealth(),
    getServerConfig(),
    getPopulationSummary(),
    captureMetricSample(),
    getMetricSamples(144),
    getStatusUpdates(10),
    getCityOverview(),
  ]);

  const state = inferState(health.exists, population.onlineCount, population.latestEventAt);
  const maxPlayers = serverConfig.MaxPlayers ?? config.server.maxPlayersFallback;
  const latestRam = samples.slice(-42);
  const metricCards = [
    {
      label: 'CPU load',
      value: metricValue(sample.cpuPercent),
      detail: sample.cpuPercent == null ? 'Establishing baseline' : 'Website host signal',
      tone: metricTone(sample.cpuPercent, 75, 90),
      fill: typeof sample.cpuPercent === 'number' ? sample.cpuPercent : 0,
      icon: 'fa-solid fa-microchip',
    },
    {
      label: 'Memory pressure',
      value: `${sample.ramPercent}%`,
      detail: `${sample.ramUsedMb.toLocaleString()} / ${sample.ramTotalMb.toLocaleString()} MB used`,
      tone: metricTone(sample.ramPercent, 80, 92),
      fill: sample.ramPercent,
      icon: 'fa-solid fa-memory',
    },
    {
      label: 'Disk utilization',
      value: metricValue(sample.diskPercent),
      detail: sample.diskPercent == null ? 'Disk telemetry unavailable' : 'Volume headroom check',
      tone: metricTone(sample.diskPercent, 82, 94),
      fill: typeof sample.diskPercent === 'number' ? sample.diskPercent : 0,
      icon: 'fa-solid fa-hard-drive',
    },
  ];

  return (
    <main className="page-shell status-page status-ops-page">
      <section className={`ops-hero tone-${state.tone}`}>
        <div className="ops-hero-copy">
          <span className="ops-kicker"><i /> Northline operations</span>
          <h1>{state.headline}</h1>
          <p>{state.body} This page merges live server-file reads, host telemetry, and staff notices into one public operations view.</p>
          <div className="ops-hero-meta">
            <span>{serverConfig.ServerName ?? 'Northline RP'}</span>
            <span>{serverConfig.ServerSubtitle ?? config.server.locationLabel}</span>
            <span>{health.exists ? 'Data connected' : 'Data missing'}</span>
          </div>
          <div className="button-row ops-hero-actions">
            <a className="button button-primary" href={config.server.joinUrl}>Open s&box page</a>
            <a className="button button-soft" href={config.server.discordUrl}>Join Discord</a>
          </div>
        </div>
        <aside className="ops-server-card">
          <span>Current population</span>
          <strong>{population.onlineCount}/{maxPlayers}</strong>
          <p>{state.label}</p>
        </aside>
      </section>

      <section className="ops-overview-grid" aria-label="Server overview metrics">
        <article className="ops-overview-card"><span>Known citizens</span><strong>{overview.players.toLocaleString()}</strong><p>Players with saved Northbound RP data.</p></article>
        <article className="ops-overview-card"><span>Total sessions</span><strong>{population.totalSessions.toLocaleString()}</strong><p>Connection records mirrored from the server.</p></article>
        <article className="ops-overview-card"><span>Average session</span><strong>{duration(population.avgSessionSeconds)}</strong><p>Typical visit length from recent connection logs.</p></article>
      </section>

      <section className="ops-notice-section">
        <div className="section-heading inline"><div><span className="kicker">Staff notices</span><h2>Community-facing updates</h2></div><Link href="/staff">Staff tools</Link></div>
        <div className="ops-banner-stack">
          {updates.length ? updates.map((update) => (
            <article className={`status-update-banner tone-${noticeTone(update.tone)}`} key={update.id}>
              <span>{update.tone}</span>
              <div>
                <h2>{update.title}</h2>
                <p>{update.body}</p>
                <small>{relativeFromDate(update.createdAt)} · {update.createdByName}</small>
              </div>
            </article>
          )) : (
            <article className="status-update-banner tone-info">
              <span>Clear</span>
              <div>
                <h2>No active notices</h2>
                <p>Staff maintenance, events, and operations notes will appear here when posted.</p>
                <small>Public status is currently based on data and host telemetry.</small>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="ops-metric-strip" aria-label="Host telemetry">
        {metricCards.map((metric) => (
          <article className={`ops-metric-tile tone-${metric.tone}`} key={metric.label}>
            <div className="ops-metric-title"><i className={metric.icon} aria-hidden="true" /><span>{metric.label}</span></div>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
            <div className={`mini-meter ${metric.tone}`}><span style={{ width: `${Math.max(4, Math.min(100, metric.fill))}%` }} /></div>
          </article>
        ))}
      </section>

      <section className="ops-chart-panel">
        <div className="ops-chart-header">
          <div>
            <span className="kicker">Telemetry</span>
            <h2>Web host memory trend</h2>
            <p>These metrics describe the Windows host running the website behind Caddy. They are useful for portal health and rough machine pressure, not direct s&box process counters.</p>
          </div>
          <div className="ops-chart-summary-mini">
            <span>Samples</span>
            <strong>{samples.length}</strong>
          </div>
        </div>
        <div className="ops-bar-chart" aria-label="Recent RAM usage samples">
          {latestRam.length ? latestRam.map((item) => <i key={item.capturedAt} style={{ height: `${Math.max(7, item.ramPercent)}%` }} title={`${fullDate(item.capturedAt)} · ${item.ramPercent}% RAM`} />) : <span>No samples yet</span>}
        </div>
      </section>

      <section className="ops-detail-grid">
        <article className="ops-detail-card"><span>Data path</span><strong>{health.exists ? 'Connected' : 'Missing'}</strong><p><code>{health.dataPath ?? 'APE_RP_DATA_PATH unset'}</code></p>{health.warnings.length ? <div className="notice danger">{health.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}</article>
        <article className="ops-detail-card"><span>Web uptime</span><strong>{duration(sample.webUptimeSeconds)}</strong><p>Next.js process uptime on the Windows host.</p></article>
        <article className="ops-detail-card"><span>Host uptime</span><strong>{duration(sample.hostUptimeSeconds)}</strong><p>Machine uptime reported by the telemetry collector.</p></article>
      </section>

      <section className="layout-two ops-lower-grid">
        <article className="card ops-list-card">
          <div className="section-heading inline"><div><span className="kicker">Population</span><h2>Recent connections</h2></div><span>{population.onlineCount} online</span></div>
          <div className="stack-list">
            {population.recentEvents.length ? population.recentEvents.map((event) => <div key={`${event.Timestamp}-${event.SteamId}`}><strong>{event.PlayerName}</strong><span>{event.IsConnection ? 'Connected' : `Disconnected after ${duration(event.SessionDurationSeconds)}`}</span><small>{fullDate(event.Timestamp)}</small></div>) : <div><strong>No connection logs</strong><span>Connection history will appear once the server writes logs.</span></div>}
          </div>
        </article>

        <article className="card ops-list-card">
          <div className="section-heading"><span className="kicker">Server identity</span><h2>{serverConfig.ServerName ?? 'Northline RP'}</h2><p>{serverConfig.ServerSubtitle ?? config.server.locationLabel}</p></div>
          <dl className="metric-grid compact">
            <div><dt>Checked</dt><dd>{fullDate(health.checkedAt)}</dd></div>
            <div><dt>Mode</dt><dd>{config.server.modeLabel}</dd></div>
            <div><dt>Web RAM</dt><dd>{sample.processRamMb} MB</dd></div>
            <div><dt>Latest event</dt><dd>{population.latestEventAt ? relativeFromDate(population.latestEventAt) : 'None'}</dd></div>
          </dl>
        </article>
      </section>
    </main>
  );
}
