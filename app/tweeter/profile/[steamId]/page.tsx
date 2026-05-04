import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProfileShowcasePanels } from '@/components/ProfileShowcasePanels';
import { UserAvatar } from '@/components/UserAvatar';
import { TweeterLikeButton } from '@/components/TweeterLikeButton';
import { getPlayer, getPropertyLayoutsForSteamId, getRoleForSteamId } from '@/lib/ape-data';
import { getCommunityProfile } from '@/lib/community-data';
import { buildPublicProfileView, type PublicProfileView } from '@/lib/profile-view';
import { getSessionSteamId } from '@/lib/session';
import { buildTweeterPayload, buildTweeterUser, type TweetView } from '@/lib/tweeter-view';

export const dynamic = 'force-dynamic';

type SearchParams = {
  tab?: string | string[];
};

type Params = {
  params: Promise<{ steamId: string }>;
  searchParams?: Promise<SearchParams>;
};

type ProfileTab = 'tweets' | 'replies' | 'info';

function cleanTab(value: unknown): ProfileTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'replies' || raw === 'info') return raw;
  return 'tweets';
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function formatTweetTime(seconds: number) {
  if (!seconds) return 'Just now';
  const date = new Date(seconds * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function splitHashtags(body: string) {
  const parts = body.split(/(#[a-z0-9_]+)/gi);
  return parts.map((part, index) => part.startsWith('#')
    ? <span className="tweeter-hashtag" key={`${part}-${index}`}>{part}</span>
    : <span key={`${part}-${index}`}>{part}</span>);
}

function verifiedBadge(kind?: string) {
  if (!kind || kind === 'None') return null;
  return <span className="tweeter-verified" title={kind} aria-label={kind}><span className="verified-check">✓</span></span>;
}

function ProfileTweet({ tweet, signedIn }: { tweet: TweetView; signedIn: boolean }) {
  return (
    <article className="tweet-card-v2">
      <div className="tweet-card-avatar"><UserAvatar src={tweet.avatarUrl ?? null} name={tweet.authorDisplayName} size="md" /></div>
      <div className="tweet-card-body">
        <div className="tweet-card-header">
          <div className="tweet-card-authorline">
            <Link href={`/tweeter/profile/${tweet.authorSteamId}`} className="tweet-author-link"><strong>{tweet.authorDisplayName}</strong>{verifiedBadge(tweet.verifiedKind)}</Link>
            <span>{tweet.handle}</span><span>·</span><span>{formatTweetTime(tweet.postedAtTimeSeconds)}</span>
          </div>
        </div>
        {tweet.isRetweet && tweet.retweetOfBody ? <blockquote className="tweet-quoted-card">{tweet.retweetOfAuthorDisplayName}: {tweet.retweetOfBody}</blockquote> : null}
        <Link href={`/tweeter/tweet/${tweet.id}`} className="tweet-card-text">{splitHashtags(tweet.body)}</Link>
        <footer className="tweet-actions-row">
          <Link href={`/tweeter/tweet/${tweet.id}`}><span>💬</span><small>{tweet.replyCount || ''}</small></Link>
          <button type="button" disabled title="Reposts require the future game bridge."><span>↻</span><small>{tweet.retweetCount || ''}</small></button>
          <TweeterLikeButton tweetId={tweet.id} initialLiked={tweet.likedByMe} initialCount={tweet.likeCount} signedIn={signedIn} />
          <Link href={`/tweeter/tweet/${tweet.id}`}><span>↗</span></Link>
        </footer>
      </div>
    </article>
  );
}

function ProfileTabs({ steamId, active }: { steamId: string; active: ProfileTab }) {
  const tabs: Array<{ id: ProfileTab; label: string }> = [
    { id: 'tweets', label: 'Tweets' },
    { id: 'replies', label: 'Replies' },
    { id: 'info', label: 'Info' },
  ];
  return (
    <nav className="tweeter-profile-tabs" aria-label="Profile tabs">
      {tabs.map((tab) => (
        <Link className={active === tab.id ? 'active' : ''} href={`/tweeter/profile/${steamId}${tab.id === 'tweets' ? '' : `?tab=${tab.id}`}`} key={tab.id}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function ProfileInfoTab({
  profile,
  user,
  posts,
  originals,
  replies,
}: {
  profile: PublicProfileView;
  user: Awaited<ReturnType<typeof buildTweeterUser>>;
  posts: number;
  originals: number;
  replies: number;
}) {
  const hasAnyModule = Boolean(profile.economy || profile.inventory || profile.stats || profile.properties || profile.activity);
  return (
    <section className="tweeter-profile-info-tab">
      <article className="tweeter-profile-info-card">
        <div className="tweeter-profile-section-title">
          <strong>Public profile information</strong>
          <span>{profile.hiddenSections.length ? `${profile.hiddenSections.length} modules hidden` : 'All modules public'}</span>
        </div>
        <dl className="tweeter-info-grid">
          <div><dt>Handle</dt><dd>{user.handle}</dd></div>
          <div><dt>Role</dt><dd>{profile.role || 'Citizen'}</dd></div>
          <div><dt>Title</dt><dd>{profile.title}</dd></div>
          <div><dt>Joined</dt><dd>{profile.activity?.joined ?? formatShortDate(user.joinedAt)}</dd></div>
          <div><dt>Playtime</dt><dd>{profile.activity?.playtime ?? (user.playtimeHours ? `${user.playtimeHours.toLocaleString()}h in city` : 'Hidden')}</dd></div>
          <div><dt>Posts</dt><dd>{posts.toLocaleString()}</dd></div>
          <div><dt>Originals</dt><dd>{originals.toLocaleString()}</dd></div>
          <div><dt>Replies</dt><dd>{replies.toLocaleString()}</dd></div>
          {profile.location ? <div><dt>Location</dt><dd>{profile.location}</dd></div> : null}
          {profile.websiteUrl ? <div><dt>Website</dt><dd><a href={profile.websiteUrl} rel="noreferrer" target="_blank">Open link</a></dd></div> : null}
        </dl>
      </article>

      {hasAnyModule ? (
        <div className="tweeter-profile-showcase-block inline-info-showcases">
          <div className="tweeter-profile-section-title">
            <strong>Published showcases</strong>
            <span>Opt-in gameplay details</span>
          </div>
          <ProfileShowcasePanels profile={profile} compact showEmpty={false} />
        </div>
      ) : (
        <article className="tweeter-empty-state profile-info-empty">
          <strong>No gameplay details published</strong>
          <p>This citizen has not opted into showing economy, inventory, stats, property, or activity details.</p>
        </article>
      )}
    </section>
  );
}

export default async function TweeterProfilePage({ params, searchParams }: Params) {
  const [{ steamId }, sessionSteamId] = await Promise.all([params, getSessionSteamId()]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  if (!/^\d{15,20}$/.test(steamId)) notFound();

  const activeTab = cleanTab(resolvedSearchParams.tab);
  const payload = await buildTweeterPayload(sessionSteamId);
  const [user, player, role, layouts, communityProfile] = await Promise.all([
    buildTweeterUser(steamId, payload.tweets),
    getPlayer(steamId),
    getRoleForSteamId(steamId),
    getPropertyLayoutsForSteamId(steamId),
    getCommunityProfile(steamId),
  ]);
  const userTweets = payload.tweets
    .filter((tweet) => tweet.authorSteamId === steamId)
    .sort((a, b) => b.postedAtTimeSeconds - a.postedAtTimeSeconds);

  if (!user.displayName && !userTweets.length) notFound();

  const replyTweets = userTweets.filter((tweet) => tweet.isReply);
  const originalTweets = userTweets.filter((tweet) => !tweet.isReply);
  const isOwner = sessionSteamId === steamId;
  const publicProfile = buildPublicProfileView({ steamId, player, role, layouts, communityProfile, fallbackName: user.displayName });
  const privateForViewer = publicProfile.privacy === 'private' && !isOwner;
  const steamProfileUrl = `https://steamcommunity.com/profiles/${steamId}`;
  const visibleTweets = activeTab === 'replies' ? replyTweets : originalTweets;

  if (privateForViewer) {
    return (
      <main className="tweeter-shell">
        <div className="tweeter-detail-grid compact-private-profile">
          <section className="tweeter-main-column">
            <header className="tweeter-topbar">
              <div className="tweeter-title-row">
                <Link href="/tweeter" aria-label="Back to Tweeter">←</Link>
                <div><h1>Private profile</h1><small>This citizen controls their visibility</small></div>
              </div>
            </header>
            <section className="tweeter-private-profile-card">
              <UserAvatar src={user.avatarUrl ?? null} name={user.displayName || 'Private profile'} size="xl" />
              <span className="tweeter-badge">Private profile</span>
              <h1>This user’s profile is private.</h1>
              <p>Their Tweeter timeline and public gameplay information are hidden. Economy, inventory, stats, properties, and activity details are not visible.</p>
              <Link className="button button-primary" href="/tweeter">Return to Tweeter</Link>
            </section>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="tweeter-shell">
      <div className="tweeter-detail-grid">
        <section className="tweeter-main-column">
          <header className="tweeter-topbar">
            <div className="tweeter-title-row">
              <Link href="/tweeter" aria-label="Back to Tweeter">←</Link>
              <div><h1>{user.displayName}</h1><small>{userTweets.length} posts</small></div>
            </div>
          </header>

          <section className="tweeter-profile-hero">
            <div className="tweeter-profile-banner" style={{ background: `linear-gradient(135deg, ${user.bannerColor || publicProfile.bannerColor || '#1d9bf0'}, #15202b)` }} />
            <div className="tweeter-profile-main">
              <div className="tweeter-profile-avatar"><UserAvatar src={user.avatarUrl ?? null} name={user.displayName} size="xl" /></div>
              <div className="tweeter-profile-actions">
                {isOwner ? <Link href="/dashboard">Edit profile</Link> : <button type="button" disabled title="Follows are planned for a later website-only pass.">Follow</button>}
              </div>
            </div>
            <div className="tweeter-profile-copy">
              <h1>{user.displayName} {verifiedBadge(user.verifiedKind)}</h1>
              <span>{user.handle}</span>
              <p>{publicProfile.bio || user.bio}</p>
              <div className="tweeter-profile-meta">
                <span>📅 Joined {formatShortDate(user.joinedAt)}</span>
                {user.playtimeHours ? <span>🕒 {user.playtimeHours.toLocaleString()}h in city</span> : null}
                {user.title ? <span>🏷 {user.title}</span> : null}
                {publicProfile.location ? <span>📍 {publicProfile.location}</span> : null}
                {publicProfile.websiteUrl ? <a href={publicProfile.websiteUrl} rel="noreferrer" target="_blank">🔗 Website</a> : null}
                <a href={steamProfileUrl} rel="noreferrer" target="_blank"><i className="fa-brands fa-steam" aria-hidden="true" /> Steam</a>
                {publicProfile.privacy === 'private' ? <span>🔒 Private preview</span> : null}
              </div>
              <div className="tweeter-profile-stats">
                <span><strong>{userTweets.length.toLocaleString()}</strong> Posts</span>
                <span><strong>{(user.likeCount ?? 0).toLocaleString()}</strong> Likes earned</span>
                <span><strong>{originalTweets.length.toLocaleString()}</strong> Originals</span>
                <span><strong>{replyTweets.length.toLocaleString()}</strong> Replies</span>
              </div>
            </div>
          </section>

          <ProfileTabs steamId={steamId} active={activeTab} />

          {activeTab === 'info' ? (
            <ProfileInfoTab profile={publicProfile} user={user} posts={userTweets.length} originals={originalTweets.length} replies={replyTweets.length} />
          ) : (
            <section className="tweeter-feed-list">
              {visibleTweets.length ? visibleTweets.map((tweet) => <ProfileTweet key={tweet.id} tweet={tweet} signedIn={!!sessionSteamId} />) : (
                <div className="tweeter-empty-state"><strong>No {activeTab === 'replies' ? 'replies' : 'tweets'} yet</strong><p>This citizen has no visible {activeTab === 'replies' ? 'replies' : 'original tweets'} in the current server data.</p></div>
              )}
            </section>
          )}
        </section>

        <aside className="tweeter-right-rail tweeter-detail-rail">
          <section className="tweeter-panel">
            <div className="tweeter-panel-header"><strong>Profile summary</strong></div>
            <dl className="tweet-context-list">
              <div><dt>Steam ID</dt><dd>{steamId}</dd></div>
              <div><dt>Steam</dt><dd><a className="steam-inline-link" href={steamProfileUrl} rel="noreferrer" target="_blank"><i className="fa-brands fa-steam" aria-hidden="true" /> Profile</a></dd></div>
              <div><dt>Handle</dt><dd>{user.handle}</dd></div>
              <div><dt>Posts</dt><dd>{userTweets.length}</dd></div>
              <div><dt>Role</dt><dd>{user.verifiedKind && user.verifiedKind !== 'None' ? user.verifiedKind : 'Citizen'}</dd></div>
              <div><dt>Public modules</dt><dd>{5 - publicProfile.hiddenSections.length}</dd></div>
            </dl>
          </section>
          <section className="tweeter-panel">
            <div className="tweeter-panel-header"><strong>Who to follow</strong></div>
            <div className="tweeter-suggestion-list">
              {payload.suggestions.filter((suggestion) => suggestion.steamId !== steamId).slice(0, 3).map((suggestion) => (
                <div className="tweeter-suggestion" key={suggestion.steamId}>
                  <Link href={`/tweeter/profile/${suggestion.steamId}`} className="tweeter-suggestion-main">
                    <UserAvatar src={suggestion.avatarUrl ?? null} name={suggestion.displayName} size="sm" />
                    <div><strong>{suggestion.displayName} {verifiedBadge(suggestion.verifiedKind)}</strong><span>{suggestion.handle}</span></div>
                  </Link>
                  <button type="button" disabled title="Follows are planned for a later website-only pass.">Follow</button>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
