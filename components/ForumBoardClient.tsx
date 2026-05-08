'use client';

import type { FormEvent } from 'react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ForumCategory, ForumThread, PublicForumState } from '@/lib/forum-data';

type Props = {
  initialState: PublicForumState;
  signedIn: boolean;
};

function relative(value: string) {
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms)) return 'recently';
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function categoryFor(categories: ForumCategory[], thread: ForumThread) {
  return categories.find((category) => category.id === thread.categoryId) ?? categories[0];
}

export function ForumBoardClient({ initialState, signedIn }: Props) {
  const [threads, setThreads] = useState(initialState.threads);
  const [category, setCategory] = useState('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState(initialState.categories[0]?.id ?? 'general');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const filtered = useMemo(() => category === 'all' ? threads : threads.filter((thread) => thread.categoryId === category), [threads, category]);

  async function submitThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signedIn || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/forum/threads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ title, body, categoryId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.thread) throw new Error(data.message || 'Could not create that thread.');
      setThreads((current) => [data.thread, ...current]);
      setTitle('');
      setBody('');
      setMessage('Thread posted. Discord sync will run if the bot token/forum channel are configured.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create that thread.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="forum-mini-app">
      <section className="forum-hero card">
        <div>
          <span className="eyebrow"><i /> Northline Forum</span>
          <h1>Community threads, updates, and synced discussion.</h1>
          <p>Use the forum for announcements, discussion, and readable threads. Linked Discord accounts can sync with the configured Discord forum channel.</p>
          <div className="button-row">
            <a className="button button-primary" href="#new-thread"><i className="fa-solid fa-pen-to-square" aria-hidden="true" /> Start a thread</a>
            <Link className="button button-soft" href="/dashboard"><i className="fa-brands fa-discord" aria-hidden="true" /> Link Discord</Link>
          </div>
        </div>
        <aside className="forum-stats-card">
          <span>Board pulse</span>
          <strong>{initialState.stats.visibleThreads}</strong>
          <small>{initialState.stats.pinnedThreads} pinned · {initialState.stats.replies} replies</small>
          {initialState.discordLink ? <em>Discord linked as {initialState.discordLink.discordUsername}</em> : <em>Discord not linked yet</em>}
        </aside>
      </section>

      <section className="forum-category-strip">
        <button className={category === 'all' ? 'selected' : ''} type="button" onClick={() => setCategory('all')}>All threads</button>
        {initialState.categories.map((item) => <button className={category === item.id ? 'selected' : ''} key={item.id} type="button" onClick={() => setCategory(item.id)}><i className={item.icon} aria-hidden="true" /> {item.label}</button>)}
      </section>

      <section className="forum-layout">
        <div className="forum-thread-list">
          {filtered.length ? filtered.map((thread) => {
            const cat = categoryFor(initialState.categories, thread);
            return (
              <article className={`forum-thread-card ${thread.pinned ? 'pinned' : ''} kind-${thread.kind}`} key={thread.id}>
                <div className="forum-thread-icon"><i className={cat?.icon ?? 'fa-solid fa-comments'} aria-hidden="true" /></div>
                <div>
                  <div className="forum-thread-meta">
                    {thread.pinned ? <span>Pinned</span> : null}
                    {thread.kind === 'announcement' ? <span>Announcement</span> : null}
                    {thread.source === 'discord' ? <span>Discord</span> : <span>Website</span>}
                  </div>
                  <h2><Link href={`/forum/thread/${thread.id}`}>{thread.title}</Link></h2>
                  <p>{thread.excerpt}</p>
                  <small>{thread.author.steamId ? <Link className="forum-thread-author-link" href={`/u/${thread.author.steamId}`}>{thread.author.displayName}</Link> : thread.author.displayName} · {thread.postCount} post{thread.postCount === 1 ? '' : 's'} · {relative(thread.lastActivityAt)}</small>
                </div>
              </article>
            );
          }) : <article className="empty-card"><strong>No threads yet</strong><p>Start the first conversation for this category.</p></article>}
        </div>

        <form className="forum-composer-card" id="new-thread" onSubmit={submitThread}>
          <span className="kicker">New thread</span>
          <h2>Start something readable.</h2>
          {!signedIn ? <p className="notice warning">Sign in with Steam to start website forum threads.</p> : null}
          <label><span>Category</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={!signedIn || busy}>{initialState.categories.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
          <label><span>Thread title</span><input value={title} onChange={(event) => setTitle(event.target.value)} disabled={!signedIn || busy} maxLength={120} /></label>
          <label><span>Opening post</span><textarea value={body} onChange={(event) => setBody(event.target.value)} disabled={!signedIn || busy} rows={8} maxLength={6000} /></label>
          {message ? <p className="notice success">{message}</p> : null}
          {signedIn ? <button className="button button-primary" type="submit" disabled={busy}><i className="fa-solid fa-paper-plane" aria-hidden="true" /> {busy ? 'Posting…' : 'Post thread'}</button> : <a className="button button-primary" href="/api/auth/steam?returnTo=/forum"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in</a>}
        </form>
      </section>
    </div>
  );
}
