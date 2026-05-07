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
import { getPublicJobsState } from '@/lib/jobs-data';

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

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function cityMood(status: Awaited<ReturnType<typeof getServerRuntimeStatus>>, online: number, latestEventAt: string | null, dataConnected: boolean) {
  if (!dataConnected || status.state === 'data_missing') return { label: 'The wires are crossed', body: 'The portal cannot read the city files right now.', icon: 'fa-solid fa-plug-circle-xmark', tone: 'danger' };
  if (status.state === 'offline') return { label: 'Server looks offline', body: status.lastSignalAt ? `Last visible signal was ${relativeFromDate(status.lastSignalAt)}.` : 'No fresh server signal is visible right now.', icon: 'fa-solid fa-power-off', tone: 'danger' };
  if (online >= 8) return { label: 'The city is loud', body: `${online} citizens are currently making questionable decisions.`, icon: 'fa-solid fa-volume-high', tone: 'success' };
  if (online > 0) return { label: 'People are outside', body: `${online} ${online === 1 ? 'citizen is' : 'citizens are'} online right now.`, icon: 'fa-solid fa-person-walking', tone: 'success' };
  if (status.state === 'quiet' || status.state === 'online') return { label: 'Online but quiet', body: latestEventAt ? `Last activity was ${relativeFromDate(latestEventAt)}.` : 'The server is online, but nobody is showing online.', icon: 'fa-solid fa-moon', tone: 'warning' };
  return { label: 'Status unclear', body: 'The portal cannot confidently confirm the game server state right now.', icon: 'fa-solid fa-circle-question', tone: 'warning' };
}

function compactPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function hasUnreadJobApplicationUpdate(application: { applicantViewedAt?: string | null; updatedAt: string; status: string; notes: Array<{ createdAt: string }> }) {
  if (!application.applicantViewedAt) return application.notes.length > 0 || application.status !== 'submitted';
  const viewed = new Date(application.applicantViewedAt).getTime();
  const latest = Math.max(new Date(application.updatedAt).getTime(), ...application.notes.map((note) => new Date(note.createdAt).getTime()));
  return Number.isFinite(latest) && latest > viewed;
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
  const forumVisible = enabledFeatures.has('forum');
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
  const mood = cityMood(runtime, runtime.playerCount ?? population.onlineCount, runtime.lastSignalAt ?? population.latestEventAt, health.exists);
  const homeOnlineDisplay = runtime.state === 'offline' ? 'Offline' : (runtime.state === 'data_missing' || runtime.state === 'unknown') ? 'Checking' : String(runtime.playerCount ?? population.onlineCount);
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
  const jobsState = jobsVisible ? await getPublicJobsState(steamId) : null;
  const activeJobPostings = jobsState?.postings ?? [];
  const applicantApplications = jobsState?.applications ?? [];
  const unreadJobApplications = applicantApplications.filter(hasUnreadJobApplicationUpdate);
  const unreadJobApplication = unreadJobApplications[0] ?? null;
  const openApplicantApplication = applicantApplications.find((application) => ['submitted', 'under_review', 'approved'].includes(application.status));

  return (
    <main className={`community-home ${hasSignedIn ? 'community-home-signed-in' : 'community-home-guest'}`}>
      <section className="community-hero">
        <div className="community-hero-copy">
          <span className="community-pill"><i className="fa-solid fa-house-chimney-window" aria-hidden="true" /> Northline RP community portal</span>
          <h1>{hasSignedIn ? `Welcome back, ${displayName}.` : 'Welcome to Northline. Come hang out.'}</h1>
          <p>
            {hasSignedIn
              ? `Your ${role} profile is connected. Check your character, tune your profile, and catch up on the city before heading in-game.`
              : 'A relaxed companion site for Northline RP: live city status, public profiles, guides, city chatter, and the chaos board that keeps receipts.'}
          </p>

          <div className="community-hero-actions">
            {hasSignedIn ? (
              <>
                <Link className="button button-primary community-main-button" href="/dashboard"><i className="fa-solid fa-id-card" aria-hidden="true" /> Open your dashboard</Link>
                {tweeterVisible ? <Link className="button button-soft" href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> Browse Tweeter</Link> : null}
                {tweeterVisible ? <Link className="button button-ghost" href={`/tweeter/profile/${steamId}`}>Public profile</Link> : null}
              </>
            ) : (
              <>
                <a className="button button-primary community-main-button" href="/api/auth/steam?returnTo=/dashboard"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</a>
                {tweeterVisible ? <Link className="button button-soft" href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> Peek at Tweeter</Link> : null}
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
            <div><strong>{homeOnlineDisplay}</strong><span>{runtime.state === 'offline' || runtime.state === 'data_missing' || runtime.state === 'unknown' ? 'server status' : 'online now'}</span></div>
            <div><strong>{maxPlayers}</strong><span>slots</span></div>
          </div>
          <div className="community-meter-bar"><span style={{ width: `${runtime.state === 'offline' ? 0 : Math.min(100, maxPlayers ? ((runtime.playerCount ?? population.onlineCount) / maxPlayers) * 100 : 0)}%` }} /></div>
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
                {guidesVisible ? <Link href="/guides"><i className="fa-solid fa-book-open-reader" aria-hidden="true" /> Guides</Link> : null}
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
        </div>
        <div className="community-feature-grid">
          {dailyDropsVisible ? (
            <Link className="community-feature-card primary" href="/cases">
              <span className="feature-card-icon"><i className="fa-solid fa-gift" aria-hidden="true" /></span>
              <div>
                <strong>{hasSignedIn ? 'Claim your daily drop' : 'Daily drops'}</strong>
                <p>{hasSignedIn ? 'Check in once a day, stash cases, and open them whenever you feel lucky.' : 'Sign in with Steam to start collecting free daily drops. No payment, no nonsense.'}</p>
              </div>
            </Link>
          ) : null}
          {leaderboardsVisible ? (
            <Link className="community-feature-card" href="/leaderboards">
              <span className="feature-card-icon"><i className="fa-solid fa-ranking-star" aria-hidden="true" /></span>
              <div><strong>Leaderboards</strong><p>See public rankings for citizens who chose to show up on the boards.</p></div>
            </Link>
          ) : null}
          {playersVisible ? (
            <Link className="community-feature-card" href="/players">
              <span className="feature-card-icon"><i className="fa-solid fa-users" aria-hidden="true" /></span>
              <div><strong>Public citizens</strong><p>Find claimed profiles and the people you keep running into.</p></div>
            </Link>
          ) : null}
          {guidesVisible ? (
            <Link className="community-feature-card" href="/guides">
              <span className="feature-card-icon"><i className="fa-solid fa-book-open-reader" aria-hidden="true" /></span>
              <div><strong>Getting settled</strong><p>Need a nudge? Guides can show your next useful step.</p></div>
            </Link>
          ) : null}
          {supportVisible ? (
            <Link className="community-feature-card" href="/support">
              <span className="feature-card-icon"><i className="fa-solid fa-life-ring" aria-hidden="true" /></span>
              <div><strong>Need help?</strong><p>Support links for bugs, account trouble, moderation questions, and Discord.</p></div>
            </Link>
          ) : null}
          {jobsVisible ? (
            <Link className="community-feature-card" href="/jobs">
              <span className="feature-card-icon"><i className="fa-solid fa-briefcase" aria-hidden="true" /></span>
              <div><strong>Staff applications</strong><p>Browse open staff roles and submit a guided application when hiring is live.</p></div>
            </Link>
          ) : null}
          {forumVisible ? (
            <Link className="community-feature-card" href="/forum">
              <span className="feature-card-icon"><i className="fa-solid fa-comments" aria-hidden="true" /></span>
              <div><strong>Forum</strong><p>Start discussions, read announcements, and bridge replies with the Discord forum channel.</p></div>
            </Link>
          ) : null}
        </div>
      </section>

      {hasSignedIn && jobsVisible && activeJobPostings.length ? (
        <section className={`community-card home-staff-applications-callout ${unreadJobApplications.length ? 'has-update' : ''}`}>
          {unreadJobApplications.length ? (
            <div className="home-staff-applications-update"><i className="fa-solid fa-bell" aria-hidden="true" /><strong>{unreadJobApplications.length === 1 ? 'Your staff application has an update.' : `You have ${unreadJobApplications.length} staff application updates.`}</strong></div>
          ) : null}
          <div className="home-staff-applications-copy">
            <span className="community-kicker">Staff applications</span>
            <h2>{unreadJobApplication ? 'Staff left something for you.' : openApplicantApplication ? 'Your staff application is being tracked.' : 'Staff applications are open.'}</h2>
            <p>{unreadJobApplication ? `${unreadJobApplication.jobTitle} has a new status or applicant-visible note. Open My Applications to review it.` : openApplicantApplication ? `${openApplicantApplication.jobTitle} is currently ${openApplicantApplication.status.replace('_', ' ')}. Open the mini-app to review your answers and staff notes.` : `There ${activeJobPostings.length === 1 ? 'is' : 'are'} ${activeJobPostings.length} active posting${activeJobPostings.length === 1 ? '' : 's'} available right now. Start with the role that fits you best.`}</p>
          </div>
          <div className="home-staff-applications-list">
            {activeJobPostings.slice(0, 3).map((posting) => (
              <Link className="home-staff-applications-role" href="/jobs/open" key={posting.id}>
                <i className={posting.icon} aria-hidden="true" />
                <span><strong>{posting.title}</strong><small>{posting.department} · {posting.commitment}</small></span>
              </Link>
            ))}
          </div>
          <Link className="button button-primary" href={unreadJobApplications.length ? '/jobs/applications' : '/jobs'}><i className="fa-solid fa-briefcase" aria-hidden="true" /> {unreadJobApplications.length ? 'Review update' : 'Open applications'}</Link>
        </section>
      ) : null}

      <CommunityHomeLiveStats initialSnapshot={initialLiveSnapshot} signedIn={hasSignedIn} featureVisibility={{ players: playersVisible, guides: guidesVisible, status: statusVisible, tweeter: tweeterVisible }} />

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
          </div>

          <div className="ape-tavern-actions">
            <a className="button button-primary" href="https://discord.gg/VExsvp4PXT" target="_blank" rel="noreferrer"><i className="fa-brands fa-discord" aria-hidden="true" /> Join Northbound RP Discord</a>
            {guidesVisible ? <Link className="button button-soft" href="/guides"><i className="fa-solid fa-book-open-reader" aria-hidden="true" /> Learn the basics</Link> : null}
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
