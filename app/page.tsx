import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';
import {
  getBanRecords,
  getCitizenName,
  getCityOverview,
  getDataHealth,
  getPlayer,
  getPlayersBySteamId,
  getPopulationSummary,
  getRoleForSteamId,
  getServerConfig,
  getTweets,
} from '@/lib/ape-data';
import { getCommunityProfile, getMetricSamples, getStatusUpdates } from '@/lib/community-data';
import { duration, fullDate, money, relativeFromDate } from '@/lib/format';
import { getSessionSteamId } from '@/lib/session';
import { getSiteConfig } from '@/lib/site-config';
import { getSteamProfile, getSteamProfiles } from '@/lib/steam-openid';

export const dynamic = 'force-dynamic';

type PageSearchParams = { login?: string | string[]; loggedOut?: string | string[]; [key: string]: string | string[] | undefined };

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function stateLabel(healthExists: boolean, online: number, latestEventAt: string | null) {
  if (!healthExists) return { label: 'Data unavailable', tone: 'danger', body: 'The website cannot read Northbound RP files right now.' };
  if (online > 0) return { label: 'City active', tone: 'success', body: `${online} ${online === 1 ? 'player is' : 'players are'} connected right now.` };
  if (latestEventAt) return { label: 'City quiet', tone: 'warning', body: `Last server activity was ${relativeFromDate(latestEventAt)}.` };
  return { label: 'Awaiting activity', tone: 'neutral', body: 'Server files are connected and waiting for fresh activity.' };
}

function dashboardBody(role: string, guidePercent: number | null) {
  if (guidePercent !== null && guidePercent < 100) return `Your ${role} profile is ready. You still have onboarding progress to finish.`;
  return `Your ${role} profile is connected and ready.`;
}

