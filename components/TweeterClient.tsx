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
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))}h`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function highlightHashtags(body: string) {
  const parts = body.split(/(#[a-z0-9_]+)/gi);
  return parts.map((part, index) => {
    if (part.startsWith('#')) {
      return <span className="tweeter-hashtag" key={`${part}-${index}`}>{part}</span>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function verifiedBadge(kind: string) {
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

export function TweeterClient({ initialData }: { initialData: TweeterPayload }) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'for-you' | 'latest'>('latest');

  useEffect(() => {
    const poll = window.setInterval(async () => {
      try {
        const response = await fetch('/api/tweeter', { cache: 'no-store', credentials: 'same-origin' });
        if (response.ok) setData(await response.json());
      } catch {}
    }, 15000);
    return () => window.clearInterval(poll);
  }, []);

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
      return working.sort((a, b) => (b.likeCount + b.replyCount + b.retweetCount) - (a.likeCount + a.replyCount + a.retweetCount));
    }

    return working.sort((a, b) => b.postedAtTimeSeconds - a.postedAtTimeSeconds);
  }, [activeTab, data.tweets, query, tag]);

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
            <button type="button"><span>#</span>Explore</button>
            <button type="button"><span>🔔</span>Notifications</button>
            <button type="button"><span>✉</span>Messages</button>
            <button type="button"><span>🔖</span>Bookmarks</button>
            {data.currentUser ? <Link href={`/tweeter/profile/${data.currentUser.steamId}`}><span>👤</span>Profile</Link> : <button type="button"><span>👤</span>Profile</button>}
            <Link href="/"><span>↩</span>Back to Northline</Link>
          </nav>

          <button className="tweeter-post-button" type="button">
            Post
          </button>

          {data.currentUser ? (
            <Link className="tweeter-current-user" href="/dashboard">
              <UserAvatar src={data.currentUser.avatarUrl ?? null} name={data.currentUser.displayName} size="sm" />
              <div>
                <strong>{data.currentUser.displayName}</strong>
                <span>{data.currentUser.handle}</span>
              </div>
            </Link>
          ) : (
            <div className="tweeter-login-card">
              <strong>Join the conversation</strong>
              <p>Sign in with Steam to connect your citizen identity.</p>
              <Link className="button button-primary" href="/api/auth/steam?returnTo=/tweeter">Steam sign-in</Link>
            </div>
          )}
        </aside>

        <section className="tweeter-main-column">
          <header className="tweeter-topbar">
            <div>
              <h1>Home</h1>
            </div>
            <button className="tweeter-sparkle" type="button" aria-label="Timeline controls">✦</button>
          </header>

          <div className="tweeter-tabs" role="tablist" aria-label="Timeline tabs">
            <button className={activeTab === 'for-you' ? 'active' : ''} onClick={() => setActiveTab('for-you')} type="button">For you</button>
            <button className={activeTab === 'latest' ? 'active' : ''} onClick={() => setActiveTab('latest')} type="button">Latest</button>
          </div>

          <section className="tweeter-compose-card">
            <UserAvatar src={data.currentUser?.avatarUrl ?? null} name={data.currentUser?.displayName ?? 'Northline'} size="md" />
            <div className="tweeter-compose-body">
              <textarea placeholder="What's happening in Northline?" disabled rows={3} />
              <div className="tweeter-compose-footer">
                <div className="tweeter-compose-tools">
                  <span>🖼</span>
                  <span>🎥</span>
                  <span>📊</span>
                  <span>😊</span>
                </div>
                <button className="tweeter-inline-post" type="button" disabled>Post</button>
              </div>
              <small>Read-only for now. Posting from the web should be enabled later through a secure in-game bridge.</small>
            </div>
          </section>

          {query || tag ? (
            <div className="tweeter-filter-bar">
              <span>Showing {filtered.length} results</span>
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
                    <button className="tweet-more" type="button" aria-label="More actions">···</button>
                  </div>

                  {tweet.isRetweet && tweet.retweetOfBody ? (
                    <blockquote className="tweet-quoted-card">{tweet.retweetOfAuthorDisplayName}: {tweet.retweetOfBody}</blockquote>
                  ) : null}

                  <Link href={`/tweeter/tweet/${tweet.id}`} className="tweet-card-text">{highlightHashtags(tweet.body)}</Link>

                  <footer className="tweet-actions-row">
                    <Link href={`/tweeter/tweet/${tweet.id}`}><span>💬</span><small>{actionCount(tweet.replyCount)}</small></Link>
                    <button type="button"><span>↻</span><small>{actionCount(tweet.retweetCount)}</small></button>
                    <TweeterLikeButton tweetId={tweet.id} initialLiked={tweet.likedByMe} initialCount={tweet.likeCount} signedIn={!!data.sessionSteamId} />
                    <button type="button"><span>↗</span></button>
                  </footer>
                  {(tweet.replyCount > 0 || tweet.isReply) ? <Link className="tweet-thread-link" href={`/tweeter/tweet/${tweet.id}`}>View thread</Link> : null}
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
                  <button type="button">Follow</button>
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
            <p>Tweeter is styled as its own social experience while still reading directly from Northbound RP data.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
