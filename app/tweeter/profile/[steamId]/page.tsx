import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProfileShowcasePanels } from '@/components/ProfileShowcasePanels';
import { UserAvatar } from '@/components/UserAvatar';
import { TweeterLikeButton } from '@/components/TweeterLikeButton';
import { getPlayer, getPropertyLayoutsForSteamId, getRoleForSteamId } from '@/lib/ape-data';
import { getCommunityProfile } from '@/lib/community-data';
import { buildPublicProfileView } from '@/lib/profile-view';
import { getSessionSteamId } from '@/lib/session';
import { buildTweeterPayload, buildTweeterUser, type TweetView } from '@/lib/tweeter-view';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ steamId: string }> };

function formatShortDate(value?: string | null) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

function formatTweetTime(seconds: number) {
  if (!seconds) return 'Just now';
  const date = new Date(seconds * 1000);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function splitHashtags(body: string) {
  const parts = body.split(/(#[a-z0-9_]+)/gi);
  return parts.map((part, index) => part.startsWith('#')
    ? <span className="tweeter-hashtag" key={`${part}-${index}`}>{part}</span>
    : <span key={`${part}-${index}`}>{part}</span>);
}

function verifiedBadge(kind?: string) {
  if (!kind || kind === 'None') return null;
  return <span className="tweeter-verified" title={kind} aria-label={kind}>✓</span>;
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
          <button type="button"><span>↻</span><small>{tweet.retweetCount || ''}</small></button>
          <TweeterLikeButton tweetId={tweet.id} initialLiked={tweet.likedByMe} initialCount={tweet.likeCount} signedIn={signedIn} />
          <button type="button"><span>↗</span></button>
        </footer>
      </div>
    </article>
  );
}

export default async function TweeterProfilePage({ params }: Params) {
  const [{ steamId }, sessionSteamId] = await Promise.all([params, getSessionSteamId()]);
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

  const replies = userTweets.filter((tweet) => tweet.isReply).length;
  const originalPosts = userTweets.length - replies;
  const isOwner = sessionSteamId === steamId;
  const publicProfile = buildPublicProfileView({ steamId, player, role, layouts, communityProfile, fallbackName: user.displayName });
  const privateForViewer = publicProfile.privacy === 'private' && !isOwner;

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
            <div className="tweeter-profile-banner" style={{ background: `linear-gradient(135deg, ${user.bannerColor || '#1d9bf0'}, #15202b)` }} />
            <div className="tweeter-profile-main">
              <div className="tweeter-profile-avatar"><UserAvatar src={user.avatarUrl ?? null} name={user.displayName} size="xl" /></div>
              {isOwner ? <Link href="/dashboard">Edit profile</Link> : <button type="button">Follow</button>}
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
              </div>
              <div className="tweeter-profile-stats">
                <span><strong>{userTweets.length.toLocaleString()}</strong> Posts</span>
                <span><strong>{(user.likeCount ?? 0).toLocaleString()}</strong> Likes earned</span>
                <span><strong>{originalPosts.toLocaleString()}</strong> Originals</span>
                <span><strong>{replies.toLocaleString()}</strong> Replies</span>
              </div>
            </div>
          </section>

          <section className="tweeter-profile-showcase-block">
            <div className="tweeter-profile-section-title">
              <strong>Profile showcases</strong>
              <span>{privateForViewer ? 'Private profile' : `Hidden: ${publicProfile.hiddenSections.length ? publicProfile.hiddenSections.join(', ') : 'None'}`}</span>
            </div>
            <ProfileShowcasePanels profile={privateForViewer ? { ...publicProfile, privacy: 'private' } : publicProfile} compact />
          </section>

          <nav className="tweeter-profile-tabs" aria-label="Profile timeline tabs">
            <button className="active" type="button">Posts</button>
            <button type="button">Replies</button>
            <button type="button">Showcases</button>
            <button type="button">Likes</button>
          </nav>

          <section className="tweeter-feed-list">
            {userTweets.length ? userTweets.map((tweet) => <ProfileTweet key={tweet.id} tweet={tweet} signedIn={!!sessionSteamId} />) : (
              <div className="tweeter-empty-state"><strong>No posts yet</strong><p>This citizen has not posted to Tweeter in the visible server data.</p></div>
            )}
          </section>
        </section>

        <aside className="tweeter-right-rail tweeter-detail-rail">
          <section className="tweeter-panel">
            <div className="tweeter-panel-header"><strong>Profile summary</strong></div>
            <dl className="tweet-context-list">
              <div><dt>Steam ID</dt><dd>{steamId}</dd></div>
              <div><dt>Handle</dt><dd>{user.handle}</dd></div>
              <div><dt>Posts</dt><dd>{userTweets.length}</dd></div>
              <div><dt>Role</dt><dd>{user.verifiedKind && user.verifiedKind !== 'None' ? user.verifiedKind : 'Citizen'}</dd></div>
              <div><dt>Public modules</dt><dd>{privateForViewer ? 'Private' : 5 - publicProfile.hiddenSections.length}</dd></div>
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
                  <button type="button">Follow</button>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
