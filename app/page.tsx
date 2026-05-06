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
  getRoleForSteamId,
  getServerConfig,
  getTweets,
} from '@/lib/ape-data';
import { getCommunityProfile, getStatusUpdates } from '@/lib/community-data';
import { duration, fullDate, relativeFromDate } from '@/lib/format';
import { getSessionSteamId } from '@/lib/session';
import { getSiteConfig } from '@/lib/site-config';
import { getSteamProfile, getSteamProfiles } from '@/lib/steam-openid';

export const dynamic = 'force-dynamic';

type PageSearchParams = { login?: string | string[]; loggedOut?: string | string[]; [key: string]: string | string[] | undefined };

type MiniFact = { icon: string; label: string; value: string; body: string; href?: string };

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function cityMood(online: number, latestEventAt: string | null, dataConnected: boolean) {
  if (!dataConnected) return { label: 'The wires are crossed', body: 'The portal cannot read the city files right now.', icon: 'fa-solid fa-plug-circle-xmark', tone: 'danger' };
  if (online >= 8) return { label: 'The city is loud', body: `${online} citizens are currently making questionable decisions.`, icon: 'fa-solid fa-volume-high', tone: 'success' };
  if (online > 0) return { label: 'People are outside', body: `${online} ${online === 1 ? 'citizen is' : 'citizens are'} online right now.`, icon: 'fa-solid fa-person-walking', tone: 'success' };
  if (latestEventAt) return { label: 'The city is catching its breath', body: `Last activity was ${relativeFromDate(latestEventAt)}.`, icon: 'fa-solid fa-moon', tone: 'warning' };
  return { label: 'Fresh city, fresh chaos', body: 'The portal is ready and waiting for the first new story.', icon: 'fa-solid fa-sparkles', tone: 'neutral' };
}

function compactPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
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

