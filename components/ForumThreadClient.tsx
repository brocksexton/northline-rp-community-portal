'use client';

import type { FormEvent } from 'react';
import Link from 'next/link';
import { useState } from 'react';
import type { ForumPost, ForumThread } from '@/lib/forum-data';
import { UserAvatar } from '@/components/UserAvatar';

type Props = { thread: ForumThread; initialPosts: ForumPost[]; signedIn: boolean };

function format(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown';
}

export function ForumThreadClient({ thread, initialPosts, signedIn }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

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

  return (
    <div className="forum-thread-view">
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
        <aside className="forum-stats-card">
          <span>Thread activity</span>
          <strong>{posts.length}</strong>
          <small>posts · last active {format(thread.lastActivityAt)}</small>
        </aside>
      </section>

      <section className="forum-post-stream">
        {posts.map((post) => (
          <article className={`forum-post-card source-${post.source}`} key={post.id}>
            <UserAvatar src={post.author.avatarUrl} name={post.author.displayName} size="md" />
            <div>
              <header><strong>{post.author.displayName}</strong><span>{post.source === 'discord' ? 'Discord' : 'Website'} · {format(post.createdAt)}</span></header>
              <p>{post.body}</p>
            </div>
          </article>
        ))}
      </section>

      <form className="forum-reply-card" onSubmit={reply}>
        <span className="kicker">Reply</span>
        <h2>{thread.status === 'locked' ? 'This thread is locked.' : 'Add to the discussion.'}</h2>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} disabled={!signedIn || busy || thread.status === 'locked'} rows={7} maxLength={6000} placeholder="Write a thoughtful reply…" />
        {message ? <p className="notice success">{message}</p> : null}
        {signedIn ? <button className="button button-primary" type="submit" disabled={busy || thread.status === 'locked'}><i className="fa-solid fa-reply" aria-hidden="true" /> {busy ? 'Posting…' : 'Post reply'}</button> : <a className="button button-primary" href={`/api/auth/steam?returnTo=/forum/thread/${thread.id}`}><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in to reply</a>}
      </form>
    </div>
  );
}
