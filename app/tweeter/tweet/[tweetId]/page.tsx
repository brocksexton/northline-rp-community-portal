import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UserAvatar } from '@/components/UserAvatar';
import { TweeterLikeButton } from '@/components/TweeterLikeButton';
import { TweeterFilteredText, TweeterFilterNotice } from '@/components/TweeterFilteredText';
import { getSessionSteamId } from '@/lib/session';
import { buildTweeterPayload, type TweetView } from '@/lib/tweeter-view';
import type { TextFilterRule } from '@/lib/content-filter';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ tweetId: string }> };

function formatFullTime(seconds: number) {
  if (!seconds) return 'Unknown time';
  return new Date(seconds * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function verifiedBadge(kind: string) {
  if (!kind || kind === 'None') return null;
  return <span className="tweeter-verified" title={kind} aria-label={kind}><span className="verified-check">✓</span></span>;
}

function MiniTweet({ tweet, signedIn, disabledReason = '', contentFilterRules }: { tweet: TweetView; signedIn: boolean; disabledReason?: string; contentFilterRules?: TextFilterRule[] }) {
  return (
    <article className="tweet-card-v2 thread-mini-card">
      <div className="tweet-card-avatar"><UserAvatar src={tweet.avatarUrl ?? null} name={tweet.authorDisplayName} size="md" /></div>
      <div className="tweet-card-body">
        <div className="tweet-card-header">
          <div className="tweet-card-authorline">
            <Link href={`/tweeter/profile/${tweet.authorSteamId}`} className="tweet-author-link"><strong>{tweet.authorDisplayName}</strong>{verifiedBadge(tweet.verifiedKind)}</Link>
            <span>{tweet.handle}</span><span>·</span><span>{formatFullTime(tweet.postedAtTimeSeconds)}</span>
          </div>
        </div>
        <div className="tweet-card-text"><TweeterFilteredText text={tweet.body} rules={contentFilterRules} /></div>
        <TweeterFilterNotice text={tweet.body} rules={contentFilterRules} compact />
        <footer className="tweet-actions-row">
          <Link href={`/tweeter/tweet/${tweet.id}`}><span>💬</span><small>{tweet.replyCount || ''}</small></Link>
          <button type="button"><span>↻</span><small>{tweet.retweetCount || ''}</small></button>
          <TweeterLikeButton tweetId={tweet.id} initialLiked={tweet.likedByMe} initialCount={tweet.likeCount} signedIn={signedIn} disabledReason={disabledReason} />
          <button type="button"><span>↗</span></button>
        </footer>
      </div>
    </article>
  );
}

export default async function TweetDetailPage({ params }: Params) {
  const [{ tweetId }, sessionSteamId] = await Promise.all([params, getSessionSteamId()]);
  const payload = await buildTweeterPayload(sessionSteamId);
  const viewerSocialLockReason = sessionSteamId && !(payload.currentUser?.hasPlayedInServer || payload.currentUser?.joinedAt) ? 'Log in to the Northline game server once before using Tweeter social actions.' : '';
  const tweetMap = new Map(payload.tweets.map((tweet) => [tweet.id, tweet]));
  const tweet = tweetMap.get(tweetId);
  if (!tweet) notFound();

  const ancestors: TweetView[] = [];
  let cursor = tweet.replyToId ? tweetMap.get(tweet.replyToId) : null;
  while (cursor) {
    ancestors.unshift(cursor);
    cursor = cursor.replyToId ? tweetMap.get(cursor.replyToId) : null;
  }

  const replies = payload.tweets
    .filter((item) => item.replyToId === tweet.id)
    .sort((a, b) => a.postedAtTimeSeconds - b.postedAtTimeSeconds);

  return (
    <main className="tweeter-shell">
      <div className="tweeter-detail-grid">
        <section className="tweeter-main-column">
          <header className="tweeter-topbar">
            <div className="tweeter-title-row">
              <Link href="/tweeter" aria-label="Back to Tweeter">←</Link>
              <div><h1>Post</h1><small>{replies.length} replies</small></div>
            </div>
          </header>

          {ancestors.length ? (
            <section className="thread-ancestor-list">
              {ancestors.map((ancestor) => <MiniTweet key={ancestor.id} tweet={ancestor} signedIn={!!sessionSteamId} disabledReason={viewerSocialLockReason} contentFilterRules={payload.contentFilterRules} />)}
            </section>
          ) : null}

          <article className="tweet-detail-card">
            <div className="tweet-detail-author">
              <UserAvatar src={tweet.avatarUrl ?? null} name={tweet.authorDisplayName} size="lg" />
              <div>
                <Link href={`/tweeter/profile/${tweet.authorSteamId}`}><strong>{tweet.authorDisplayName}</strong>{verifiedBadge(tweet.verifiedKind)}</Link>
                <span>{tweet.handle}</span>
              </div>
            </div>

            {tweet.isRetweet && tweet.retweetOfBody ? (
              <blockquote className="tweet-quoted-card"><span>{tweet.retweetOfAuthorDisplayName}: </span><TweeterFilteredText text={tweet.retweetOfBody} rules={payload.contentFilterRules} /></blockquote>
            ) : null}

            <div className="tweet-detail-text"><TweeterFilteredText text={tweet.body} rules={payload.contentFilterRules} /></div>
            <TweeterFilterNotice text={tweet.body} rules={payload.contentFilterRules} />
            <div className="tweet-detail-time">{formatFullTime(tweet.postedAtTimeSeconds)} · Northline Tweeter</div>
            <div className="tweet-detail-stats">
              <span><strong>{tweet.retweetCount.toLocaleString()}</strong> Reposts</span>
              <span><strong>{tweet.likeCount.toLocaleString()}</strong> Likes</span>
              <span><strong>{tweet.replyCount.toLocaleString()}</strong> Replies</span>
            </div>
            <footer className="tweet-detail-actions">
              <button type="button">💬</button>
              <button type="button">↻</button>
              <TweeterLikeButton tweetId={tweet.id} initialLiked={tweet.likedByMe} initialCount={tweet.likeCount} signedIn={!!sessionSteamId} variant="large" disabledReason={viewerSocialLockReason} />
              <button type="button">↗</button>
            </footer>
          </article>

          <section className="thread-replies">
            <h2>Replies</h2>
            {replies.length ? replies.map((reply) => <MiniTweet key={reply.id} tweet={reply} signedIn={!!sessionSteamId} disabledReason={viewerSocialLockReason} contentFilterRules={payload.contentFilterRules} />) : (
              <div className="tweeter-empty-state"><strong>No replies yet</strong><p>This post does not have a visible thread in the server data.</p></div>
            )}
          </section>
        </section>

        <aside className="tweeter-right-rail tweeter-detail-rail">
          <section className="tweeter-panel">
            <div className="tweeter-panel-header"><strong>Thread context</strong></div>
            <dl className="tweet-context-list">
              <div><dt>Author</dt><dd>{tweet.authorDisplayName}</dd></div>
              <div><dt>Handle</dt><dd>{tweet.handle}</dd></div>
              <div><dt>Replies</dt><dd>{tweet.replyCount}</dd></div>
              <div><dt>Likes</dt><dd>{tweet.likeCount}</dd></div>
            </dl>
          </section>
          <section className="tweeter-panel">
            <div className="tweeter-panel-header"><strong>Trending now</strong></div>
            <div className="tweeter-trend-list">
              {payload.trends.map((trend, index) => <Link key={trend.tag} href="/tweeter"><small>{index + 1} · Trending</small><strong><TweeterFilteredText text={trend.tag} rules={payload.contentFilterRules} /></strong><span>{trend.count} posts</span></Link>)}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
