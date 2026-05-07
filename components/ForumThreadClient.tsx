'use client';

import type { FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ForumPost, ForumThread } from '@/lib/forum-data';
import { FORUM_REACTION_CHOICES } from '@/lib/forum-shared';
import { UserAvatar } from '@/components/UserAvatar';

type Props = { thread: ForumThread; initialPosts: ForumPost[]; signedIn: boolean };

function format(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown';
}

function relative(value: string) {
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms)) return 'recently';
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function isImageUrl(value: string) {
  return /^https?:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?$/i.test(value);
}

function renderRichText(value: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(https?:\/\/[^\s]+)|<(a?):([A-Za-z0-9_~]+):(\d{15,25})>|\n/g;
  let last = 0;
  let key = 0;
  for (const match of value.matchAll(regex)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(<span key={`t-${key++}`}>{value.slice(last, index)}</span>);
    if (match[0] === '\n') {
      nodes.push(<br key={`br-${key++}`} />);
    } else if (match[1]) {
      const rawUrl = match[1].replace(/[),.]+$/, '');
      if (isImageUrl(rawUrl)) {
        nodes.push(<a className="forum-inline-image-link" href={rawUrl} target="_blank" rel="noreferrer" key={`img-${key++}`}><img src={rawUrl} alt="Forum attachment" /></a>);
      } else {
        nodes.push(<a href={rawUrl} target="_blank" rel="noreferrer" key={`url-${key++}`}>{rawUrl}</a>);
      }
    } else if (match[4]) {
      const animated = match[2] === 'a';
      const name = match[3];
      const id = match[4];
      const ext = animated ? 'gif' : 'webp';
      nodes.push(<img className="forum-discord-emoji" src={`https://cdn.discordapp.com/emojis/${id}.${ext}?size=48&quality=lossless`} alt={`:${name}:`} title={`:${name}:`} key={`emote-${key++}`} />);
    }
    last = index + match[0].length;
  }
  if (last < value.length) nodes.push(<span key={`t-${key++}`}>{value.slice(last)}</span>);
  return nodes;
}

function PostBody({ body }: { body: string }) {
  return <div className="forum-post-body">{renderRichText(body)}</div>;
}

export function ForumThreadClient({ thread, initialPosts, signedIn }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [reactionBusy, setReactionBusy] = useState('');
  const [message, setMessage] = useState('');

  const starter = posts[0];
  const replies = useMemo(() => posts.slice(1), [posts]);

  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signedIn || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/forum/threads/${encodeURIComponent(thread.id)}/posts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.post) throw new Error(data.message || 'Could not post reply.');
      setPosts((current) => [...current, data.post]);
      setBody('');
      setMessage('Reply posted. Discord sync will run if this thread is linked.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not post reply.');
    } finally {
      setBusy(false);
    }
  }

  async function react(postId: string, emoji: string) {
    if (!signedIn) {
      setMessage('Sign in with Steam to react to forum posts.');
      return;
    }
    const busyKey = `${postId}:${emoji}`;
    if (reactionBusy) return;
    setReactionBusy(busyKey);
    setMessage('');
    try {
      const response = await fetch(`/api/forum/posts/${encodeURIComponent(postId)}/reactions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ emoji }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.post) throw new Error(data.message || 'Could not update reaction.');
      setPosts((current) => current.map((post) => post.id === postId ? data.post : post));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update reaction.');
    } finally {
      setReactionBusy('');
    }
  }

  function reactionBar(post: ForumPost) {
    const summaries = post.reactions ?? [];
    return (
      <div className="forum-reaction-bar" aria-label="Website reactions">
        {FORUM_REACTION_CHOICES.map((choice) => {
          const summary = summaries.find((item) => item.emoji === choice.emoji);
          const active = Boolean(summary?.reactedByMe);
          const busyForThis = reactionBusy === `${post.id}:${choice.emoji}`;
          return (
            <button className={active ? 'selected' : ''} disabled={Boolean(reactionBusy) && !busyForThis} key={choice.emoji} type="button" onClick={() => react(post.id, choice.emoji)} title={choice.label}>
              <span>{choice.emoji}</span>
              <strong>{summary?.count ?? 0}</strong>
            </button>
          );
        })}
      </div>
    );
  }

  function postCard(post: ForumPost, index: number) {
    const isStarter = index === 0;
    return (
      <article className={`forum-post-card source-${post.source} ${isStarter ? 'starter-post' : ''}`} key={post.id}>
        <aside className="forum-post-author-panel">
          <UserAvatar src={post.author.avatarUrl} name={post.author.displayName} size={isStarter ? 'lg' : 'md'} />
          <strong>{post.author.displayName}</strong>
          <span>{post.source === 'discord' ? 'Discord member' : 'Website citizen'}</span>
          {post.author.steamId ? <small>Steam {post.author.steamId.slice(-8)}</small> : post.author.discordUserId ? <small>Discord {post.author.discordUserId.slice(-6)}</small> : null}
        </aside>
        <div className="forum-post-content-panel">
          <header>
            <div>
              <span className="forum-post-index">{isStarter ? 'Opening post' : `Reply #${index}`}</span>
              <strong>{post.author.displayName}</strong>
            </div>
            <time dateTime={post.createdAt}>{relative(post.createdAt)} · {format(post.createdAt)}</time>
          </header>
          <PostBody body={post.body} />
          {reactionBar(post)}
        </div>
      </article>
    );
  }

  return (
    <div className="forum-thread-view forum-thread-polished">
      <section className="forum-thread-hero card">
        <div>
          <Link className="back-link" href="/forum"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to forum</Link>
          <div className="forum-thread-meta">
            {thread.pinned ? <span>Pinned</span> : null}
            {thread.kind === 'announcement' ? <span>Announcement</span> : null}
            {thread.discordThreadId ? <span>Discord synced</span> : <span>Website thread</span>}
          </div>
          <h1>{thread.title}</h1>
          <p>{thread.excerpt}</p>
        </div>
        <aside className="forum-stats-card thread-summary-card">
          <span>Thread activity</span>
          <strong>{posts.length}</strong>
          <small>{replies.length} replies · last active {format(thread.lastActivityAt)}</small>
        </aside>
      </section>

      <section className="forum-thread-shell">
        {starter ? postCard(starter, 0) : null}
        {replies.length ? (
          <div className="forum-replies-divider"><span>{replies.length} repl{replies.length === 1 ? 'y' : 'ies'}</span></div>
        ) : null}
        <div className="forum-post-stream">
          {replies.map((post, index) => postCard(post, index + 1))}
        </div>
      </section>

      <form className="forum-reply-card" onSubmit={reply}>
        <span className="kicker">Reply</span>
        <h2>{thread.status === 'locked' ? 'This thread is locked.' : 'Add to the discussion.'}</h2>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} disabled={!signedIn || busy || thread.status === 'locked'} rows={7} maxLength={6000} placeholder="Write a thoughtful reply… Discord emotes and image links will render cleanly when imported." />
        {message ? <p className={`notice ${message.includes('Could not') || message.includes('Sign in') ? 'warning' : 'success'}`}>{message}</p> : null}
        {signedIn ? <button className="button button-primary" type="submit" disabled={busy || thread.status === 'locked'}><i className="fa-solid fa-reply" aria-hidden="true" /> {busy ? 'Posting…' : 'Post reply'}</button> : <a className="button button-primary" href={`/api/auth/steam?returnTo=/forum/thread/${thread.id}`}><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in to reply</a>}
      </form>
    </div>
  );
}
