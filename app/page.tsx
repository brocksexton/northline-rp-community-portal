import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';
import {
  getAllDamageLogs,
  getCitizenName,
  getCityOverview,
  getDataHealth,
  getDeathSummary,
  getGuideProgress,
  getPlayer,
  getPlayersBySteamId,
  getPopulationSummary,
  getServerRuntimeStatus,
  getRoleForSteamId,
  getServerConfig,
  getTweets,
} from '@/lib/ape-data';
import { resolvePublicRoleLabel } from '@/lib/ape-staff-data';
import { getCommunityProfile, getStatusUpdates } from '@/lib/community-data';
import { duration, fullDate, relativeFromDate } from '@/lib/format';
import { getSessionSteamId } from '@/lib/session';
import { getSiteConfig } from '@/lib/site-config';
import { enabledFeatureIds, getSiteFeatureSettings } from '@/lib/site-features-data';
import { getSteamProfile, getSteamProfiles } from '@/lib/steam-openid';
import { buildPageMetadata } from '@/lib/embed-metadata';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Northline RP',
    description: 'Your city portal for Northbound RP: server status, Tweeter, public profiles, guides, rules, and community tools.',
    path: '/',
  });
}

type PageSearchParams = { login?: string | string[]; loggedOut?: string | string[]; [key: string]: string | string[] | undefined };
type HomeMetric = { label: string; value: string; detail: string; icon: string; href?: string };
type HomeAction = { label: string; body: string; href: string; icon: string; eyebrow: string; featured?: boolean };

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function compactPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function compactNumber(value: number) {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-US', { notation: Math.abs(value) >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function compactMoney(value: number) {
  if (!Number.isFinite(value)) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: Math.abs(value) >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function statusTone(state: string) {
  if (state === 'offline' || state === 'data_missing') return 'danger';
  if (state === 'unknown' || state === 'quiet') return 'warning';
  return 'good';
}

function serverCopy({ state, online, lastSignalAt, message }: { state: string; online: number; lastSignalAt?: string | null; message: string }) {
  if (state === 'offline') return lastSignalAt ? `Last visible signal was ${relativeFromDate(lastSignalAt)}.` : 'No fresh server signal is visible right now.';
  if (state === 'data_missing') return 'The portal cannot read the city files right now.';
  if (online > 0) return `${online} ${online === 1 ? 'citizen is' : 'citizens are'} online right now.`;
  if (state === 'quiet') return 'Server signal is present, but the city is quiet.';
  return message || 'The portal is checking the current server signal.';
}

function HomeMetricCard({ metric }: { metric: HomeMetric }) {
  const content = (
    <>
      <span className="home-v58-metric-icon"><i className={metric.icon} aria-hidden="true" /></span>
      <span className="home-v58-metric-label">{metric.label}</span>
      <strong>{metric.value}</strong>
      <small>{metric.detail}</small>
    </>
  );
  return metric.href ? <Link className="home-v58-metric" href={metric.href}>{content}</Link> : <article className="home-v58-metric">{content}</article>;
}

function HomeActionCard({ action }: { action: HomeAction }) {
  return (
    <Link className={`home-v58-action-card ${action.featured ? 'featured' : ''}`} href={action.href}>
      <span className="home-v58-action-icon"><i className={action.icon} aria-hidden="true" /></span>
      <span className="home-v58-action-eyebrow">{action.eyebrow}</span>
      <strong>{action.label}</strong>
      <p>{action.body}</p>
      <em>Open</em>
    </Link>
  );
}

export default async function HomePage({ searchParams }: { searchParams?: Promise<PageSearchParams> }) {
  const [config, health, params, steamId, population, tweets, playersBySteam, serverConfig, updates, overview, deathSummary, damageLogs, featureSettings] = await Promise.all([
    getSiteConfig(),
    getDataHealth(),
    searchParams ?? Promise.resolve({} as PageSearchParams),
    getSessionSteamId(),
    getPopulationSummary(),
    getTweets(),
    getPlayersBySteamId(),
    getServerConfig(),
    getStatusUpdates(3),
    getCityOverview(),
    getDeathSummary(),
    getAllDamageLogs(),
    getSiteFeatureSettings(),
  ]);

  const [player, communityProfile, steamProfile, rawRole, guideProgress] = steamId
    ? await Promise.all([getPlayer(steamId), getCommunityProfile(steamId), getSteamProfile(steamId), getRoleForSteamId(steamId), getGuideProgress(steamId)])
    : [null, null, null, 'Guest', null] as const;
  const role = steamId ? await resolvePublicRoleLabel(steamId, rawRole) : rawRole;

  const enabledFeatures = enabledFeatureIds(featureSettings);
  const statusVisible = enabledFeatures.has('status');
  const tweeterVisible = enabledFeatures.has('tweeter');
  const playersVisible = enabledFeatures.has('players');
  const leaderboardsVisible = enabledFeatures.has('leaderboards');
  const dailyDropsVisible = enabledFeatures.has('dailyDrops');
  const guidesVisible = enabledFeatures.has('guides');
  const bansVisible = enabledFeatures.has('bans');
  const supportVisible = enabledFeatures.has('support');
  const jobsVisible = enabledFeatures.has('jobs');

  const latestTweets = tweeterVisible ? tweets.slice(0, 3) : [];
  const tweetSteamIds = [...new Set(latestTweets.map((tweet) => String(tweet.AuthorSteamId)))];
  const steamProfiles = await getSteamProfiles(tweetSteamIds);
  const loginFailed = getSingleParam(params.login) === 'failed';
  const loggedOut = getSingleParam(params.loggedOut) === '1';
  const maxPlayers = serverConfig.MaxPlayers ?? config.server.maxPlayersFallback;
  const runtime = await getServerRuntimeStatus({ health, population, staleAfterMinutes: config.status.offlineAfterMinutes, serverHost: config.status.serverHost, serverPort: config.status.serverPort, queryTimeoutMs: config.status.queryTimeoutMs, fallbackQueryHosts: config.status.fallbackQueryHosts, processNames: config.status.processNames });

  const currentOnline = runtime.playerCount ?? population.onlineCount;
  const fillPercent = runtime.state === 'offline' || runtime.state === 'data_missing' ? 0 : Math.min(100, maxPlayers ? (currentOnline / maxPlayers) * 100 : 0);
  const homeOnlineDisplay = runtime.state === 'offline' ? 'Offline' : (runtime.state === 'data_missing' || runtime.state === 'unknown') ? 'Checking' : String(currentOnline);
  const displayName = steamId ? getCitizenName(player, steamId) : 'future citizen';
  const avatar = communityProfile?.customAvatarUrl || steamProfile?.avatarFull || steamProfile?.avatarMedium || null;
  const hasSignedIn = Boolean(steamId);
  const guidePercent = guideProgress?.percent ?? 0;
  const playtimeSeconds = Number(player?.TotalPlaytimeSeconds ?? 0);
  const level = Number(player?.Level ?? player?.TrackedStats?.level ?? 1);
  const playerDeaths = steamId ? damageLogs.filter((log) => Boolean(log.IsFatal) && String(log.VictimSteamId) === steamId).length : 0;
  const recentFatal = damageLogs.find((log) => Boolean(log.IsFatal));
  const topDeathCategory = deathSummary.categories.find((category) => category.count > 0) ?? deathSummary.categories[0];
  const latestUpdate = updates[0] ?? null;
  const richestPool = Number(overview.totalCash ?? 0) + Number(overview.totalBank ?? 0);

  const heroMetrics: HomeMetric[] = [
    { icon: 'fa-solid fa-users', label: 'Online now', value: homeOnlineDisplay, detail: `${maxPlayers} slots available`, href: statusVisible ? '/status' : undefined },
    { icon: 'fa-solid fa-id-badge', label: 'Known citizens', value: compactNumber(overview.players), detail: 'Saved player records', href: playersVisible ? '/players' : undefined },
    { icon: 'fa-brands fa-twitter', label: 'Tweeter posts', value: compactNumber(overview.tweets), detail: latestTweets[0] ? `Latest ${relativeFromDate(new Date((latestTweets[0].PostedAtTimeSeconds ?? 0) * 1000))}` : 'Waiting for city chatter', href: tweeterVisible ? '/tweeter' : undefined },
  ];

  const actionCards: HomeAction[] = [];
  if (dailyDropsVisible) actionCards.push({ label: hasSignedIn ? 'Claim your daily drop' : 'Daily drops', body: hasSignedIn ? 'Check in, collect a case, and open your rewards when the city owes you something.' : 'Sign in with Steam to collect free daily cases tied to the community portal.', href: '/cases', icon: 'fa-solid fa-gift', eyebrow: 'Reward loop', featured: true });
  if (tweeterVisible) actionCards.push({ label: 'City chatter', body: 'Read in-game Tweeter posts and catch the tone of the city before you load in.', href: '/tweeter', icon: 'fa-brands fa-twitter', eyebrow: `${compactNumber(overview.tweets)} posts` });
  if (playersVisible) actionCards.push({ label: 'Citizen profiles', body: 'Browse public profiles, recognize regulars, and put faces to the names you see in city.', href: '/players', icon: 'fa-solid fa-users', eyebrow: `${compactNumber(overview.players)} saves` });
  if (leaderboardsVisible) actionCards.push({ label: 'Leaderboards', body: 'See public rankings for players who choose to show up on the boards.', href: '/leaderboards', icon: 'fa-solid fa-ranking-star', eyebrow: 'Rankings' });
  if (guidesVisible) actionCards.push({ label: 'Getting settled', body: 'Rules, guidance, and onboarding help for new or returning citizens.', href: '/guides', icon: 'fa-solid fa-book-open-reader', eyebrow: hasSignedIn ? `${compactPercent(guidePercent)} done` : 'Start here' });
  if (jobsVisible) actionCards.push({ label: 'Staff applications', body: 'Browse open roles and apply through the guided staff application portal.', href: '/jobs', icon: 'fa-solid fa-briefcase', eyebrow: 'Hiring' });
  if (supportVisible) actionCards.push({ label: 'Support', body: 'Get help with bugs, account issues, moderation questions, or Discord links.', href: '/support', icon: 'fa-solid fa-life-ring', eyebrow: 'Help desk' });

  return (
    <main className={`community-home home-v58 ${hasSignedIn ? 'community-home-signed-in' : 'community-home-guest'}`}>
      <section className="home-v58-hero">
        <div className="home-v58-hero-copy">
          <span className="home-v58-kicker"><i className="fa-solid fa-location-dot" aria-hidden="true" /> Northline RP community portal</span>
          <h1>{hasSignedIn ? `Welcome back, ${displayName}.` : 'A cleaner window into the city before you load in.'}</h1>
          <p>
            {hasSignedIn
              ? `Your ${role} profile is connected. Check the server signal, city activity, notices, rewards, and public tools from one calm landing page.`
              : 'Live server context, public community tools, staff notices, daily rewards, and city chatter for Northbound RP in one focused portal.'}
          </p>
          <div className="home-v58-hero-actions">
            {hasSignedIn ? (
              <>
                <Link className="button button-primary" href="/dashboard"><i className="fa-solid fa-id-card" aria-hidden="true" /> Open dashboard</Link>
                {dailyDropsVisible ? <Link className="button button-soft" href="/cases"><i className="fa-solid fa-gift" aria-hidden="true" /> Daily drop</Link> : null}
                {tweeterVisible ? <Link className="button button-ghost" href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> Tweeter</Link> : null}
              </>
            ) : (
              <>
                <a className="button button-primary" href="/api/auth/steam?returnTo=/dashboard"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</a>
                <a className="button button-soft" href={config.server.discordUrl}><i className="fa-brands fa-discord" aria-hidden="true" /> Join Discord</a>
                {guidesVisible ? <Link className="button button-ghost" href="/guides"><i className="fa-solid fa-book-open-reader" aria-hidden="true" /> Start guide</Link> : null}
              </>
            )}
          </div>
          {loginFailed ? <p className="community-alert danger">Steam sign-in failed. Check SITE_URL, Caddy forwarding headers, and the callback URL.</p> : null}
          {loggedOut ? <p className="community-alert success">You have been signed out. Come back when the city needs you.</p> : null}
        </div>

        <aside className="home-v58-server-card">
          <div className={`home-v58-status-pill tone-${statusTone(runtime.state)}`}>
            <i className={runtime.state === 'offline' ? 'fa-solid fa-power-off' : 'fa-solid fa-signal'} aria-hidden="true" />
            <span>{runtime.label}</span>
          </div>
          <div className="home-v58-online-row">
            <strong>{homeOnlineDisplay}</strong>
            <div>
              <span>{runtime.state === 'offline' || runtime.state === 'data_missing' || runtime.state === 'unknown' ? 'server status' : 'online now'}</span>
              <small>{serverCopy({ state: runtime.state, online: currentOnline, lastSignalAt: runtime.lastSignalAt, message: runtime.message })}</small>
            </div>
          </div>
          <div className="home-v58-capacity-bar" aria-label={`Server capacity ${compactPercent(fillPercent)}`}><span style={{ width: `${fillPercent}%` }} /></div>
          <div className="home-v58-server-grid">
            <div><strong>{maxPlayers}</strong><span>slots</span></div>
            <div><strong>{compactPercent(fillPercent)}</strong><span>capacity</span></div>
            <div><strong>{runtime.source.replace(/_/g, ' ')}</strong><span>source</span></div>
          </div>
          {hasSignedIn ? (
            <div className="home-v58-player-strip">
              <UserAvatar src={avatar} name={displayName} size="md" />
              <div><strong>{displayName}</strong><span>{role} · Level {level || 1} · {duration(playtimeSeconds)} played</span></div>
            </div>
          ) : null}
        </aside>
      </section>

      <section className="home-v58-metrics" aria-label="Live city snapshot">
        {heroMetrics.map((metric) => <HomeMetricCard metric={metric} key={metric.label} />)}
      </section>

      <section className="home-v58-actions-section" aria-labelledby="home-v58-actions-title">
        <div className="home-v58-section-heading">
          <span>Portal routes</span>
          <h2 id="home-v58-actions-title">Pick a useful next step.</h2>
          <p>Less clutter, clearer destinations, and only the public tools that are enabled for the site.</p>
        </div>
        <div className="home-v58-action-grid">
          {actionCards.map((action) => <HomeActionCard action={action} key={action.href} />)}
        </div>
      </section>

      <section className="home-v58-briefing-grid">
        <article className="home-v58-brief-card">
          <span>City pulse</span>
          <h2>{deathSummary.total ? `${compactNumber(deathSummary.total)} recorded fatal moment${deathSummary.total === 1 ? '' : 's'}` : 'The city is oddly peaceful'}</h2>
          <p>{topDeathCategory?.label ? `${topDeathCategory.label} is currently leading the chaos board.` : 'No major chaos category has enough data yet.'}</p>
          <div className="home-v58-mini-list">
            <div><strong>{recentFatal?.VictimName || 'No recent victim'}</strong><small>{recentFatal ? `${recentFatal.Cause || 'Unknown cause'} · ${relativeFromDate(recentFatal.Timestamp)}` : 'Recent fatal logs will appear here.'}</small></div>
            <div><strong>{compactNumber(overview.propertyLayouts)}</strong><small>saved property layouts</small></div>
            <div><strong>{compactNumber(overview.propertyProps)}</strong><small>saved props</small></div>
          </div>
        </article>

        <article className="home-v58-brief-card featured">
          <span>Latest notice</span>
          <h2>{latestUpdate?.title ?? 'No staff notices posted'}</h2>
          <p>{latestUpdate?.body ?? 'Nothing major has been posted yet. Enjoy the quiet while it lasts.'}</p>
          <small>{latestUpdate ? `${relativeFromDate(latestUpdate.createdAt)} by ${latestUpdate.createdByName}` : 'Noticeboard is clear'}</small>
          {statusVisible ? <Link className="button button-soft" href="/status"><i className="fa-solid fa-bullhorn" aria-hidden="true" /> Public status</Link> : null}
        </article>

        <article className="home-v58-brief-card">
          <span>Economy snapshot</span>
          <h2>{compactMoney(richestPool)}</h2>
          <p>Estimated combined saved cash and bank holdings across known player data.</p>
          <div className="home-v58-mini-list two-col">
            <div><strong>{compactMoney(Number(overview.totalCash ?? 0))}</strong><small>cash</small></div>
            <div><strong>{compactMoney(Number(overview.totalBank ?? 0))}</strong><small>bank</small></div>
          </div>
          {leaderboardsVisible ? <Link className="button button-soft" href="/leaderboards"><i className="fa-solid fa-chart-line" aria-hidden="true" /> View rankings</Link> : null}
        </article>
      </section>

      <section className="community-card ape-tavern-callout home-v58-ape-frame">
        <div className="ape-tavern-callout-inner">
          <div className="ape-tavern-brand-block">
            <img className="ape-tavern-logo" src="/apetavern-logo.png" alt="Ape Tavern" />
            <div className="ape-tavern-brand-meta">
              <span className="ape-tavern-overline">A little love to the team behind the gamemode</span>
              <h2>Northbound RP is built by Ape Tavern.</h2>
            </div>
          </div>

          <div className="ape-tavern-copy">
            <p>
              Northline is a community-run companion for a gamemode we genuinely enjoy. Huge respect to Ape Tavern for the work they keep putting into
              Northbound RP and the wider S&box scene.
            </p>
          </div>

          <div className="ape-tavern-actions">
            <a className="button button-primary" href="https://discord.gg/VExsvp4PXT" target="_blank" rel="noreferrer"><i className="fa-brands fa-discord" aria-hidden="true" /> Join Northbound RP Discord</a>
            {guidesVisible ? <Link className="button button-soft" href="/guides"><i className="fa-solid fa-book-open-reader" aria-hidden="true" /> Learn the basics</Link> : null}
          </div>
        </div>
      </section>

      {hasSignedIn ? (
        <section className="home-v58-citizen-panel">
          <div className="home-v58-section-heading">
            <span>Signed-in citizen panel</span>
            <h2>Your quick snapshot.</h2>
            <p>A focused returning-player summary without burying the homepage in personal stats.</p>
          </div>
          <div className="home-v58-citizen-grid">
            <div><i className="fa-solid fa-user-shield" aria-hidden="true" /><span>City role</span><strong>{role}</strong><small>Public display role</small></div>
            <div><i className="fa-solid fa-clock" aria-hidden="true" /><span>Time in city</span><strong>{duration(playtimeSeconds)}</strong><small>Saved playtime</small></div>
            <div><i className="fa-solid fa-star" aria-hidden="true" /><span>Level</span><strong>{level || 1}</strong><small>Character progress</small></div>
            <div><i className="fa-solid fa-skull" aria-hidden="true" /><span>Your deaths</span><strong>{playerDeaths.toLocaleString()}</strong><small>{playerDeaths ? 'The city has receipts.' : 'Undefeated on paper.'}</small></div>
          </div>
          <Link className="button button-soft" href="/dashboard"><i className="fa-solid fa-gear" aria-hidden="true" /> Manage profile</Link>
        </section>
      ) : null}

      <section className="home-v58-lower-grid">
        {tweeterVisible ? (
          <article className="home-v58-feed-card">
            <div className="home-v58-section-heading inline">
              <div><span>City chatter</span><h2>Fresh from Tweeter</h2></div>
              <Link href="/tweeter">Open feed</Link>
            </div>
            <div className="home-v58-post-list">
              {latestTweets.length ? latestTweets.map((tweet) => {
                const authorSteamId = String(tweet.AuthorSteamId);
                const authorPlayer = playersBySteam.get(authorSteamId);
                const authorProfile = steamProfiles.get(authorSteamId);
                const authorName = tweet.AuthorDisplayName || authorPlayer?.RpDisplayName || authorPlayer?.LastKnownDisplayName || authorProfile?.personaName || `Citizen ${authorSteamId.slice(-8)}`;
                return (
                  <Link href={`/tweeter/tweet/${tweet.Id}`} className="home-v58-post" key={tweet.Id}>
                    <UserAvatar src={authorProfile?.avatarMedium ?? null} name={authorName} size="sm" />
                    <div>
                      <strong>{authorName}</strong>
                      <p>{tweet.Body}</p>
                      <small>{tweet.PostedAtTimeSeconds ? fullDate(new Date(tweet.PostedAtTimeSeconds * 1000)) : 'Unknown time'} · {tweet.LikeCount ?? 0} like{tweet.LikeCount === 1 ? '' : 's'}</small>
                    </div>
                  </Link>
                );
              }) : <div className="home-v58-empty"><strong>No posts yet</strong><span>In-game Tweeter posts will appear here once citizens start talking.</span></div>}
            </div>
          </article>
        ) : null}

        <article className="home-v58-feed-card">
          <div className="home-v58-section-heading">
            <span>Noticeboard</span>
            <h2>Useful at a glance</h2>
          </div>
          <div className="home-v58-notice-list">
            {updates.length ? updates.map((update) => (
              <div key={update.id}>
                <strong>{update.title}</strong>
                <span>{update.body}</span>
                <small>{relativeFromDate(update.createdAt)} by {update.createdByName}</small>
              </div>
            )) : <div><strong>No staff notices posted</strong><span>Nothing major has been posted yet.</span><small>Enjoy the quiet while it lasts.</small></div>}
            {bansVisible ? (
              <div>
                <strong>{overview.bans.active.toLocaleString()} active public ban record{overview.bans.active === 1 ? '' : 's'}</strong>
                <span>View the public ban records to see recent moderation actions and their status.</span>
                <small><Link href="/bans">View ban list</Link></small>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
