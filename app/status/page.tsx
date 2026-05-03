import Link from 'next/link';
import { getCityOverview, getDataHealth, getPopulationSummary, getServerConfig } from '@/lib/ape-data';
import { captureMetricSample, getMetricSamples, getStatusUpdates } from '@/lib/community-data';
import { duration, fullDate, relativeFromDate } from '@/lib/format';
import { getSiteConfig } from '@/lib/site-config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Server Status' };

function inferState(healthExists: boolean, onlineCount: number, latestEventAt: string | null) {
  if (!healthExists) return { label: 'Data missing', tone: 'danger', body: 'The web process cannot read APE_RP_DATA_PATH.' };
  if (onlineCount > 0) return { label: 'Online', tone: 'success', body: 'Players are connected right now.' };
  if (latestEventAt) return { label: 'Quiet', tone: 'warning', body: `Last activity was ${relativeFromDate(latestEventAt)}.` };
  return { label: 'Unknown', tone: 'neutral', body: 'Waiting for enough server activity to infer a state.' };
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

  return (
    <main className="page-shell status-page">
      <section className="hero split-hero">
        <div>
          <span className="eyebrow">Operations</span>
          <h1>Server status</h1>
          <p>Public operational view for Northline RP. Host metrics are sampled by the web process running behind Caddy.</p>
          <div className="button-row"><a className="button button-primary" href={config.server.joinUrl}>Open s&box page</a><a className="button button-soft" href={config.server.discordUrl}>Discord</a></div>
        </div>
        <aside className="card compact-card">
          <span className={`pill ${state.tone}`}>{state.label}</span>
          <strong>{population.onlineCount}/{maxPlayers}</strong>
          <small>{state.body}</small>
        </aside>
      </section>

      <section className="stat-band four">
        <div><span>Known citizens</span><strong>{overview.players}</strong></div>
        <div><span>Total sessions</span><strong>{population.totalSessions}</strong></div>
        <div><span>Avg. session</span><strong>{duration(population.avgSessionSeconds)}</strong></div>
        <div><span>Latest event</span><strong>{population.latestEventAt ? relativeFromDate(population.latestEventAt) : 'None'}</strong></div>
      </section>

      <section className="layout-two">
        <article className="card">
          <div className="section-heading"><span className="kicker">Data path</span><h2>{health.exists ? 'Connected' : 'Not connected'}</h2><p><code>{health.dataPath ?? 'APE_RP_DATA_PATH unset'}</code></p></div>
          {health.warnings.length ? <div className="notice danger">{health.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : <p className="notice success">The website can read Northbound RP server data.</p>}
          <dl className="metric-grid compact">
            <div><dt>Checked</dt><dd>{fullDate(health.checkedAt)}</dd></div>
            <div><dt>Mode</dt><dd>{config.server.modeLabel}</dd></div>
            <div><dt>Server</dt><dd>{serverConfig.ServerName ?? 'Northline RP'}</dd></div>
            <div><dt>Subtitle</dt><dd>{serverConfig.ServerSubtitle ?? config.server.locationLabel}</dd></div>
          </dl>
        </article>

        <article className="card">
          <div className="section-heading"><span className="kicker">Host metrics</span><h2>Windows web process</h2><p>These are website host metrics, not native s&box process counters.</p></div>
          <dl className="metric-grid compact">
            <div><dt>CPU</dt><dd>{sample.cpuPercent == null ? 'Learning' : `${sample.cpuPercent}%`}</dd></div>
            <div><dt>RAM</dt><dd>{sample.ramPercent}%</dd></div>
            <div><dt>Disk</dt><dd>{sample.diskPercent == null ? 'N/A' : `${sample.diskPercent}%`}</dd></div>
            <div><dt>Web RAM</dt><dd>{sample.processRamMb} MB</dd></div>
            <div><dt>Web uptime</dt><dd>{duration(sample.webUptimeSeconds)}</dd></div>
            <div><dt>Host uptime</dt><dd>{duration(sample.hostUptimeSeconds)}</dd></div>
          </dl>
          <div className="sparkline" aria-label="Recent RAM samples">{samples.slice(-36).map((item) => <i key={item.capturedAt} style={{ height: `${Math.max(8, item.ramPercent)}%` }} />)}</div>
        </article>
      </section>

      <section className="layout-two">
        <article className="card">
          <div className="section-heading inline"><div><span className="kicker">Population</span><h2>Recent connections</h2></div><span>{population.onlineCount} online</span></div>
          <div className="stack-list">
            {population.recentEvents.length ? population.recentEvents.map((event) => <div key={`${event.Timestamp}-${event.SteamId}`}><strong>{event.PlayerName}</strong><span>{event.IsConnection ? 'Connected' : `Disconnected after ${duration(event.SessionDurationSeconds)}`}</span><small>{fullDate(event.Timestamp)}</small></div>) : <div><strong>No connection logs</strong><span>Connection history will appear once the server writes logs.</span></div>}
          </div>
        </article>

        <article className="card">
          <div className="section-heading inline"><div><span className="kicker">Staff notices</span><h2>Announcements</h2></div><Link href="/staff">Staff tools</Link></div>
          <div className="stack-list">
            {updates.length ? updates.map((update) => <div key={update.id}><strong>{update.title}</strong><span>{update.body}</span><small>{update.tone} · {relativeFromDate(update.createdAt)} · {update.createdByName}</small></div>) : <div><strong>No active notices</strong><span>Staff can post operational notices after signing in with the right role.</span></div>}
          </div>
        </article>
      </section>
    </main>
  );
}
