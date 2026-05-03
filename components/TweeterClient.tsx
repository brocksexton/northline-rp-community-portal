'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';

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
};

type TweeterPayload = {
  generatedAt: string;
  sessionSteamId: string | null;
  tweets: TweetRow[];
  trends: Array<{ tag: string; count: number }>;
};

function formatTweetTime(seconds: number) {
  if (!seconds) return 'Unknown time';
  return new Date(seconds * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function highlightHashtags(body: string) {
  const parts = body.split(/(#[a-z0-9_]+)/gi);
  return parts.map((part, index) => part.startsWith('#') ? <span className="hashtag" key={`${part}-${index}`}>{part}</span> : part);
}

export function TweeterClient({ initialData }: { initialData: TweeterPayload }) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);

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
    return data.tweets.filter((tweet) => {
      if (tag && !tweet.body.toLowerCase().includes(tag.toLowerCase())) return false;
      if (!clean) return true;
      return tweet.body.toLowerCase().includes(clean)
        || tweet.authorDisplayName.toLowerCase().includes(clean)
        || tweet.handle.toLowerCase().includes(clean);
    });
  }, [data.tweets, query, tag]);

  return (
    <main className="page-shell feed-page">
      <section className="hero split-hero">
        <div>
          <span className="eyebrow">City feed</span>
          <h1>Tweeter mirrors the city.</h1>
          <p>Read-only for now: posts are sourced from the Northbound RP server files. Web posting should wait for a signed in-game bridge.</p>
          <div className="button-row">
            <Link className="button button-primary" href="/dashboard">Open dashboard</Link>
            <Link className="button button-soft" href="/guides">How Tweeter works</Link>
          </div>
        </div>
        <aside className="card compact-card">
          <span>Feed state</span>
          <strong>{data.tweets.length.toLocaleString()} posts</strong>
          <small>Updated {new Date(data.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small>
        </aside>
      </section>

      <section className="layout-two feed-layout">
        <aside className="card sidebar-card">
          <label className="field search-field">
            <span>Search feed</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, handle, #tag, or post text" />
          </label>
          <div className="tag-list">
            <button className={!tag ? 'active' : ''} onClick={() => setTag(null)} type="button">All posts</button>
            {data.trends.map((trend) => (
              <button className={tag === trend.tag ? 'active' : ''} key={trend.tag} onClick={() => setTag(trend.tag)} type="button">
                {trend.tag} <small>{trend.count}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="feed-list">
          {filtered.length ? filtered.map((tweet) => (
            <article className="card tweet-card" key={tweet.id}>
              <div className="tweet-author">
                <UserAvatar src={tweet.avatarUrl ?? null} name={tweet.authorDisplayName} size="md" />
                <div>
                  <Link href={`/u/${tweet.authorSteamId}`}><strong>{tweet.authorDisplayName}</strong></Link>
                  <span>{tweet.handle} · {formatTweetTime(tweet.postedAtTimeSeconds)}</span>
                </div>
                {tweet.verifiedKind && tweet.verifiedKind !== 'None' ? <em>{tweet.verifiedKind}</em> : null}
              </div>
              {tweet.isRetweet && tweet.retweetOfBody ? <blockquote>{tweet.retweetOfAuthorDisplayName}: {tweet.retweetOfBody}</blockquote> : null}
              <p>{highlightHashtags(tweet.body)}</p>
              <footer><span>{tweet.likeCount.toLocaleString()} likes</span>{tweet.isReply ? <span>Reply</span> : null}</footer>
            </article>
          )) : (
            <div className="card empty-state"><strong>No posts found</strong><p>Try a different search or clear the selected tag.</p></div>
          )}
        </section>
      </section>
    </main>
  );
}
