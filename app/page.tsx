import Link from 'next/link';
import { CommunityHomeLiveStats } from '@/components/CommunityHomeLiveStats';
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
type MiniFact = { icon: string; label: string; value: string; body: string; href?: string };

type PulseCard = {
  icon: string;
  label: string;
  value: string;
  body: string;
  tone?: 'good' | 'warn' | 'danger' | 'calm';
  href?: string;
};

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function cityMood(status: Awaited<ReturnType<typeof getServerRuntimeStatus>>, online: number, latestEventAt: string | null, dataConnected: boolean) {
  if (!dataConnected || status.state === 'data_missing') return { label: 'The wires are crossed', body: 'The portal cannot read the city files right now.', icon: 'fa-solid fa-plug-circle-xmark', tone: 'danger' as const };
  if (status.state === 'offline') return { label: 'Server looks offline', body: status.lastSignalAt ? `Last visible signal was ${relativeFromDate(status.lastSignalAt)}.` : 'No fresh server signal is visible right now.', icon: 'fa-solid fa-power-off', tone: 'danger' as const };
  if (online >= 8) return { label: 'The city is loud', body: `${online} citizens are currently making questionable decisions.`, icon: 'fa-solid fa-volume-high', tone: 'success' as const };
  if (online > 0) return { label: 'People are outside', body: `${online} ${online === 1 ? 'citizen is' : 'citizens are'} online right now.`, icon: 'fa-solid fa-person-walking', tone: 'success' as const };
  if (status.state === 'quiet' || status.state === 'online') return { label: 'Online but quiet', body: latestEventAt ? `Last activity was ${relativeFromDate(latestEventAt)}.` : 'The server is online, but nobody is showing online.', icon: 'fa-solid fa-moon', tone: 'warning' as const };
  return { label: 'Status unclear', body: 'The portal cannot confidently confirm the game server state right now.', icon: 'fa-solid fa-circle-question', tone: 'warning' as const };
}

function compactPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function compactNumber(value: number) {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-US', { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function compactMoney(value: number) {
  if (!Number.isFinite(value)) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: Math.abs(value) >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function signedInFacts({
  role,
  playerDeaths,
  guidePercent,
  playtimeSeconds,
  level,
}: {
  role: string;
  playerDeaths: number;
  guidePercent: number;
  playtimeSeconds: number;
  level: number;
}): MiniFact[] {
  return [
    { icon: 'fa-solid fa-user-shield', label: 'City role', value: role, body: 'This is how the portal currently recognizes you.' },
    { icon: 'fa-solid fa-clock', label: 'Time in city', value: duration(playtimeSeconds), body: 'Every hour counts. Somehow.' },
    { icon: 'fa-solid fa-star', label: 'Level', value: String(level || 1), body: 'A quick look at your character progress.' },
    { icon: 'fa-solid fa-skull', label: 'Your deaths', value: playerDeaths.toLocaleString(), body: playerDeaths ? 'The city has receipts.' : 'You are undefeated on paper.' },
    { icon: 'fa-solid fa-map', label: 'Guides done', value: compactPercent(guidePercent), body: 'Finish onboarding whenever you want the full tour.' },
  ];
}

function PulseItem({ item }: { item: PulseCard }) {
  const content = (
    <>
      <i className={item.icon} aria-hidden="true" />
      <span>{item.label}</span>
      <strong>{item.value}</strong>
      <small>{item.body}</small>
    </>
  );
  return item.href ? <Link className={`northstar-pulse-card tone-${item.tone ?? 'calm'}`} href={item.href}>{content}</Link> : <article className={`northstar-pulse-card tone-${item.tone ?? 'calm'}`}>{content}</article>;
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
  const displayName = steamId ? getCitizenName(player, steamId) : 'future citizen';
  const avatar = communityProfile?.customAvatarUrl || steamProfile?.avatarFull || steamProfile?.avatarMedium || null;
  const playerDeaths = steamId ? damageLogs.filter((log) => Boolean(log.IsFatal) && String(log.VictimSteamId) === steamId).length : 0;
  const guidePercent = guideProgress?.percent ?? 0;
  const playtimeSeconds = Number(player?.TotalPlaytimeSeconds ?? 0);
  const level = Number(player?.Level ?? player?.TrackedStats?.level ?? 1);
  const hasSignedIn = Boolean(steamId);
  const runtime = await getServerRuntimeStatus({ health, population, staleAfterMinutes: config.status.offlineAfterMinutes, serverHost: config.status.serverHost, serverPort: config.status.serverPort, queryTimeoutMs: config.status.queryTimeoutMs, fallbackQueryHosts: config.status.fallbackQueryHosts, processNames: config.status.processNames });
  const currentOnline = runtime.playerCount ?? population.onlineCount;
  const mood = cityMood(runtime, currentOnline, runtime.lastSignalAt ?? population.latestEventAt, health.exists);
  const homeOnlineDisplay = runtime.state === 'offline' ? 'Offline' : (runtime.state === 'data_missing' || runtime.state === 'unknown') ? 'Checking' : String(currentOnline);
  const fillPercent = runtime.state === 'offline' ? 0 : Math.min(100, maxPlayers ? (currentOnline / maxPlayers) * 100 : 0);
  const recentFatal = damageLogs.find((log) => Boolean(log.IsFatal));
  const topDeathCategory = deathSummary.categories.find((category) => category.count > 0) ?? deathSummary.categories[0];
  const latestUpdate = updates[0] ?? null;
  const richestPool = Number(overview.totalCash ?? 0) + Number(overview.totalBank ?? 0);

  const initialLiveSnapshot = {
    generatedAt: new Date().toISOString(),
    overview: {
      players: overview.players,
      tweets: overview.tweets,
      propertyLayouts: overview.propertyLayouts,
      propertyProps: overview.propertyProps,
      totalCash: overview.totalCash,
      totalBank: overview.totalBank,
    },
    deathSummary,
    recentFatal: recentFatal ? {
      id: `${recentFatal.Timestamp}-${recentFatal.VictimSteamId}-${recentFatal.Cause ?? 'unknown'}-${recentFatal.HealthAfter ?? 'na'}`,
      victimName: recentFatal.VictimName || 'Someone',
      cause: recentFatal.Cause || 'Unknown',
      timestamp: recentFatal.Timestamp,
    } : null,
  };

  const personalFacts = hasSignedIn ? signedInFacts({ role, playerDeaths, guidePercent, playtimeSeconds, level }) : [];
  const pulseCards: PulseCard[] = [
    { icon: runtime.state === 'offline' ? 'fa-solid fa-power-off' : 'fa-solid fa-signal', label: 'Server signal', value: runtime.label, body: runtime.lastSignalAt ? `Last signal ${relativeFromDate(runtime.lastSignalAt)}` : runtime.message, tone: runtime.state === 'offline' ? 'danger' : 'good', href: statusVisible ? '/status' : undefined },
    { icon: 'fa-solid fa-users', label: 'Citizens tracked', value: compactNumber(overview.players), body: `${currentOnline}/${maxPlayers} online right now`, tone: currentOnline > 0 ? 'good' : 'calm', href: playersVisible ? '/players' : undefined },
    { icon: 'fa-brands fa-twitter', label: 'Tweeter posts', value: compactNumber(overview.tweets), body: latestTweets[0] ? `Latest: ${relativeFromDate(new Date((latestTweets[0].PostedAtTimeSeconds ?? 0) * 1000))}` : 'Waiting for city chatter', tone: tweeterVisible ? 'good' : 'calm', href: tweeterVisible ? '/tweeter' : undefined },
    { icon: 'fa-solid fa-skull', label: 'Chaos index', value: compactNumber(deathSummary.total), body: topDeathCategory?.label ? `${topDeathCategory.label} leads the board` : 'No fatal chaos recorded yet', tone: deathSummary.total > 0 ? 'warn' : 'calm' },
  ];

  return (
    <main className={`community-home northstar-home ${hasSignedIn ? 'community-home-signed-in' : 'community-home-guest'}`}>
      <section className="northstar-hero community-hero">
        <div className="northstar-hero-copy community-hero-copy">
          <span className="community-pill northstar-pill"><i className="fa-solid fa-location-crosshairs" aria-hidden="true" /> Northline RP live command portal</span>
          <h1>{hasSignedIn ? `Welcome back, ${displayName}.` : 'Northline is alive before you even load in.'}</h1>
          <p>
            {hasSignedIn
              ? `Your ${role} profile is connected. The portal is watching the pulse of the city: server signal, citizens, chatter, public tools, and your next useful move.`
              : 'A cinematic community hub for Northline RP: live server signal, city stats, daily rewards, citizen profiles, roleplay tools, and the stories players create between sessions.'}
          </p>

          <div className="northstar-hero-actions community-hero-actions">
            {hasSignedIn ? (
              <>
                <Link className="button button-primary community-main-button" href="/dashboard"><i className="fa-solid fa-id-card" aria-hidden="true" /> Open your dashboard</Link>
                {tweeterVisible ? <Link className="button button-soft" href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> Browse Tweeter</Link> : null}
                {dailyDropsVisible ? <Link className="button button-ghost" href="/cases"><i className="fa-solid fa-gift" aria-hidden="true" /> Claim daily drop</Link> : null}
              </>
            ) : (
              <>
                <a className="button button-primary community-main-button" href="/api/auth/steam?returnTo=/dashboard"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</a>
                {tweeterVisible ? <Link className="button button-soft" href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> Peek at Tweeter</Link> : null}
                <a className="button button-ghost" href={config.server.discordUrl}><i className="fa-brands fa-discord" aria-hidden="true" /> Join Northline Discord</a>
              </>
            )}
          </div>

          <div className="northstar-hero-microgrid" aria-label="Live city highlights">
            {pulseCards.slice(0, 3).map((item) => <PulseItem item={item} key={item.label} />)}
          </div>

          {loginFailed ? <p className="community-alert danger">Steam sign-in failed. Check SITE_URL, Caddy forwarding headers, and the callback URL.</p> : null}
          {loggedOut ? <p className="community-alert success">You have been signed out. Come back when the city needs you.</p> : null}
        </div>

        <aside className="northstar-status-tower community-hero-card">
          <div className={`community-mood ${mood.tone}`}>
            <span><i className={mood.icon} aria-hidden="true" /></span>
            <div>
              <strong>{mood.label}</strong>
              <small>{mood.body}</small>
            </div>
          </div>
          <div className="northstar-orbital-status">
            <div className="northstar-orbit-ring" style={{ ['--online-fill' as string]: `${fillPercent}%` }}>
              <strong>{homeOnlineDisplay}</strong>
              <span>{runtime.state === 'offline' || runtime.state === 'data_missing' || runtime.state === 'unknown' ? 'server status' : 'online now'}</span>
            </div>
            <div className="northstar-capacity-stack">
              <div><strong>{maxPlayers}</strong><span>slots</span></div>
              <div><strong>{compactPercent(fillPercent)}</strong><span>capacity</span></div>
            </div>
          </div>
          <div className="community-meter-bar"><span style={{ width: `${fillPercent}%` }} /></div>
          {hasSignedIn ? (
            <div className="community-player-chip northstar-player-chip">
              <UserAvatar src={avatar} name={displayName} size="md" />
              <div>
                <strong>{displayName}</strong>
                <span>{role} · {duration(playtimeSeconds)} played · {playerDeaths} deaths</span>
              </div>
            </div>
          ) : (
            <div className="community-guest-start northstar-guest-start">
              <strong>New here?</strong>
              <span>Start with Steam if you already play here, or hop into Discord if you are still checking the place out.</span>
              <div>
                <a href="/api/auth/steam?returnTo=/dashboard"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in</a>
                {guidesVisible ? <Link href="/guides"><i className="fa-solid fa-book-open-reader" aria-hidden="true" /> Guides</Link> : null}
              </div>
            </div>
          )}
        </aside>
      </section>

      <section className="northstar-intel-strip" aria-label="Northline live intelligence">
        {pulseCards.map((item) => <PulseItem item={item} key={item.label} />)}
      </section>

      <section className="northstar-command-deck" aria-labelledby="northstar-command-title">
        <div className="community-section-heading inline">
          <div>
            <span className="community-kicker">Choose your route</span>
            <h2 id="northstar-command-title">Jump into the part of the city that matters right now.</h2>
            <p>The homepage now adapts around live data and only shows public tools that are enabled for the site.</p>
          </div>
        </div>
        <div className="northstar-command-grid">
          {dailyDropsVisible ? (
            <Link className="northstar-command-card featured" href="/cases">
              <span className="feature-card-icon"><i className="fa-solid fa-gift" aria-hidden="true" /></span>
              <div>
                <strong>{hasSignedIn ? 'Claim your daily drop' : 'Daily drops'}</strong>
                <p>{hasSignedIn ? 'Check in once a day, stash cases, and open them whenever you feel lucky.' : 'Sign in with Steam to start collecting free daily drops. No payment, no nonsense.'}</p>
              </div>
              <em>Reward loop</em>
            </Link>
          ) : null}
          {tweeterVisible ? (
            <Link className="northstar-command-card" href="/tweeter">
              <span className="feature-card-icon"><i className="fa-brands fa-twitter" aria-hidden="true" /></span>
              <div><strong>City chatter</strong><p>Read in-game Tweeter posts and catch what citizens are talking about before you log in.</p></div>
              <em>{compactNumber(overview.tweets)} posts</em>
            </Link>
          ) : null}
          {playersVisible ? (
            <Link className="northstar-command-card" href="/players">
              <span className="feature-card-icon"><i className="fa-solid fa-users" aria-hidden="true" /></span>
              <div><strong>Public citizens</strong><p>Find claimed profiles, check public personas, and recognize the people you keep running into.</p></div>
              <em>{compactNumber(overview.players)} saves</em>
            </Link>
          ) : null}
          {leaderboardsVisible ? (
            <Link className="northstar-command-card" href="/leaderboards">
              <span className="feature-card-icon"><i className="fa-solid fa-ranking-star" aria-hidden="true" /></span>
              <div><strong>Leaderboards</strong><p>See public rankings for citizens who chose to show up on the boards.</p></div>
              <em>Rankings</em>
            </Link>
          ) : null}
          {guidesVisible ? (
            <Link className="northstar-command-card" href="/guides">
              <span className="feature-card-icon"><i className="fa-solid fa-book-open-reader" aria-hidden="true" /></span>
              <div><strong>Getting settled</strong><p>Need a nudge? Guides can show your next useful step and keep new players from feeling lost.</p></div>
              <em>{hasSignedIn ? `${compactPercent(guidePercent)} done` : 'Start here'}</em>
            </Link>
          ) : null}
          {jobsVisible ? (
            <Link className="northstar-command-card" href="/jobs">
              <span className="feature-card-icon"><i className="fa-solid fa-briefcase" aria-hidden="true" /></span>
              <div><strong>Staff applications</strong><p>Browse open roles and apply through the guided staff application portal.</p></div>
              <em>Hiring</em>
            </Link>
          ) : null}
          {supportVisible ? (
            <Link className="northstar-command-card" href="/support">
              <span className="feature-card-icon"><i className="fa-solid fa-life-ring" aria-hidden="true" /></span>
              <div><strong>Need help?</strong><p>Support links for bugs, account trouble, moderation questions, and Discord.</p></div>
              <em>Support</em>
            </Link>
          ) : null}
        </div>
      </section>

      <section className="northstar-world-briefing">
        <article className="community-card northstar-brief-card status-brief">
          <span className="community-kicker">Status briefing</span>
          <h2>{runtime.label}</h2>
          <p>{runtime.message}</p>
          <div className="northstar-brief-metrics">
            <div><strong>{homeOnlineDisplay}</strong><span>online now</span></div>
            <div><strong>{maxPlayers}</strong><span>server slots</span></div>
            <div><strong>{runtime.source.replace(/_/g, ' ')}</strong><span>status source</span></div>
          </div>
          {statusVisible ? <Link className="button button-soft" href="/status"><i className="fa-solid fa-signal" aria-hidden="true" /> Full status page</Link> : null}
        </article>

        <article className="community-card northstar-brief-card economy-brief">
          <span className="community-kicker">City economy</span>
          <h2>{compactMoney(richestPool)}</h2>
          <p>Estimated combined saved cash and bank holdings across known player data.</p>
          <div className="northstar-brief-metrics">
            <div><strong>{compactMoney(Number(overview.totalCash ?? 0))}</strong><span>cash</span></div>
            <div><strong>{compactMoney(Number(overview.totalBank ?? 0))}</strong><span>bank</span></div>
            <div><strong>{compactNumber(overview.propertyLayouts)}</strong><span>layouts</span></div>
          </div>
          {leaderboardsVisible ? <Link className="button button-soft" href="/leaderboards"><i className="fa-solid fa-chart-line" aria-hidden="true" /> View rankings</Link> : null}
        </article>

        <article className="community-card northstar-brief-card notice-brief">
          <span className="community-kicker">Latest notice</span>
          <h2>{latestUpdate?.title ?? 'No staff notices posted'}</h2>
          <p>{latestUpdate?.body ?? 'Nothing major has been posted yet. Enjoy the quiet while it lasts.'}</p>
          <small>{latestUpdate ? `${relativeFromDate(latestUpdate.createdAt)} by ${latestUpdate.createdByName}` : 'Noticeboard is clear'}</small>
          {statusVisible ? <Link className="button button-soft" href="/status"><i className="fa-solid fa-bullhorn" aria-hidden="true" /> Public notices</Link> : null}
        </article>
      </section>

      <CommunityHomeLiveStats initialSnapshot={initialLiveSnapshot} signedIn={hasSignedIn} featureVisibility={{ players: playersVisible, guides: guidesVisible, status: statusVisible, tweeter: tweeterVisible }} />

      <section className="community-card ape-tavern-callout northstar-ape-tavern-callout">
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
        <section className="community-card personal-board northstar-personal-board">
          <div className="community-section-heading inline">
            <div>
              <span className="community-kicker">Signed-in citizen panel</span>
              <h2>A few things about you</h2>
              <p>A compact citizen snapshot tuned for returning players.</p>
            </div>
            <Link href="/dashboard">Tune your profile</Link>
          </div>
          <div className="personal-fact-grid">
            {personalFacts.map((fact) => (
              <div className="personal-fact" key={fact.label}>
                <i className={fact.icon} aria-hidden="true" />
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
                <small>{fact.body}</small>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="community-lower-grid northstar-lower-grid">
        {tweeterVisible ? (
          <article className="community-card tweeter-preview-card">
            <div className="community-section-heading inline">
              <div>
                <span className="community-kicker">City chatter</span>
                <h2>Fresh from Tweeter</h2>
              </div>
              <Link href="/tweeter">Open feed</Link>
            </div>
            <div className="community-post-list">
              {latestTweets.length ? latestTweets.map((tweet) => {
                const authorSteamId = String(tweet.AuthorSteamId);
                const authorPlayer = playersBySteam.get(authorSteamId);
                const authorProfile = steamProfiles.get(authorSteamId);
                const authorName = tweet.AuthorDisplayName || authorPlayer?.RpDisplayName || authorPlayer?.LastKnownDisplayName || authorProfile?.personaName || `Citizen ${authorSteamId.slice(-8)}`;
                return (
                  <Link href={`/tweeter/tweet/${tweet.Id}`} className="community-post" key={tweet.Id}>
                    <UserAvatar src={authorProfile?.avatarMedium ?? null} name={authorName} size="sm" />
                    <div>
                      <strong>{authorName}</strong>
                      <p>{tweet.Body}</p>
                      <small>{tweet.PostedAtTimeSeconds ? fullDate(new Date(tweet.PostedAtTimeSeconds * 1000)) : 'Unknown time'} · {tweet.LikeCount ?? 0} like{tweet.LikeCount === 1 ? '' : 's'}</small>
                    </div>
                  </Link>
                );
              }) : <div className="community-empty"><strong>No posts yet</strong><span>In-game Tweeter posts will appear here once citizens start talking.</span></div>}
            </div>
          </article>
        ) : null}

        <article className="community-card neighborhood-card">
          <div className="community-section-heading">
            <span className="community-kicker">Community noticeboard</span>
            <h2>Useful at a glance</h2>
          </div>
          <div className="noticeboard-list">
            {updates.length ? updates.map((update) => (
              <div key={update.id}>
                <strong>{update.title}</strong>
                <span>{update.body}</span>
                <small>{relativeFromDate(update.createdAt)} by {update.createdByName}</small>
              </div>
            )) : <div><strong>No staff notices posted</strong><span>Nothing major has been posted yet.</span><small>Enjoy the quiet while it lasts.</small></div>}
            <div>
              <strong>{overview.propertyLayouts.toLocaleString()} saved property layouts</strong>
              <span>Citizens are decorating apartments, building shops, and saving their favorite setups.</span>
              <small>{overview.propertyProps.toLocaleString()} saved props</small>
            </div>
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
