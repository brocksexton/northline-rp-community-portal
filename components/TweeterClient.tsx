'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';
import { TweeterLikeButton } from '@/components/TweeterLikeButton';

type TweetRow = {
  id: string;
  authorSteamId: string;
  authorDisplayName: string;
  handle: string;
  avatarUrl?: string | null;
  body: string;
  postedAtTimeSeconds: number;
  verifiedKind: string;
  likeCount: number;
  likedByMe: boolean;
  isReply: boolean;
  isRetweet: boolean;
  retweetOfBody?: string | null;
  retweetOfAuthorDisplayName?: string | null;
  replyCount: number;
  retweetCount: number;
  replyToId?: string | null;
  retweetOfId?: string | null;
};

type Suggestion = {
  steamId: string;
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
  verifiedKind?: string;
  bio?: string;
};

type TweeterPayload = {
  generatedAt: string;
  sessionSteamId: string | null;
  currentUser: {
    steamId: string;
    displayName: string;
    handle: string;
    avatarUrl?: string | null;
    verifiedKind?: string;
  } | null;
  tweets: TweetRow[];
  trends: Array<{ tag: string; count: number }>;
  suggestions: Suggestion[];
  stats: {
    tweetCount: number;
    authorCount: number;
  };
};

function formatTweetTime(seconds: number) {
  if (!seconds) return 'Just now';
  const date = new Date(seconds * 1000);
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < 0) return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))}h`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function renderTweetText(body: string) {
  const parts = body.split(/(https?:\/\/[^\s]+|#[a-z0-9_]+|@[a-z0-9_]+)/gi);
  return parts.map((part, index) => {
    if (/^https?:\/\//i.test(part)) {
      return <a className="tweeter-link" href={part} key={`${part}-${index}`} rel="noreferrer" target="_blank">{part}</a>;
    }
    if (part.startsWith('#')) {
      return <span className="tweeter-hashtag" key={`${part}-${index}`}>{part}</span>;
    }
    if (part.startsWith('@')) {
      return <span className="tweeter-mention" key={`${part}-${index}`}>{part}</span>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function verifiedBadge(kind?: string) {
  if (!kind || kind === 'None') return null;
  return (
    <span className="tweeter-verified" title={kind} aria-label={kind}>
      ✓
    </span>
  );
}

function actionCount(value: number) {
  if (!value) return '';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function totalEngagement(tweets: TweetRow[]) {
  return tweets.reduce((sum, tweet) => sum + tweet.likeCount + tweet.replyCount + tweet.retweetCount, 0);
}

export function TweeterClient({ initialData }: { initialData: TweeterPayload }) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'for-you' | 'latest'>('latest');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date(initialData.generatedAt));

  async function refreshFeed() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const response = await fetch('/api/tweeter', { cache: 'no-store', credentials: 'same-origin' });
      if (response.ok) {
        const next = await response.json() as TweeterPayload;
        setData(next);
        setLastRefreshed(new Date(next.generatedAt));
      }
    } catch {
      // Keep the existing timeline visible if the live read fails.
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const poll = window.setInterval(() => { void refreshFeed(); }, 15000);
    return () => window.clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    const working = [...data.tweets].filter((tweet) => {
      if (tag && !tweet.body.toLowerCase().includes(tag.toLowerCase())) return false;
      if (!clean) return true;
      return tweet.body.toLowerCase().includes(clean)
        || tweet.authorDisplayName.toLowerCase().includes(clean)
        || tweet.handle.toLowerCase().includes(clean);
    });

    if (activeTab === 'for-you') {
      return working.sort((a, b) => {
        const score = (b.likeCount + b.replyCount + b.retweetCount) - (a.likeCount + a.replyCount + a.retweetCount);
        return score || b.postedAtTimeSeconds - a.postedAtTimeSeconds;
      });
    }

    return working.sort((a, b) => b.postedAtTimeSeconds - a.postedAtTimeSeconds);
  }, [activeTab, data.tweets, query, tag]);

  const engagement = useMemo(() => totalEngagement(data.tweets), [data.tweets]);

  return (
    <main className="tweeter-shell">
      <div className="tweeter-grid">
        <aside className="tweeter-left-rail">
          <div className="tweeter-brand">
            <span className="tweeter-bird" aria-hidden="true">✦</span>
            <div>
              <strong>Tweeter</strong>
              <small>Northline Social</small>
            </div>
          </div>

          <nav className="tweeter-nav" aria-label="Tweeter navigation">
            <button className="active" type="button"><span>⌂</span>Home</button>
            <button type="button" onClick={() => setQuery('#')}><span>#</span>Explore</button>
            <button disabled title="Notifications require the future game bridge." type="button"><span>🔔</span>Notifications</button>
            <button disabled title="Messages are intentionally not mirrored from game data." type="button"><span>✉</span>Messages</button>
            <button disabled title="Bookmarks are planned for a later website-only pass." type="button"><span>🔖</span>Bookmarks</button>
            {data.currentUser ? <Link href={`/tweeter/profile/${data.currentUser.steamId}`}><span>👤</span>Profile</Link> : <button disabled title="Sign in with Steam to open your profile." type="button"><span>👤</span>Profile</button>}
            <Link href="/"><span>↩</span>Back to Northline</Link>
          </nav>

          <button className="tweeter-post-button" type="button" disabled title="Web posting will stay locked until a secure S&box bridge exists.">
            Post
          </button>

          {data.currentUser ? (
            <Link className="tweeter-current-user" href={`/tweeter/profile/${data.currentUser.steamId}`}>
              <UserAvatar src={data.currentUser.avatarUrl ?? null} name={data.currentUser.displayName} size="sm" />
              <div>
                <strong>{data.currentUser.displayName}</strong>
                <span>{data.currentUser.handle}</span>
              </div>
            </Link>
          ) : (
            <div className="tweeter-login-card">
              <strong>Join the conversation</strong>
              <p>Sign in with Steam to like posts and connect your citizen identity.</p>
              <Link className="button button-primary" href="/api/auth/steam?returnTo=/tweeter">Steam sign-in</Link>
            </div>
          )}
        </aside>

        <section className="tweeter-main-column">
          <header className="tweeter-topbar tweeter-topbar-expanded">
            <div>
              <h1>Home</h1>
              <small>Live city chatter from Northbound RP</small>
            </div>
            <button className="tweeter-live-pill" type="button" onClick={() => void refreshFeed()} aria-label="Refresh Tweeter timeline">
              <span className={refreshing ? 'spinning' : ''}>✦</span>
              {refreshing ? 'Syncing' : 'Live'}
            </button>
          </header>

          <div className="tweeter-tabs" role="tablist" aria-label="Timeline tabs">
            <button className={activeTab === 'for-you' ? 'active' : ''} onClick={() => setActiveTab('for-you')} type="button">For you</button>
            <button className={activeTab === 'latest' ? 'active' : ''} onClick={() => setActiveTab('latest')} type="button">Latest</button>
          </div>

          <section className="tweeter-compose-card">
            <UserAvatar src={data.currentUser?.avatarUrl ?? null} name={data.currentUser?.displayName ?? 'Northline'} size="md" />
            <div className="tweeter-compose-body">
              <div className="tweeter-compose-lockline">
                <span className="tweeter-badge">Read-only bridge</span>
                <span>Web posting is intentionally locked.</span>
              </div>
              <textarea placeholder="What's happening in Northline?" disabled rows={3} />
              <div className="tweeter-compose-footer">
                <div className="tweeter-compose-tools" aria-hidden="true">
                  <span>🖼</span>
                  <span>🎥</span>
                  <span>📊</span>
                  <span>😊</span>
                </div>
                <button className="tweeter-inline-post" type="button" disabled>Post</button>
              </div>
              <small>Likes are website-safe. Posting, replies, reposts, and follows should wait for a signed game bridge.</small>
            </div>
          </section>

          <section className="tweeter-metric-strip" aria-label="Tweeter feed summary">
            <div><strong>{data.stats.tweetCount.toLocaleString()}</strong><span>Posts</span></div>
            <div><strong>{data.stats.authorCount.toLocaleString()}</strong><span>Authors</span></div>
            <div><strong>{engagement.toLocaleString()}</strong><span>Interactions</span></div>
            <div><strong>{lastRefreshed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong><span>Updated</span></div>
          </section>

          {query || tag ? (
            <div className="tweeter-filter-bar">
              <span>Showing {filtered.length} result{filtered.length === 1 ? '' : 's'}{tag ? ` for ${tag}` : ''}</span>
              <div>
                {tag ? <button type="button" onClick={() => setTag(null)}>Clear topic</button> : null}
                {query ? <button type="button" onClick={() => setQuery('')}>Clear search</button> : null}
              </div>
            </div>
          ) : null}

          <section className="tweeter-feed-list">
            {filtered.length ? filtered.map((tweet) => (
              <article className="tweet-card-v2" key={tweet.id}>
                <div className="tweet-card-avatar">
                  <UserAvatar src={tweet.avatarUrl ?? null} name={tweet.authorDisplayName} size="md" />
                </div>
                <div className="tweet-card-body">
                  {tweet.isRetweet && tweet.retweetOfAuthorDisplayName ? (
                    <div className="tweet-meta-note">↻ Retweeted from {tweet.retweetOfAuthorDisplayName}</div>
                  ) : null}
                  {tweet.isReply && tweet.replyToId ? (
                    <Link className="tweet-meta-note tweet-reply-note" href={`/tweeter/tweet/${tweet.replyToId}`}>Replying in a thread</Link>
                  ) : null}
                  <div className="tweet-card-header">
                    <div className="tweet-card-authorline">
                      <Link href={`/tweeter/profile/${tweet.authorSteamId}`} className="tweet-author-link">
                        <strong>{tweet.authorDisplayName}</strong>
                        {verifiedBadge(tweet.verifiedKind)}
                      </Link>
                      <span>{tweet.handle}</span>
                      <span>·</span>
                      <span>{formatTweetTime(tweet.postedAtTimeSeconds)}</span>
                    </div>
                    <Link className="tweet-more" href={`/tweeter/tweet/${tweet.id}`} aria-label="Open post">···</Link>
                  </div>

                  {tweet.isRetweet && tweet.retweetOfBody ? (
                    <blockquote className="tweet-quoted-card">{tweet.retweetOfAuthorDisplayName}: {tweet.retweetOfBody}</blockquote>
                  ) : null}

                  <div className="tweet-card-text">{renderTweetText(tweet.body)}</div>

                  <footer className="tweet-actions-row">
                    <Link href={`/tweeter/tweet/${tweet.id}`} aria-label="Open replies"><span>💬</span><small>{actionCount(tweet.replyCount)}</small></Link>
                    <button disabled title="Reposts require the future game bridge." type="button"><span>↻</span><small>{actionCount(tweet.retweetCount)}</small></button>
                    <TweeterLikeButton tweetId={tweet.id} initialLiked={tweet.likedByMe} initialCount={tweet.likeCount} signedIn={!!data.sessionSteamId} />
                    <Link href={`/tweeter/tweet/${tweet.id}`} aria-label="Share or open post"><span>↗</span></Link>
                  </footer>
                  <Link className="tweet-thread-link" href={`/tweeter/tweet/${tweet.id}`}>{tweet.replyCount > 0 || tweet.isReply ? 'View thread' : 'Open post'}</Link>
                </div>
              </article>
            )) : (
              <div className="tweeter-empty-state">
                <strong>No posts found</strong>
                <p>Try a different search, switch tabs, or clear the selected topic.</p>
              </div>
            )}
          </section>
        </section>

        <aside className="tweeter-right-rail">
          <label className="tweeter-search-box">
            <span className="sr-only">Search Tweeter</span>
            <span className="tweeter-search-icon">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Tweeter"
            />
          </label>

          <section className="tweeter-panel tweeter-system-panel">
            <div className="tweeter-panel-header">
              <strong>City pulse</strong>
            </div>
            <p>Tweeter mirrors server-side Northbound RP data and keeps unsafe write actions disabled until the bridge is ready.</p>
            <div className="tweeter-system-grid">
              <span>Read-only feed</span>
              <span>Safe web likes</span>
              <span>Steam identity</span>
              <span>Live refresh</span>
            </div>
          </section>

          <section className="tweeter-panel">
            <div className="tweeter-panel-header">
              <strong>Northline trends</strong>
            </div>
            <div className="tweeter-trend-list">
              {data.trends.length ? data.trends.map((trend, index) => (
                <button className={tag === trend.tag ? 'active' : ''} key={trend.tag} onClick={() => setTag(trend.tag)} type="button">
                  <small>{index + 1} · Trending in Northline</small>
                  <strong>{trend.tag}</strong>
                  <span>{trend.count} posts</span>
                </button>
              )) : (
                <div className="tweeter-panel-empty">No trending hashtags yet.</div>
              )}
            </div>
          </section>

          <section className="tweeter-panel">
            <div className="tweeter-panel-header">
              <strong>Who to follow</strong>
            </div>
            <div className="tweeter-suggestion-list">
              {data.suggestions.map((suggestion) => (
                <div className="tweeter-suggestion" key={suggestion.steamId}>
                  <Link href={`/tweeter/profile/${suggestion.steamId}`} className="tweeter-suggestion-main">
                    <UserAvatar src={suggestion.avatarUrl ?? null} name={suggestion.displayName} size="sm" />
                    <div>
                      <strong>{suggestion.displayName} {verifiedBadge(suggestion.verifiedKind ?? 'None')}</strong>
                      <span>{suggestion.handle}</span>
                      {suggestion.bio ? <small>{suggestion.bio}</small> : null}
                    </div>
                  </Link>
                  <button disabled title="Follows are planned for a later website-only pass." type="button">Follow</button>
                </div>
              ))}
            </div>
          </section>

          <section className="tweeter-panel tweeter-mini-stats">
            <div className="tweeter-panel-header">
              <strong>About this feed</strong>
            </div>
            <dl>
              <div><dt>Posts</dt><dd>{data.stats.tweetCount.toLocaleString()}</dd></div>
              <div><dt>Authors</dt><dd>{data.stats.authorCount.toLocaleString()}</dd></div>
              <div><dt>Updated</dt><dd>{new Date(data.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</dd></div>
            </dl>
            <p>Open a post to view its thread, or open a profile to see that citizen’s public Tweeter timeline.</p>
          </section>
        </aside>
      </div>

      <nav className="tweeter-mobile-actions" aria-label="Mobile Tweeter navigation">
        <Link href="/tweeter">⌂<span>Home</span></Link>
        <button type="button" onClick={() => setQuery('#')}>#<span>Explore</span></button>
        {data.currentUser ? <Link href={`/tweeter/profile/${data.currentUser.steamId}`}>👤<span>Profile</span></Link> : <Link href="/api/auth/steam?returnTo=/tweeter">🔐<span>Sign in</span></Link>}
        <Link href="/">↩<span>Northline</span></Link>
      </nav>
    </main>
  );
}