export default async function HomePage({ searchParams }: { searchParams?: Promise<PageSearchParams> }) {
  const [config, health, params, steamId, population, tweets, playersBySteam, serverConfig, updates, samples, bans, overview] = await Promise.all([
    getSiteConfig(),
    getDataHealth(),
    searchParams ?? Promise.resolve({} as PageSearchParams),
    getSessionSteamId(),
    getPopulationSummary(),
    getTweets(),
    getPlayersBySteamId(),
    getServerConfig(),
    getStatusUpdates(2),
    getMetricSamples(24),
    getBanRecords(),
    getCityOverview(),
  ]);

  const [player, communityProfile, steamProfile, role] = steamId
    ? await Promise.all([getPlayer(steamId), getCommunityProfile(steamId), getSteamProfile(steamId), getRoleForSteamId(steamId)])
    : [null, null, null, 'Guest'] as const;

  const status = stateLabel(health.exists, population.onlineCount, population.latestEventAt);
  const latestMetric = samples.at(-1);
  const latestTweets = tweets.slice(0, 2);
  const latestBans = bans.slice(0, 1);
  const steamIds = new Set<string>();
  for (const tweet of latestTweets) steamIds.add(String(tweet.AuthorSteamId));
  for (const ban of latestBans) steamIds.add(ban.steamId);
  const steamProfiles = await getSteamProfiles([...steamIds]);
  const loginFailed = getSingleParam(params.login) === 'failed';
  const loggedOut = getSingleParam(params.loggedOut) === '1';
  const maxPlayers = serverConfig.MaxPlayers ?? config.server.maxPlayersFallback;
  const displayName = steamId ? getCitizenName(player, steamId) : 'Guest';
  const avatar = communityProfile?.customAvatarUrl || steamProfile?.avatarFull || steamProfile?.avatarMedium || null;
  const guidePercentRaw = Number((player as { GuideProgressPercent?: unknown } | null)?.GuideProgressPercent);
  const guidePercent = Number.isFinite(guidePercentRaw) ? guidePercentRaw : null;
  const hasSignedIn = Boolean(steamId);

  const featureCards = [
    { href: hasSignedIn ? '/dashboard' : '/api/auth/steam?returnTo=/dashboard', icon: 'fa-solid fa-id-card', title: hasSignedIn ? 'Open dashboard' : 'Link your Steam', body: hasSignedIn ? 'Manage your profile, privacy, guides, properties, and character overview.' : 'Connect Steam to unlock your character dashboard and profile tools.' },
    { href: '/tweeter', icon: 'fa-brands fa-twitter', title: 'Browse Tweeter', body: 'Follow city chatter, open threads, like posts, and view public citizen profiles.' },
    { href: '/status', icon: 'fa-solid fa-signal', title: 'Check status', body: 'See server availability, staff notices, maintenance context, and data health.' },
    { href: '/guides', icon: 'fa-solid fa-book-open', title: 'Read guides', body: 'Learn the city, economy, roleplay expectations, property flow, and new-player basics.' },
  ];

  return (
    <main className={`home-page redesigned-home ${hasSignedIn ? 'home-signed-in' : 'home-guest'}`}>
      <section className="home-hero-v2">
        <div className="home-hero-copy-v2">
          <span className="eyebrow"><i /> {hasSignedIn ? 'Steam connected' : `Northline RP · ${config.server.modeLabel}`}</span>
          <h1>{hasSignedIn ? `Welcome back, ${displayName}.` : config.home.headline}</h1>
          <p>{hasSignedIn ? dashboardBody(role, guidePercent) : config.home.intro}</p>
          <div className="button-row home-hero-actions">
            {hasSignedIn ? (
              <>
                <Link className="button button-primary" href="/dashboard">Open dashboard</Link>
                <Link className="button button-soft" href={`/u/${steamId}`}>View profile</Link>
                <Link className="button button-ghost" href="/tweeter">Open Tweeter</Link>
              </>
            ) : (
              <>
                <Link className="button button-primary" href="/api/auth/steam?returnTo=/dashboard"><i className="fa-brands fa-steam" aria-hidden="true" /> {config.home.primaryCta}</Link>
                <Link className="button button-soft" href="/tweeter">Preview Tweeter</Link>
                <a className="button button-ghost" href={config.server.discordUrl}>Join Discord</a>
              </>
            )}
          </div>
          {loginFailed ? <p className="notice danger">Steam sign-in failed. Check SITE_URL, Caddy forwarding headers, and Steam OpenID callback reachability.</p> : null}
          {loggedOut ? <p className="notice success">You have been signed out.</p> : null}
        </div>

        <aside className="home-identity-card card">
          {hasSignedIn ? (
            <>
              <div className="home-identity-topline">
                <UserAvatar src={avatar} name={displayName} size="lg" />
                <div>
                  <strong>{displayName}</strong>
                  <span>{steamProfile?.personaName ? `Steam: ${steamProfile.personaName}` : steamId}</span>
                </div>
              </div>
              <p>{role} · {duration(Number(player?.TotalPlaytimeSeconds ?? 0))} in city</p>
              <div className="home-identity-actions">
                <Link href="/dashboard">Dashboard</Link>
                <Link href={`/tweeter/profile/${steamId}`}>Tweeter profile</Link>
                {steamProfile?.profileUrl ? <a href={steamProfile.profileUrl} target="_blank" rel="noreferrer"><i className="fa-brands fa-steam" aria-hidden="true" /> Steam</a> : null}
              </div>
            </>
          ) : (
            <>
              <div className="pulse-topline"><span className={`status-dot ${status.tone}`} />{status.label}</div>
              <strong className="home-online-count">{population.onlineCount}/{maxPlayers}</strong>
              <p>{status.body}</p>
            </>
          )}
          <dl className="home-quick-metrics">
            <div><dt>Citizens</dt><dd>{overview.players.toLocaleString()}</dd></div>
            <div><dt>Tweeter posts</dt><dd>{overview.tweets.toLocaleString()}</dd></div>
            <div><dt>Layouts</dt><dd>{overview.propertyLayouts.toLocaleString()}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="home-action-grid" aria-label="Northline shortcuts">
        {featureCards.map((card) => (
          <Link className="home-action-card" href={card.href} key={card.title}>
            <span><i className={card.icon} aria-hidden="true" /></span>
            <strong>{card.title}</strong>
            <small>{card.body}</small>
          </Link>
        ))}
      </section>

      <section className="home-snapshot-grid">
        <article className="card home-feed-preview">
          <div className="section-heading inline"><div><span className="kicker">City feed</span><h2>Latest Tweeter posts</h2></div><Link href="/tweeter">Open Tweeter</Link></div>
          <div className="stack-list home-condensed-list">
            {latestTweets.length ? latestTweets.map((tweet) => {
              const authorSteamId = String(tweet.AuthorSteamId);
              const authorPlayer = playersBySteam.get(authorSteamId);
              const authorProfile = steamProfiles.get(authorSteamId);
              const authorName = tweet.AuthorDisplayName || authorPlayer?.RpDisplayName || authorPlayer?.LastKnownDisplayName || authorProfile?.personaName || `Citizen ${authorSteamId.slice(-8)}`;
              return (
                <Link className="home-post-row" href={`/tweeter/tweet/${tweet.Id}`} key={tweet.Id}>
                  <strong>{authorName}</strong>
                  <span>{tweet.Body}</span>
                  <small>{tweet.PostedAtTimeSeconds ? fullDate(new Date(tweet.PostedAtTimeSeconds * 1000)) : 'Unknown time'} · {tweet.LikeCount ?? 0} likes</small>
                </Link>
              );
            }) : <div><strong>No posts yet</strong><span>In-game Tweeter posts will appear here.</span></div>}
          </div>
        </article>

        <article className="card home-status-card">
          <div className="section-heading"><span className="kicker">Server pulse</span><h2>{status.label}</h2><p>{status.body}</p></div>
          <dl className="metric-grid compact">
            <div><dt>Online</dt><dd>{population.onlineCount}/{maxPlayers}</dd></div>
            <div><dt>Known citizens</dt><dd>{overview.players.toLocaleString()}</dd></div>
            <div><dt>Total playtime</dt><dd>{duration(overview.totalPlaytime)}</dd></div>
            <div><dt>Data</dt><dd>{health.exists ? 'Connected' : 'Missing'}</dd></div>
          </dl>
        </article>

        <article className="card home-news-card">
          <div className="section-heading"><span className="kicker">What changed</span><h2>Community updates</h2></div>
          <div className="stack-list compact-stack">
            {updates.length ? updates.map((update) => <div key={update.id}><strong>{update.title}</strong><span>{update.body}</span><small>{relativeFromDate(update.createdAt)} by {update.createdByName}</small></div>) : <div><strong>No notices posted</strong><span>Staff announcements will appear here.</span></div>}
            {latestMetric ? <div><strong>Website telemetry</strong><span>Latest RAM sample: {latestMetric.processRamMb} MB</span><small>Status page tracks operational context.</small></div> : null}
          </div>
        </article>
      </section>

      <section className="home-civic-row">
        <article className="card home-civic-card">
          <span className="kicker">Economy</span>
          <h2>{money(overview.totalCash + overview.totalBank)} tracked city funds</h2>
          <p>Public pages keep sensitive player data opt-in. Each citizen controls whether economy, inventory, stats, properties, and activity appear on their profile.</p>
          <Link href={hasSignedIn ? '/dashboard' : '/support'}>{hasSignedIn ? 'Adjust privacy settings' : 'Learn about the portal'}</Link>
        </article>
        <article className="card home-civic-card">
          <span className="kicker">Community trust</span>
          <h2>{overview.bans.active.toLocaleString()} active public moderation records</h2>
          <p>Ban visibility stays public-safe while private staff notes, evidence logs, phone messages, and sensitive moderation context stay restricted.</p>
          <Link href="/bans">View public bans</Link>
        </article>
      </section>
    </main>
  );
}
