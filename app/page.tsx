import Link from 'next/link';
import { getBanRecords, getCityOverview, getDataHealth, getPlayersBySteamId, getPopulationSummary, getServerConfig, getTweets } from '@/lib/ape-data';
import { getMetricSamples, getStatusUpdates } from '@/lib/community-data';
import { duration, fullDate, money, relativeFromDate } from '@/lib/format';
import { getSiteConfig } from '@/lib/site-config';
import { getSteamProfiles } from '@/lib/steam-openid';

export const dynamic = 'force-dynamic';

type PageSearchParams = { login?: string | string[]; loggedOut?: string | string[]; [key: string]: string | string[] | undefined };

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function stateLabel(healthExists: boolean, online: number, latestEventAt: string | null) {
  if (!healthExists) return { label: 'Data unavailable', tone: 'danger', body: 'The website cannot read Northbound RP files right now.' };
  if (online > 0) return { label: 'City active', tone: 'success', body: `${online} ${online === 1 ? 'player is' : 'players are'} connected right now.` };
  if (latestEventAt) return { label: 'City quiet', tone: 'warning', body: `Last server activity was ${relativeFromDate(latestEventAt)}.` };
  return { label: 'Awaiting activity', tone: 'neutral', body: 'Server files are connected, but there is no connection history yet.' };
}

