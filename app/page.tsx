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
  getRoleForSteamId,
  getServerConfig,
  getTweets,
} from '@/lib/ape-data';
import { getCommunityProfile, getStatusUpdates } from '@/lib/community-data';
import { duration, fullDate, money, relativeFromDate } from '@/lib/format';
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

function topDeathLabel(total: number) {
  if (total <= 0) return 'Nobody has died yet. Suspiciously peaceful.';
  if (total === 1) return 'Only one documented death so far. The city remembers.';
  return `${total.toLocaleString()} documented ways Northline citizens learned consequences.`;
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
  const topDeath = deathSummary.categories.find((category) => category.count > 0) ?? deathSummary.categories[0];
  const topVictim = deathSummary.topVictims[0];
  const recentFatal = damageLogs.find((log) => Boolean(log.IsFatal));

  const cityFacts: MiniFact[] = [
    { icon: 'fa-solid fa-users', label: 'Unique citizens', value: overview.players.toLocaleString(), body: 'Saved characters known by the city.', href: '/players' },
    { icon: 'fa-solid fa-skull-crossbones', label: 'Total deaths', value: deathSummary.total.toLocaleString(), body: topDeathLabel(deathSummary.total) },
    { icon: 'fa-solid fa-heart-crack', label: 'Damage events', value: deathSummary.damageEvents.toLocaleString(), body: 'Every bonk, fall, shot, and bad life choice we could read.' },
    { icon: 'fa-brands fa-twitter', label: 'Tweeter posts', value: overview.tweets.toLocaleString(), body: 'The in-city social feed, mirrored to the web.', href: '/tweeter' },
    { icon: 'fa-solid fa-couch', label: 'Saved layouts', value: overview.propertyLayouts.toLocaleString(), body: `${overview.propertyProps.toLocaleString()} props placed across saved homes and businesses.` },
    { icon: 'fa-solid fa-wallet', label: 'City funds', value: money(overview.totalCash + overview.totalBank), body: 'Aggregate cash and bank value from saved characters.' },
  ];

  const personalFacts = hasSignedIn ? signedInFacts({ role, playerDeaths, guidePercent, playtimeSeconds, level }) : [];

  return (
    <main className={`community-home ${hasSignedIn ? 'community-home-signed-in' : 'community-home-guest'}`}>
      <section className="community-hero">
        <div className="community-hero-copy">
          <span className="community-pill"><i className="fa-solid fa-house-chimney-window" aria-hidden="true" /> Northline RP community portal</span>
          <h1>{hasSignedIn ? `Welcome back, ${displayName}.` : 'Welcome to Northline. Try not to die thirsty.'}</h1>
          <p>
            {hasSignedIn
              ? `Your ${role} profile is connected. Check your character, catch up on city nonsense, or jump into Tweeter before heading in-game.`
              : 'A homegrown companion site for Northbound RP: city gossip, citizen stats, public profiles, guides, status, and the occasional evidence that gravity remains undefeated.'}
          </p>

          <div className="community-hero-actions">
            {hasSignedIn ? (
              <>
                <Link className="button button-primary community-main-button" href="/dashboard"><i className="fa-solid fa-id-card" aria-hidden="true" /> Open your dashboard</Link>
                <Link className="button button-soft" href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> Browse Tweeter</Link>
                <Link className="button button-ghost" href={`/u/${steamId}`}>Public profile</Link>
              </>
            ) : (
              <>
                <Link className="button button-primary community-main-button" href="/api/auth/steam?returnTo=/dashboard"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</Link>
                <Link className="button button-soft" href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> Peek at Tweeter</Link>
                <a className="button button-ghost" href={config.server.discordUrl}>Join Discord</a>
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
            <p>Sign in to turn this card into your personal citizen snapshot.</p>
          )}
        </aside>
      </section>

      <section className="community-stat-strip" aria-label="Northline city stats">
        {cityFacts.map((fact) => {
          const content = (
            <>
              <i className={fact.icon} aria-hidden="true" />
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
              <small>{fact.body}</small>
            </>
          );
          return fact.href ? <Link className="community-stat-card" href={fact.href} key={fact.label}>{content}</Link> : <article className="community-stat-card" key={fact.label}>{content}</article>;
        })}
      </section>

      <section className="community-main-grid">
        <article className="community-card death-board">
          <div className="community-section-heading">
            <span className="community-kicker">City chaos report</span>
            <h2>How are people dying?</h2>
            <p>{topDeath?.count ? `${topDeath.label} is currently leading the scoreboard.` : 'No fatal damage has been recorded yet.'}</p>
          </div>

          <div className="death-grid">
            {deathSummary.categories.slice(0, 6).map((category) => (
              <div className={`death-tile ${category.count > 0 ? 'has-count' : ''}`} key={category.key}>
                <i className={category.icon} aria-hidden="true" />
                <strong>{category.count.toLocaleString()}</strong>
                <span>{category.label}</span>
                <small>{category.body}</small>
              </div>
            ))}
          </div>

          <div className="community-mini-list death-notes">
            {topVictim ? <div><span>Most unlucky lately</span><strong>{topVictim.name}</strong><small>{topVictim.count} recorded death{topVictim.count === 1 ? '' : 's'}</small></div> : null}
            {recentFatal ? <div><span>Latest fatal event</span><strong>{recentFatal.Cause || 'Unknown'}</strong><small>{recentFatal.VictimName || 'Someone'} · {relativeFromDate(recentFatal.Timestamp)}</small></div> : null}
            {deathSummary.topCauses[0] ? <div><span>Top raw cause</span><strong>{deathSummary.topCauses[0].cause}</strong><small>{deathSummary.topCauses[0].count} event{deathSummary.topCauses[0].count === 1 ? '' : 's'}</small></div> : null}
          </div>
        </article>

        <aside className="community-card community-now-card">
          <div className="community-section-heading compact">
            <span className="community-kicker">What to do first</span>
            <h2>{hasSignedIn ? 'Your quick stops' : 'New here?'}</h2>
          </div>
          <div className="community-action-list">
            <Link href={hasSignedIn ? '/dashboard' : '/api/auth/steam?returnTo=/dashboard'}><i className="fa-solid fa-id-card" aria-hidden="true" /><strong>{hasSignedIn ? 'Open dashboard' : 'Link Steam'}</strong><span>{hasSignedIn ? 'Privacy, character, profile, and theme controls.' : 'Unlock your character dashboard and public profile settings.'}</span></Link>
            <Link href="/guides"><i className="fa-solid fa-book-open-reader" aria-hidden="true" /><strong>Read the starter guides</strong><span>Rules, economy, properties, and the basics.</span></Link>
            <Link href="/status"><i className="fa-solid fa-signal" aria-hidden="true" /><strong>Check the city status</strong><span>Server availability without the scary server-room jargon.</span></Link>
            <Link href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /><strong>Open Tweeter</strong><span>Posts, threads, profiles, and website-safe likes.</span></Link>
          </div>
        </aside>
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
              <span>Public-safe moderation visibility without exposing private staff notes.</span>
              <small><Link href="/bans">View ban list</Link></small>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
