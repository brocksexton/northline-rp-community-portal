import Link from 'next/link';
import { getCityOverview, getDataHealth, getPopulationSummary, getServerConfig } from '@/lib/ape-data';
import { getStatusUpdates } from '@/lib/community-data';
import { duration, relativeFromDate } from '@/lib/format';
import { getSiteConfig } from '@/lib/site-config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Server Status' };

type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

function inferPublicState(healthExists: boolean, onlineCount: number, latestEventAt: string | null) {
  if (!healthExists) {
    return {
      label: 'Checking connection',
      tone: 'warning' as StatusTone,
      headline: 'Status is being verified',
      body: 'The website is waiting on fresh server information. Check Discord if you are having trouble joining.',
    };
  }
  if (onlineCount > 0) {
    return {
      label: 'Online',
      tone: 'success' as StatusTone,
      headline: 'Northline is live',
      body: 'Players are currently connected. The city is open and ready for roleplay.',
    };
  }
  if (latestEventAt) {
    return {
      label: 'Quiet',
      tone: 'neutral' as StatusTone,
      headline: 'The city is quiet',
      body: `No one is currently shown online. The latest activity was ${relativeFromDate(latestEventAt)}.`,
    };
  }
  return {
    label: 'Standing by',
    tone: 'neutral' as StatusTone,
    headline: 'Waiting for activity',
    body: 'The server data is available, but there is not enough recent player activity to summarize yet.',
  };
}

function noticeTone(tone: string) {
  if (tone === 'maintenance') return 'maintenance';
  if (tone === 'warning') return 'warning';
  if (tone === 'event') return 'event';
  return 'info';
}

export default async function StatusPage() {
  const [config, health, serverConfig, population, updates, overview] = await Promise.all([
    getSiteConfig(),
    getDataHealth(),
    getServerConfig(),
    getPopulationSummary(),
    getStatusUpdates(6),
    getCityOverview(),
  ]);

  const state = inferPublicState(health.exists, population.onlineCount, population.latestEventAt);
  const maxPlayers = serverConfig.MaxPlayers ?? config.server.maxPlayersFallback;
  const notices = updates.slice(0, 3);

  return (
    <main className="page-shell public-status-page">
      <section className={`status-control-hero tone-${state.tone}`}>
        <div className="status-control-copy">
          <span className="ops-kicker"><i /> Northline Control Center</span>
          <h1>{state.headline}</h1>
          <p>{state.body}</p>
          <div className="status-control-actions">
            <a className="button button-primary" href={config.server.joinUrl}>Join through s&amp;box</a>
            <a className="button button-soft" href={config.server.discordUrl}>Open Discord</a>
          </div>
        </div>
        <aside className="status-population-card">
          <span>Current population</span>
          <strong>{population.onlineCount}<small>/{maxPlayers}</small></strong>
          <p>{state.label}</p>
        </aside>
      </section>

      <section className="status-control-grid" aria-label="Server status summary">
        <article className="status-control-card primary">
          <span>Game server</span>
          <strong>{state.label}</strong>
          <p>{serverConfig.ServerName ?? 'Northline RP'} · {serverConfig.ServerSubtitle ?? config.server.locationLabel}</p>
        </article>
        <article className="status-control-card">
          <span>Community notices</span>
          <strong>{notices.length ? `${notices.length} active` : 'Clear'}</strong>
          <p>{notices.length ? 'Staff updates are posted below.' : 'No public maintenance or event notice is active.'}</p>
        </article>
        <article className="status-control-card">
          <span>Recent activity</span>
          <strong>{population.latestEventAt ? relativeFromDate(population.latestEventAt) : 'No recent logs'}</strong>
          <p>Latest public-facing connection signal.</p>
        </article>
      </section>

      <section className="status-notice-board">
        <div className="section-heading inline">
          <div>
            <span className="kicker">City board</span>
            <h2>Notices and updates</h2>
            <p>Maintenance, outage notes, and event announcements appear here when staff posts them.</p>
          </div>
          <Link href="/tweeter">Open Tweeter</Link>
        </div>
        <div className="status-board-list">
          {notices.length ? notices.map((update) => (
            <article className={`status-board-card tone-${noticeTone(update.tone)}`} key={update.id}>
              <span>{update.tone}</span>
              <div>
                <h3>{update.title}</h3>
                <p>{update.body}</p>
                <small>{relativeFromDate(update.createdAt)} · {update.createdByName}</small>
              </div>
            </article>
          )) : (
            <article className="status-board-card tone-info">
              <span>Clear</span>
              <div>
                <h3>No active notices</h3>
                <p>There are no public maintenance or outage notes at the moment.</p>
                <small>For conversation and quick community updates, check Tweeter or Discord.</small>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="status-plain-grid">
        <article className="status-plain-card">
          <span>Known citizens</span>
          <strong>{overview.players.toLocaleString()}</strong>
          <p>Characters with saved Northbound RP data.</p>
        </article>
        <article className="status-plain-card">
          <span>Total sessions</span>
          <strong>{population.totalSessions.toLocaleString()}</strong>
          <p>Connection records visible to the portal.</p>
        </article>
        <article className="status-plain-card">
          <span>Average visit</span>
          <strong>{duration(population.avgSessionSeconds)}</strong>
          <p>Typical session length from available connection logs.</p>
        </article>
      </section>
    </main>
  );
}