export default async function HomePage({ searchParams }: { searchParams?: Promise<PageSearchParams> }) {
  const [config, health, params, population, tweets, playersBySteam, serverConfig, updates, samples, bans, overview] = await Promise.all([
    getSiteConfig(),
    getDataHealth(),
    searchParams ?? Promise.resolve({} as PageSearchParams),
    getPopulationSummary(),
    getTweets(),
    getPlayersBySteamId(),
    getServerConfig(),
    getStatusUpdates(3),
    getMetricSamples(24),
    getBanRecords(),
    getCityOverview(),
  ]);

  const status = stateLabel(health.exists, population.onlineCount, population.latestEventAt);
  const latestMetric = samples.at(-1);
  const latestTweets = tweets.slice(0, 3);
  const latestBans = bans.slice(0, 2);
  const steamIds = new Set<string>();
  for (const tweet of latestTweets) steamIds.add(String(tweet.AuthorSteamId));
  for (const ban of latestBans) steamIds.add(ban.steamId);
  const steamProfiles = await getSteamProfiles([...steamIds]);
  const loginFailed = getSingleParam(params.login) === 'failed';
  const loggedOut = getSingleParam(params.loggedOut) === '1';
  const maxPlayers = serverConfig.MaxPlayers ?? config.server.maxPlayersFallback;

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow"><i /> Northline RP · {config.server.modeLabel}</span>
          <h1>{config.home.headline}</h1>
          <p>{config.home.intro}</p>
          <div className="button-row">
            <Link className="button button-primary" href="/api/auth/steam?returnTo=/dashboard">{config.home.primaryCta}</Link>
            <Link className="button button-soft" href="/status">{config.home.secondaryCta}</Link>
            <a className="button button-ghost" href={config.server.discordUrl}>Discord</a>
          </div>
          {loginFailed ? <p className="notice danger">Steam sign-in failed. Check SITE_URL, Caddy forwarding headers, and Steam OpenID callback reachability.</p> : null}
          {loggedOut ? <p className="notice success">You have been signed out.</p> : null}
        </div>
        <aside className="city-pulse card">
          <div className="pulse-topline"><span className={`status-dot ${status.tone}`} />{status.label}</div>
          <strong>{population.onlineCount}/{maxPlayers}</strong>
          <p>{status.body}</p>
          <dl>
            <div><dt>Known citizens</dt><dd>{overview.players.toLocaleString()}</dd></div>
            <div><dt>Total playtime</dt><dd>{duration(overview.totalPlaytime)}</dd></div>
            <div><dt>Website RAM</dt><dd>{latestMetric ? `${latestMetric.processRamMb} MB` : 'Learning'}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="stat-band four">
        <div><span>Registered saves</span><strong>{overview.players.toLocaleString()}</strong></div>
        <div><span>Tweeter posts</span><strong>{overview.tweets.toLocaleString()}</strong></div>
        <div><span>Property layouts</span><strong>{overview.propertyLayouts.toLocaleString()}</strong></div>
        <div><span>Active bans</span><strong>{overview.bans.active.toLocaleString()}</strong></div>
      </section>

      <section className="layout-three">
        <article className="card feature-card large-card">
          <span className="kicker">Portal direction</span>
          <h2>{config.content.announcementTitle}</h2>
          <p>{config.content.announcementBody}</p>
          <div className="mini-list">
            {config.features.map((feature) => <div key={feature.title}><strong>{feature.title}</strong><span>{feature.body}</span></div>)}
          </div>
        </article>

        <article className="card">
          <div className="section-heading inline"><div><span className="kicker">Staff notices</span><h2>Updates</h2></div><Link href="/status">View all</Link></div>
          <div className="stack-list">
            {updates.length ? updates.map((update) => <div key={update.id}><strong>{update.title}</strong><span>{update.body}</span><small>{relativeFromDate(update.createdAt)} by {update.createdByName}</small></div>) : <div><strong>No notices posted</strong><span>Staff announcements will appear here.</span></div>}
          </div>
        </article>

        <article className="card">
          <div className="section-heading inline"><div><span className="kicker">Economy snapshot</span><h2>City scale</h2></div><Link href="/guides">Learn</Link></div>
          <dl className="metric-grid compact">
            <div><dt>Total cash</dt><dd>{money(overview.totalCash)}</dd></div>
            <div><dt>Total bank</dt><dd>{money(overview.totalBank)}</dd></div>
            <div><dt>Avg. level</dt><dd>{overview.averageLevel.toFixed(1)}</dd></div>
            <div><dt>Whitelist</dt><dd>{overview.whitelistEnabled ? 'On' : 'Off'}</dd></div>
          </dl>
        </article>
      </section>

      <section className="layout-two">
        <article className="card">
          <div className="section-heading inline"><div><span className="kicker">City feed</span><h2>Latest Tweeter posts</h2></div><Link href="/tweeter">Open feed</Link></div>
          <div className="stack-list">
            {latestTweets.length ? latestTweets.map((tweet) => {
              const steamId = String(tweet.AuthorSteamId);
              const player = playersBySteam.get(steamId);
              const profile = steamProfiles.get(steamId);
              return <div key={tweet.Id}><strong>{tweet.AuthorDisplayName || player?.RpDisplayName || player?.LastKnownDisplayName || profile?.personaName || `Citizen ${steamId.slice(-8)}`}</strong><span>{tweet.Body}</span><small>{tweet.PostedAtTimeSeconds ? fullDate(new Date(tweet.PostedAtTimeSeconds * 1000)) : 'Unknown time'} · {tweet.LikeCount ?? 0} likes</small></div>;
            }) : <div><strong>No posts yet</strong><span>In-game Tweeter posts will appear here.</span></div>}
          </div>
        </article>

        <article className="card">
          <div className="section-heading inline"><div><span className="kicker">Moderation</span><h2>Recent actions</h2></div><Link href="/bans">View bans</Link></div>
          <div className="stack-list">
            {latestBans.length ? latestBans.map((ban) => <div key={ban.id}><strong>{ban.playerName}</strong><span>{ban.reason}</span><small>{ban.isPermanent ? 'Permanent' : ban.expiresAt ? `Expires ${fullDate(ban.expiresAt)}` : 'Account action'}</small></div>) : <div><strong>No public bans</strong><span>Public-safe moderation records will appear here.</span></div>}
          </div>
        </article>
      </section>

      <section className="card deployment-card">
        <div>
          <span className="kicker">Deployment-aware</span>
          <h2>Built for your Windows + Caddy host.</h2>
          <p>The app expects to run with <code>npm run build</code> and <code>npm run start</code> on <code>127.0.0.1:3000</code>, while Caddy handles HTTPS for <code>{config.brand.domain}</code>. s&box can live on the same machine; the website only needs read access to the aperp data folder.</p>
        </div>
        <Link className="button button-soft" href="/status">Check data path</Link>
      </section>
    </main>
  );
}
