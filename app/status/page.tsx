import Link from 'next/link';
import { getCityOverview, getDataHealth, getPopulationSummary, getServerConfig, getServerRuntimeStatus, type ServerRuntimeStatus } from '@/lib/ape-data';
import { getStatusUpdates } from '@/lib/community-data';
import { duration, relativeFromDate } from '@/lib/format';
import { getSiteConfig } from '@/lib/site-config';
import { buildPageMetadata } from '@/lib/embed-metadata';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Server Status',
    description: 'Live Northline RP server status, city activity, recent events, and operational notices.',
    path: '/status',
  });
}

type StatusTone = 'success' | 'warning' | 'neutral' | 'danger';

function inferPublicState(runtime: ServerRuntimeStatus, onlineCount: number, latestEventAt: string | null) {
  if (runtime.state === 'data_missing') {
    return {
      label: 'Checking',
      tone: 'warning' as StatusTone,
      headline: 'One sec, checking the city.',
      body: 'The website is waiting on fresh server info. The game may still be fine, but Discord is the best place to ask if joining feels weird.',
      action: 'Check Discord',
    };
  }
  if (runtime.state === 'offline') {
    return {
      label: 'Offline',
      tone: 'danger' as StatusTone,
      headline: 'Northline looks offline.',
      body: runtime.source === 'server_query'
        ? 'The game server did not answer the configured server query. It may be stopped, restarting, or unreachable.'
        : runtime.lastSignalAt
          ? `No fresh server signal has been seen recently. Last visible activity was ${relativeFromDate(runtime.lastSignalAt)}.`
          : 'The portal cannot see a fresh server signal right now. Check Discord for restart or maintenance updates.',
      action: 'Check Discord',
    };
  }
  if (runtime.state === 'online' && onlineCount > 0) {
    return {
      label: 'Live',
      tone: 'success' as StatusTone,
      headline: 'Northline is open.',
      body: 'People are in the city right now. Hop in, check Tweeter, or see what everyone has been up to.',
      action: 'Join through s&box',
    };
  }
  if (runtime.state === 'quiet' || runtime.state === 'online') {
    return {
      label: runtime.state === 'quiet' ? 'Quiet' : 'Online',
      tone: 'neutral' as StatusTone,
      headline: 'Northline is online but quiet.',
      body: runtime.source === 'server_query'
        ? 'The game server answered directly, but nobody is connected right now.'
        : latestEventAt
          ? `Nobody is showing online at the moment. The latest visible activity was ${relativeFromDate(latestEventAt)}.`
          : 'The game server is online, but nobody is showing online right now.',
      action: 'Join through s&box',
    };
  }
  return {
    label: 'Unknown',
    tone: 'warning' as StatusTone,
    headline: 'Server status is unclear.',
    body: 'The portal can read some data, but it cannot confidently tell whether the game server is online. Discord is the safest place to check.',
    action: 'Check Discord',
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

export default async function StatusPage() {
  const [config, health, serverConfig, population, updates, overview] = await Promise.all([
    getSiteConfig(),
    getDataHealth(),
    getServerConfig(),
    getPopulationSummary(),
    getStatusUpdates(6),
    getCityOverview(),
  ]);

  const runtime = await getServerRuntimeStatus({ health, population, staleAfterMinutes: config.status.offlineAfterMinutes, serverHost: config.status.serverHost, serverPort: config.status.serverPort, queryTimeoutMs: config.status.queryTimeoutMs });
  const state = inferPublicState(runtime, runtime.playerCount ?? population.onlineCount, runtime.lastSignalAt ?? population.latestEventAt);
  const maxPlayers = runtime.maxPlayers ?? serverConfig.MaxPlayers ?? config.server.maxPlayersFallback;
  const notices = updates.slice(0, 3);
  const recentEvents = population.recentEvents.slice(0, 5);
  const onlinePlayers = population.onlinePlayers.slice(0, 8);
  const shownOnlineCount = runtime.state === 'offline' ? null : (runtime.playerCount ?? population.onlineCount);
  const capacityPercent = maxPlayers && typeof shownOnlineCount === 'number' ? Math.min(100, Math.round((shownOnlineCount / maxPlayers) * 100)) : 0;
  const primaryActionHref = state.action === 'Check Discord' ? config.server.discordUrl : config.server.joinUrl;

  return (
    <main className="page-shell status-page-v2">
      <section className={`status-hero-v2 tone-${state.tone}`}>
        <div className="status-hero-main-v2">
          <span className="status-live-chip-v2"><i /> Server status</span>
          <h1>{state.headline}</h1>
          <p>{state.body}</p>
          <div className="status-hero-actions-v2">
            <a className="button button-primary" href={primaryActionHref} target={state.action === 'Check Discord' ? '_blank' : undefined} rel={state.action === 'Check Discord' ? 'noreferrer' : undefined}><i className={state.action === 'Check Discord' ? 'fa-brands fa-discord' : 'fa-solid fa-gamepad'} aria-hidden="true" /> {state.action}</a>
            <a className="button button-soft" href={config.server.discordUrl} target="_blank" rel="noreferrer"><i className="fa-brands fa-discord" aria-hidden="true" /> Discord</a>
            <Link className="button button-soft" href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> Tweeter</Link>
          </div>
        </div>
        <aside className="status-now-card-v2" aria-label="Current player count">
          <span className="status-pill-v2">{state.label}</span>
          <strong>{shownOnlineCount === null ? 'Offline' : <>{shownOnlineCount}<small>/{maxPlayers}</small></>}</strong>
          <p>{shownOnlineCount === null ? 'Server not currently reachable' : shownOnlineCount === 1 ? 'person online' : 'people online'}</p>
          <div className="status-capacity-track" aria-hidden="true"><i style={{ width: `${capacityPercent}%` }} /></div>
        </aside>
      </section>

      <section className="status-snapshot-grid-v2" aria-label="At a glance">
        <article className="status-snapshot-card-v2 accent">
          <i className="fa-solid fa-door-open" aria-hidden="true" />
          <span>Join status</span>
          <strong>{runtime.label}</strong>
          <p>{runtime.message}</p>
        </article>
        <article className="status-snapshot-card-v2">
          <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
          <span>Last signal</span>
          <strong>{runtime.lastSignalAt ? relativeFromDate(runtime.lastSignalAt) : 'Nothing yet'}</strong>
          <p>{runtime.source === 'server_status.json' ? 'Last server heartbeat seen by the portal.' : runtime.source === 'server_query' ? 'Last direct server query run by the portal.' : 'Last public connection signal seen by the portal.'}</p>
        </article>
        <article className="status-snapshot-card-v2">
          <i className="fa-solid fa-users" aria-hidden="true" />
          <span>Known citizens</span>
          <strong>{overview.players.toLocaleString()}</strong>
          <p>Saved citizens the community site knows about.</p>
        </article>
        <article className="status-snapshot-card-v2">
          <i className="fa-solid fa-hourglass-half" aria-hidden="true" />
          <span>Average visit</span>
          <strong>{duration(population.avgSessionSeconds)}</strong>
          <p>Based on visible connection records.</p>
        </article>
      </section>

      <section className="status-two-column-v2">
        <article className="status-board-v2">
          <div className="section-heading inline">
            <div>
              <span className="kicker">City board</span>
              <h2>What players should know</h2>
              <p>Short public notes for maintenance, events, and anything worth checking before you hop in.</p>
            </div>
            <Link href="/support">Need help?</Link>
          </div>
          <div className="status-board-list-v2">
            {notices.length ? notices.map((update) => (
              <article className={`status-board-card-v2 tone-${noticeTone(update.tone)}`} key={update.id}>
                <span>{update.tone}</span>
                <div>
                  <h3>{update.title}</h3>
                  <p>{update.body}</p>
                  <small>{relativeFromDate(update.createdAt)} · {update.createdByName}</small>
                </div>
              </article>
            )) : (
              <article className="status-board-card-v2 tone-info">
                <span>Clear</span>
                <div>
                  <h3>No active notices</h3>
                  <p>Nothing major is posted right now. That usually means it is safe to hop in and make some questionable decisions.</p>
                  <small>Check Discord for casual chat and quick announcements.</small>
                </div>
              </article>
            )}
          </div>
        </article>

        <aside className="status-side-stack-v2">
          <article className="status-mini-panel-v2">
            <div className="status-mini-panel-head">
              <span className="kicker">Around town</span>
              <strong>{runtime.state === 'offline' ? 'Server offline' : onlinePlayers.length ? 'Currently online' : 'Nobody showing online'}</strong>
            </div>
            {onlinePlayers.length ? (
              <div className="status-online-list-v2">
                {onlinePlayers.map((player) => (
                  <div key={player.steamId}>
                    <i className="fa-solid fa-circle" aria-hidden="true" />
                    <span><strong>{player.name}</strong><small>Since {relativeFromDate(player.since)}</small></span>
                  </div>
                ))}
              </div>
            ) : (
              <p>{runtime.state === 'offline' ? 'The server is not reporting as online right now. Check Discord for restart or maintenance updates.' : 'Looks empty from here. Great time to claim the title of “first person online.”'}</p>
            )}
          </article>

          <article className="status-mini-panel-v2">
            <div className="status-mini-panel-head">
              <span className="kicker">Recent movement</span>
              <strong>Last few joins and leaves</strong>
            </div>
            {recentEvents.length ? (
              <div className="status-recent-list-v2">
                {recentEvents.map((event, index) => (
                  <div key={`${event.SteamId}-${event.Timestamp}-${index}`}>
                    <span className={event.IsConnection ? 'join' : 'leave'}>{eventLabel(event.IsConnection)}</span>
                    <strong>{event.PlayerName}</strong>
                    <small>{relativeFromDate(event.Timestamp)}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p>No public movement yet.</p>
            )}
          </article>
        </aside>
      </section>

      <section className="status-bottom-strip-v2" aria-label="Community summary">
        <div><span>Public sessions</span><strong>{population.totalSessions.toLocaleString()}</strong></div>
        <div><span>Tweeter posts</span><strong>{overview.tweets.toLocaleString()}</strong></div>
        <div><span>Property layouts</span><strong>{overview.propertyLayouts.toLocaleString()}</strong></div>
        <div><span>Public ban records</span><strong>{overview.bans.total.toLocaleString()}</strong></div>
      </section>
    </main>
  );
}