export default async function HomePage({ searchParams }: { searchParams?: Promise<PageSearchParams> }) {
  const [config, health, params, steamId, population, tweets, playersBySteam, serverConfig, updates, overview, deathSummary, damageLogs] = await Promise.all([
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
  ]);

  const [player, communityProfile, steamProfile, role, guideProgress] = steamId
    ? await Promise.all([getPlayer(steamId), getCommunityProfile(steamId), getSteamProfile(steamId), getRoleForSteamId(steamId), getGuideProgress(steamId)])
    : [null, null, null, 'Guest', null] as const;

  const latestTweets = tweets.slice(0, 3);
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
  const mood = cityMood(population.onlineCount, population.latestEventAt, health.exists);
  const recentFatal = damageLogs.find((log) => Boolean(log.IsFatal));
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

  return (
    <main className={`community-home ${hasSignedIn ? 'community-home-signed-in' : 'community-home-guest'}`}>
      <section className="community-hero">
        <div className="community-hero-copy">
          <span className="community-pill"><i className="fa-solid fa-house-chimney-window" aria-hidden="true" /> Northline RP community portal</span>
          <h1>{hasSignedIn ? `Welcome back, ${displayName}.` : 'Welcome to Northline. Come hang out.'}</h1>
          <p>
            {hasSignedIn
              ? `Your ${role} profile is connected. Check your character, catch up on city nonsense, or jump into Tweeter before heading in-game.`
              : 'A relaxed companion site for the Northline community: live city stats, public profiles, guides, status, and enough chaos to make checking in worth it.'}
          </p>

          <div className="community-hero-actions">
            {hasSignedIn ? (
              <>
                <Link className="button button-primary community-main-button" href="/dashboard"><i className="fa-solid fa-id-card" aria-hidden="true" /> Open your dashboard</Link>
                <Link className="button button-soft" href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> Browse Tweeter</Link>
                <Link className="button button-ghost" href={`/tweeter/profile/${steamId}`}>Public profile</Link>
              </>
            ) : (
              <>
                <a className="button button-primary community-main-button" href="/api/auth/steam?returnTo=/dashboard"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</a>
                <Link className="button button-soft" href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> Peek at Tweeter</Link>
                <a className="button button-ghost" href={config.server.discordUrl}>Join Northline Discord</a>
              </>
            )}
          </div>

          {loginFailed ? <p className="community-alert danger">Steam sign-in failed. Check SITE_URL, Caddy forwarding headers, and the callback URL.</p> : null}
          {loggedOut ? <p className="community-alert success">You have been signed out. Come back when the city needs you.</p> : null}
        </div>

        <aside className="community-hero-card">
          <div className={`community-mood ${mood.tone}`}>
            <span><i className={mood.icon} aria-hidden="true" /></span>
            <div>
              <strong>{mood.label}</strong>
              <small>{mood.body}</small>
            </div>
          </div>
          <div className="community-online-meter">
            <div><strong>{population.onlineCount}</strong><span>online now</span></div>
            <div><strong>{maxPlayers}</strong><span>slots</span></div>
          </div>
          <div className="community-meter-bar"><span style={{ width: `${Math.min(100, maxPlayers ? (population.onlineCount / maxPlayers) * 100 : 0)}%` }} /></div>
          {hasSignedIn ? (
            <div className="community-player-chip">
              <UserAvatar src={avatar} name={displayName} size="md" />
              <div>
                <strong>{displayName}</strong>
                <span>{duration(playtimeSeconds)} played · {playerDeaths} deaths</span>
              </div>
            </div>
          ) : (
            <div className="community-guest-start">
              <strong>New here?</strong>
              <span>Start with Steam if you already play here, or hop into Discord if you are still checking the place out.</span>
              <div>
                <a href="/api/auth/steam?returnTo=/dashboard"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in</a>
                <Link href="/guides"><i className="fa-solid fa-book-open-reader" aria-hidden="true" /> Guides</Link>
              </div>
            </div>
          )}
        </aside>
      </section>

      <section className="community-feature-hub" aria-labelledby="community-feature-hub-title">
        <div className="community-section-heading inline">
          <div>
            <span className="community-kicker">Around the portal</span>
            <h2 id="community-feature-hub-title">Pick what you need.</h2>
          </div>
          <span className="feature-hub-note">Most-used stops are up top; the bigger shortcuts live here.</span>
        </div>
        <div className="community-feature-grid">
          <Link className="community-feature-card primary" href="/cases">
            <span className="feature-card-icon"><i className="fa-solid fa-gift" aria-hidden="true" /></span>
            <div>
              <strong>{hasSignedIn ? 'Claim your daily case' : 'Daily cases'}</strong>
              <p>{hasSignedIn ? 'Check in once a day, stash cases, and open them whenever you feel lucky.' : 'Sign in with Steam to start collecting free daily cases. No payment, no nonsense.'}</p>
            </div>
          </Link>
          <Link className="community-feature-card" href="/leaderboards">
            <span className="feature-card-icon"><i className="fa-solid fa-ranking-star" aria-hidden="true" /></span>
            <div><strong>Leaderboards</strong><p>See who opted into public bragging rights for money, time, posts, progress, and more.</p></div>
          </Link>
          <Link className="community-feature-card" href="/players">
            <span className="feature-card-icon"><i className="fa-solid fa-users" aria-hidden="true" /></span>
            <div><strong>Public citizens</strong><p>Browse the people who claimed a profile and chose to show up on the board.</p></div>
          </Link>
          <Link className="community-feature-card" href="/guides">
            <span className="feature-card-icon"><i className="fa-solid fa-book-open-reader" aria-hidden="true" /></span>
            <div><strong>Getting settled</strong><p>Not sure what to do next? The guide page tracks your onboarding path.</p></div>
          </Link>
          <Link className="community-feature-card" href="/support">
            <span className="feature-card-icon"><i className="fa-solid fa-life-ring" aria-hidden="true" /></span>
            <div><strong>Need help?</strong><p>Find Discord, bug-report, appeal, privacy, and account help without digging around.</p></div>
          </Link>
        </div>
      </section>

      <CommunityHomeLiveStats initialSnapshot={initialLiveSnapshot} signedIn={hasSignedIn} />

      <section className="community-card ape-tavern-callout">
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
            <div className="ape-tavern-pills" aria-label="Ape Tavern highlights">
              <span>Northbound RP</span>
              <span>S&box creators</span>
              <span>Community-driven</span>
            </div>
          </div>

          <div className="ape-tavern-actions">
            <a className="button button-primary" href="https://discord.gg/VExsvp4PXT" target="_blank" rel="noreferrer"><i className="fa-brands fa-discord" aria-hidden="true" /> Join Northbound RP Discord</a>
            <Link className="button button-soft" href="/guides"><i className="fa-solid fa-book-open-reader" aria-hidden="true" /> Learn the basics</Link>
            <small>Made with appreciation for the team building the game we all goof around in.</small>
          </div>
        </div>
      </section>

      {hasSignedIn ? (
        <section className="community-card personal-board">
          <div className="community-section-heading inline">
            <div>
              <span className="community-kicker">Signed-in citizen panel</span>
              <h2>A few things about you</h2>
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

      <section className="community-lower-grid">
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
            )) : <div><strong>No staff notices posted</strong><span>When something important happens, it will land here.</span><small>Quiet is good sometimes.</small></div>}
            <div>
              <strong>{overview.propertyLayouts.toLocaleString()} saved property layouts</strong>
              <span>Citizens are already decorating, building storefronts, or committing interior design crimes.</span>
              <small>{overview.propertyProps.toLocaleString()} saved props</small>
            </div>
            <div>
              <strong>{overview.bans.active.toLocaleString()} active public ban record{overview.bans.active === 1 ? '' : 's'}</strong>
              <span>Public ban records are visible so people can see what happened without needing to ask around.</span>
              <small><Link href="/bans">View ban list</Link></small>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
