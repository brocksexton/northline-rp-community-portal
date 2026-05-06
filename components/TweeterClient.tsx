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

function Icon({ className }: { className: string }) {
  return <i className={className} aria-hidden="true" />;
}

function formatTweetTime(seconds: number, nowMs: number) {
  if (!seconds) return 'Just now';
  const date = new Date(seconds * 1000);
  const diff = nowMs - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < 0) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))}h`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function renderTweetText(body: string) {
  const parts = body.split(/(https?:\/\/[^\s]+|#[a-z0-9_]+|@[a-z0-9_]+)/gi);
  return parts.map((part, index) => {
    if (/^https?:\/\//i.test(part)) {
      return <a className="tweeter-link" href={part} key={`${part}-${index}`} rel="noreferrer" target="_blank">{part}</a>;
    }
    if (part.startsWith('#')) return <span className="tweeter-hashtag" key={`${part}-${index}`}>{part}</span>;
    if (part.startsWith('@')) return <span className="tweeter-mention" key={`${part}-${index}`}>{part}</span>;
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function verifiedBadge(kind?: string) {
  if (!kind || kind === 'None') return null;
  return (
    <span className="tweeter-verified" title={kind} aria-label={kind}>
      <span className="verified-check">✓</span>
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
  const [composerMessage, setComposerMessage] = useState('');
  const initialGeneratedMs = Number.isFinite(Date.parse(initialData.generatedAt)) ? Date.parse(initialData.generatedAt) : Date.now();
  const [clockMs, setClockMs] = useState(initialGeneratedMs);
  const [lastRefreshed, setLastRefreshed] = useState(new Date(initialGeneratedMs));

  async function refreshFeed() {
    if (refreshing) return;
    setRefreshing(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch('/api/tweeter', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
      if (response.ok) {
        const next = await response.json() as TweeterPayload;
        setData(next);
        const nextMs = Number.isFinite(Date.parse(next.generatedAt)) ? Date.parse(next.generatedAt) : Date.now();
        setClockMs(nextMs);
        setLastRefreshed(new Date(nextMs));
      }
    } catch {
      // leave last good timeline intact
    } finally {
      window.clearTimeout(timeout);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const poll = window.setInterval(() => { void refreshFeed(); }, 15000);
    return () => window.clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <header className="tweeter-legacy-topnav">
        <div className="tweeter-legacy-left">
          <Link href="/tweeter"><Icon className="fa-solid fa-house" /> <span>Home</span></Link>
          <button type="button" onClick={() => setQuery('#')}><Icon className="fa-solid fa-hashtag" /> <span>Explore</span></button>
          <button type="button" disabled><Icon className="fa-solid fa-bell" /> <span>Notifications</span></button>
          <button type="button" disabled><Icon className="fa-regular fa-envelope" /> <span>Messages</span></button>
        </div>
        <Link href="/tweeter" className="tweeter-legacy-logo"><Icon className="fa-brands fa-twitter" /></Link>
        <div className="tweeter-legacy-right">
          <label className="tweeter-legacy-search">
            <Icon className="fa-solid fa-magnifying-glass" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Twitter" />
          </label>
          {data.currentUser ? <Link className="legacy-mini-avatar" href={`/tweeter/profile/${data.currentUser.steamId}`}><UserAvatar src={data.currentUser.avatarUrl ?? null} name={data.currentUser.displayName} size="sm" /></Link> : null}
          <button type="button" className="legacy-tweet-button" disabled><Icon className="fa-solid fa-pen-to-square" /> Tweet</button>
        </div>
      </header>

      <div className="tweeter-grid">
        <aside className="tweeter-left-rail">
          <div className="tweeter-brand">
            <span className="tweeter-bird" aria-hidden="true"><Icon className="fa-brands fa-twitter" /></span>
            <div>
              <strong>Tweeter</strong>
              <small>Northline Social</small>
            </div>
          </div>

          <div className="tweeter-legacy-profile-card">
            <div className="tweeter-legacy-cover" />
            <div className="tweeter-legacy-profile-body">
              <UserAvatar src={data.currentUser?.avatarUrl ?? null} name={data.currentUser?.displayName ?? 'Northline'} size="lg" />
              <strong>{data.currentUser?.displayName ?? 'Guest'}</strong>
              <span>{data.currentUser?.handle ?? '@guest'}</span>
              <div className="tweeter-legacy-stats">
                <div><strong>{data.stats.tweetCount.toLocaleString()}</strong><span>Tweets</span></div>
                <div><strong>{data.stats.authorCount.toLocaleString()}</strong><span>Authors</span></div>
              </div>
            </div>
          </div>

          <nav className="tweeter-nav" aria-label="Tweeter navigation">
            <button className="active" type="button"><Icon className="fa-solid fa-house" /><span>Home</span></button>
            <button type="button" onClick={() => setQuery('#')}><Icon className="fa-solid fa-hashtag" /><span>Explore</span></button>
            <button disabled title="Notifications require the future game bridge." type="button"><Icon className="fa-solid fa-bell" /><span>Notifications</span></button>
            <button disabled title="Messages are intentionally not mirrored from game data." type="button"><Icon className="fa-regular fa-envelope" /><span>Messages</span></button>
            <button disabled title="Bookmarks are planned for a later website-only pass." type="button"><Icon className="fa-regular fa-bookmark" /><span>Bookmarks</span></button>
            {data.currentUser ? <Link href={`/tweeter/profile/${data.currentUser.steamId}`}><Icon className="fa-regular fa-user" /><span>Profile</span></Link> : <button disabled title="Sign in with Steam to open your profile." type="button"><Icon className="fa-regular fa-user" /><span>Profile</span></button>}
            <a href="/"><Icon className="fa-solid fa-arrow-left" /><span>Back to Northline</span></a>
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
              <Icon className="fa-solid fa-ellipsis" />
            </Link>
          ) : (
            <div className="tweeter-login-card">
              <strong>Join the conversation</strong>
              <p>Sign in with Steam to like posts and connect your citizen identity.</p>
              <a className="button button-primary steam-button" href="/api/auth/steam?returnTo=/tweeter"><Icon className="fa-brands fa-steam" /> Steam sign-in</a>
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
              <Icon className={refreshing ? 'fa-solid fa-rotate spinning' : 'fa-solid fa-wand-sparkles'} />
              {refreshing ? 'Refreshing' : 'Live'}
            </button>
          </header>

          <div className="tweeter-tabs" role="tablist" aria-label="Timeline tabs">
            <button className={activeTab === 'for-you' ? 'active' : ''} onClick={() => setActiveTab('for-you')} type="button">For you</button>
            <button className={activeTab === 'latest' ? 'active' : ''} onClick={() => setActiveTab('latest')} type="button">Latest</button>
          </div>

          <section className="tweeter-compose-card">
            <UserAvatar src={data.currentUser?.avatarUrl ?? null} name={data.currentUser?.displayName ?? 'Northline'} size="md" />
            <div className="tweeter-compose-body">
              <textarea
                placeholder="What's happening?"
                readOnly
                rows={3}
                value={composerMessage}
                onFocus={() => setComposerMessage("Sorry, this feature doesn't currently work on the web. Please post from within the game for now.")}
                onClick={() => setComposerMessage("Sorry, this feature doesn't currently work on the web. Please post from within the game for now.")}
              />
              <div className="tweeter-compose-footer">
                <div className="tweeter-compose-tools" aria-hidden="true">
                  <Icon className="fa-regular fa-image" />
                  <Icon className="fa-solid fa-film" />
                  <Icon className="fa-solid fa-chart-column" />
                  <Icon className="fa-regular fa-face-smile" />
                </div>
                <button className="tweeter-inline-post" type="button" disabled>Post</button>
              </div>
            </div>
          </section>

          <section className="tweeter-metric-strip" aria-label="Tweeter feed summary">
            <div><strong>{data.stats.tweetCount.toLocaleString()}</strong><span>Posts</span></div>
            <div><strong>{data.stats.authorCount.toLocaleString()}</strong><span>Authors</span></div>
            <div><strong>{engagement.toLocaleString()}</strong><span>Interactions</span></div>
            <div><strong>{lastRefreshed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })}</strong><span>Updated</span></div>
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
                    <div className="tweet-meta-note"><Icon className="fa-solid fa-retweet" /> Retweeted from {tweet.retweetOfAuthorDisplayName}</div>
                  ) : null}
                  {tweet.isReply && tweet.replyToId ? (
                    <Link className="tweet-meta-note tweet-reply-note" href={`/tweeter/tweet/${tweet.replyToId}`}><Icon className="fa-solid fa-reply" /> Replying in a thread</Link>
                  ) : null}
                  <div className="tweet-card-header">
                    <div className="tweet-card-authorline">
                      <Link href={`/tweeter/profile/${tweet.authorSteamId}`} className="tweet-author-link">
                        <strong>{tweet.authorDisplayName}</strong>
                        {verifiedBadge(tweet.verifiedKind)}
                      </Link>
                      <span>{tweet.handle}</span>
                      <span>·</span>
                      <span>{formatTweetTime(tweet.postedAtTimeSeconds, clockMs)}</span>
                    </div>
                    <Link className="tweet-more" href={`/tweeter/tweet/${tweet.id}`} aria-label="Open post"><Icon className="fa-solid fa-ellipsis" /></Link>
                  </div>

                  {tweet.isRetweet && tweet.retweetOfBody ? (
                    <blockquote className="tweet-quoted-card">{tweet.retweetOfAuthorDisplayName}: {tweet.retweetOfBody}</blockquote>
                  ) : null}

                  <div className="tweet-card-text">{renderTweetText(tweet.body)}</div>

                  <footer className="tweet-actions-row">
                    <Link href={`/tweeter/tweet/${tweet.id}`} aria-label="Open replies"><Icon className="fa-regular fa-comment" /><small>{actionCount(tweet.replyCount)}</small></Link>
                    <button disabled title="Reposts require the future game bridge." type="button"><Icon className="fa-solid fa-retweet" /><small>{actionCount(tweet.retweetCount)}</small></button>
                    <TweeterLikeButton tweetId={tweet.id} initialLiked={tweet.likedByMe} initialCount={tweet.likeCount} signedIn={!!data.sessionSteamId} />
                    <Link href={`/tweeter/tweet/${tweet.id}`} aria-label="Share or open post"><Icon className="fa-solid fa-arrow-up-from-bracket" /></Link>
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
            <span className="tweeter-search-icon"><Icon className="fa-solid fa-magnifying-glass" /></span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Tweeter" />
          </label>

          <section className="tweeter-panel">
            <div className="tweeter-panel-header"><strong>Northline trends</strong></div>
            <div className="tweeter-trend-list">
              {data.trends.length ? data.trends.map((trend, index) => (
                <button className={tag === trend.tag ? 'active' : ''} key={trend.tag} onClick={() => setTag(trend.tag)} type="button">
                  <small>{index + 1} · Trending in Northline</small>
                  <strong>{trend.tag}</strong>
                  <span>{trend.count} posts</span>
                </button>
              )) : <div className="tweeter-panel-empty">No trending hashtags yet.</div>}
            </div>
          </section>

          <section className="tweeter-panel">
            <div className="tweeter-panel-header"><strong>Who to follow</strong></div>
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

        </aside>
      </div>

      <nav className="tweeter-mobile-actions" aria-label="Mobile Tweeter navigation">
        <Link href="/tweeter"><Icon className="fa-solid fa-house" /><span>Home</span></Link>
        <button type="button" onClick={() => setQuery('#')}><Icon className="fa-solid fa-hashtag" /><span>Explore</span></button>
        {data.currentUser ? <Link href={`/tweeter/profile/${data.currentUser.steamId}`}><Icon className="fa-regular fa-user" /><span>Profile</span></Link> : <a href="/api/auth/steam?returnTo=/tweeter"><Icon className="fa-solid fa-user-lock" /><span>Sign in</span></a>}
        <a href="/"><Icon className="fa-solid fa-arrow-left" /><span>Northline</span></a>
      </nav>
    </main>
  );
}
