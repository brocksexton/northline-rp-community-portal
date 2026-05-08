'use client';

import type { FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ForumPost, ForumThread } from '@/lib/forum-data';
import { FORUM_REACTION_CHOICES } from '@/lib/forum-shared';
import { UserAvatar } from '@/components/UserAvatar';
import { TweeterVerifiedBadge } from '@/components/TweeterVerifiedBadge';

type Props = { thread: ForumThread; initialPosts: ForumPost[]; signedIn: boolean; canModerate?: boolean };

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

type InlineToken = ReactNode;

function trimTrailingPunctuation(url: string) {
  return url.replace(/[),.]+$/, '');
}

function renderInlineMarkdown(value: string, keyPrefix: string): InlineToken[] {
  const nodes: InlineToken[] = [];
  const regex = /(`[^`]+`)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)|<(a?):([A-Za-z0-9_~]+):(\d{15,25})>|(\*\*[^*]+\*\*)|(~~[^~]+~~)|(\*[^*]+\*)/g;
  let last = 0;
  let key = 0;
  for (const match of value.matchAll(regex)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(<span key={`${keyPrefix}-t-${key++}`}>{value.slice(last, index)}</span>);
    const token = match[0];
    if (match[1]) {
      nodes.push(<code className="forum-inline-code" key={`${keyPrefix}-code-${key++}`}>{token.slice(1, -1)}</code>);
    } else if (match[2] && match[3]) {
      nodes.push(<a href={match[3]} target="_blank" rel="noreferrer" key={`${keyPrefix}-mdlink-${key++}`}>{match[2]}</a>);
    } else if (match[4]) {
      const rawUrl = trimTrailingPunctuation(match[4]);
      if (isImageUrl(rawUrl)) {
        nodes.push(<a className="forum-inline-image-link" href={rawUrl} target="_blank" rel="noreferrer" key={`${keyPrefix}-img-${key++}`}><img src={rawUrl} alt="Forum attachment" /></a>);
      } else {
        nodes.push(<a href={rawUrl} target="_blank" rel="noreferrer" key={`${keyPrefix}-url-${key++}`}>{rawUrl}</a>);
      }
    } else if (match[7]) {
      const animated = match[5] === 'a';
      const name = match[6];
      const id = match[7];
      const ext = animated ? 'gif' : 'webp';
      nodes.push(<img className="forum-discord-emoji" src={`https://cdn.discordapp.com/emojis/${id}.${ext}?size=48&quality=lossless`} alt={`:${name}:`} title={`:${name}:`} key={`${keyPrefix}-emote-${key++}`} />);
    } else if (match[8]) {
      nodes.push(<strong key={`${keyPrefix}-bold-${key++}`}>{token.slice(2, -2)}</strong>);
    } else if (match[9]) {
      nodes.push(<del key={`${keyPrefix}-strike-${key++}`}>{token.slice(2, -2)}</del>);
    } else if (match[10]) {
      nodes.push(<em key={`${keyPrefix}-em-${key++}`}>{token.slice(1, -1)}</em>);
    }
    last = index + token.length;
  }
  if (last < value.length) nodes.push(<span key={`${keyPrefix}-t-${key++}`}>{value.slice(last)}</span>);
  return nodes;
}

function renderRichText(value: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const fenceRegex = /```([A-Za-z0-9_-]+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let block = 0;

  function renderPlainBlock(text: string, prefix: string) {
    const parts = text.split(/\n{2,}/g).filter((part) => part.trim().length);
    for (const part of parts) {
      const lines = part.split('\n');
      const isQuote = lines.every((line) => line.trim().startsWith('>'));
      const cleanedLines = isQuote ? lines.map((line) => line.replace(/^\s*>\s?/, '')) : lines;
      const content = cleanedLines.map((line, lineIndex) => (
        <span key={`${prefix}-line-${lineIndex}`}>{renderInlineMarkdown(line, `${prefix}-${lineIndex}`)}{lineIndex < cleanedLines.length - 1 ? <br /> : null}</span>
      ));
      if (isQuote) nodes.push(<blockquote className="forum-rich-quote" key={`${prefix}-quote-${block++}`}>{content}</blockquote>);
      else nodes.push(<p className="forum-rich-paragraph" key={`${prefix}-p-${block++}`}>{content}</p>);
    }
  }

  for (const match of value.matchAll(fenceRegex)) {
    const index = match.index ?? 0;
    if (index > last) renderPlainBlock(value.slice(last, index), `plain-${block}`);
    const language = match[1]?.trim();
    nodes.push(
      <pre className="forum-code-block" key={`code-${block++}`}>
        {language ? <span className="forum-code-language">{language}</span> : null}
        <code>{match[2]}</code>
      </pre>
    );
    last = index + match[0].length;
  }
  if (last < value.length) renderPlainBlock(value.slice(last), `plain-${block}`);
  return nodes.length ? nodes : [<p className="forum-rich-paragraph" key="empty">{value}</p>];
}

function PostBody({ body }: { body: string }) {
  return <div className="forum-post-body">{renderRichText(body)}</div>;
}

export function ForumThreadClient({ thread: initialThread, initialPosts, signedIn, canModerate = false }: Props) {
  const [thread, setThread] = useState(initialThread);
  const [posts, setPosts] = useState(initialPosts);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [reactionBusy, setReactionBusy] = useState('');
  const [message, setMessage] = useState('');
  const [moderationBusy, setModerationBusy] = useState('');

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

  async function moderatePost(postId: string, action: 'hide' | 'delete') {
    if (!canModerate || moderationBusy) return;
    if (action === 'delete' && !window.confirm('Delete this forum post and remove its Discord mirror if one exists?')) return;
    setModerationBusy(`${action}:${postId}`);
    setMessage('');
    try {
      const response = await fetch(`/api/forum/moderation/posts/${encodeURIComponent(postId)}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: action === 'delete' ? undefined : JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not moderate that post.');
      if (data.thread) setThread(data.thread);
      setPosts((current) => current.filter((post) => post.id !== postId));
      setMessage(action === 'delete' ? 'Post deleted and Discord mirror removal was requested.' : 'Post hidden and Discord mirror removal was requested.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not moderate that post.');
    } finally {
      setModerationBusy('');
    }
  }

  async function moderateThread(action: 'open' | 'lock' | 'archive' | 'hide' | 'delete' | 'pin' | 'unpin') {
    if (!canModerate || moderationBusy) return;
    if ((action === 'delete' || action === 'hide') && !window.confirm('This will remove the website thread from public view and request Discord removal. Continue?')) return;
    setModerationBusy(`thread:${action}`);
    setMessage('');
    try {
      const response = await fetch(`/api/forum/moderation/threads/${encodeURIComponent(thread.id)}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: action === 'delete' ? undefined : JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not moderate that thread.');
      if (data.thread) setThread(data.thread);
      if (action === 'hide' || action === 'delete') {
        setPosts([]);
        setMessage('Thread removed from the website and Discord removal was requested.');
      } else {
        setMessage('Thread moderation updated.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not moderate that thread.');
    } finally {
      setModerationBusy('');
    }
  }

  function reactionBar(post: ForumPost) {
    const summaries = post.reactions ?? [];
    const discordOnly = summaries.filter((item) => item.source === 'discord' || item.interactive === false);
    return (
      <div className="forum-reaction-bar" aria-label="Forum reactions">
        {discordOnly.map((summary) => (
          <span className="forum-discord-reaction-pill" key={`discord-${summary.emoji}`} title="Synced from Discord reactions">
            <span>{summary.emoji}</span>
            <strong>{summary.count}</strong>
            <em>Discord</em>
          </span>
        ))}
        {FORUM_REACTION_CHOICES.map((choice) => {
          const summary = summaries.find((item) => item.emoji === choice.emoji && item.interactive !== false);
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
    const sourceLabel = post.source === 'discord' ? 'Synced from Discord' : 'Posted on website';
    const sourceIcon = post.source === 'discord' ? 'fa-brands fa-discord' : 'fa-solid fa-globe';
    return (
      <article className={`forum-post-card source-${post.source} ${isStarter ? 'starter-post' : ''}`} key={post.id}>
        <aside className="forum-post-author-panel">
          <UserAvatar src={post.author.avatarUrl} name={post.author.displayName} size={isStarter ? 'lg' : 'md'} />
          <div className="forum-author-name-line">
            {post.author.steamId ? (
              <Link href={`/u/${post.author.steamId}`} className="forum-author-profile-link">{post.author.displayName}</Link>
            ) : (
              <strong>{post.author.displayName}</strong>
            )}
            <TweeterVerifiedBadge kind={post.author.badgeKind} className="forum-user-badge" />
          </div>
        </aside>
        <div className="forum-post-content-panel">
          <header className="forum-post-clean-header">
            <div className="forum-post-titleline">
              <span className="forum-post-index">{isStarter ? 'Opening post' : `Reply #${index}`}</span>
              <small>{post.source === 'discord' ? 'Synced from Discord' : 'Posted from the website'}</small>
            </div>
            <div className="forum-post-header-meta">
              <time dateTime={post.createdAt}>{relative(post.createdAt)} · {format(post.createdAt)}</time>
              <span className={`forum-source-icon source-${post.source}`} title={sourceLabel} aria-label={sourceLabel}><i className={sourceIcon} aria-hidden="true" /></span>
            </div>
          </header>
          <PostBody body={post.body} />
          <div className="forum-post-footer-actions">
            {reactionBar(post)}
            {canModerate ? (
              <div className="forum-moderation-actions">
                <button type="button" disabled={Boolean(moderationBusy)} onClick={() => moderatePost(post.id, 'hide')}>Hide</button>
                <button type="button" disabled={Boolean(moderationBusy)} onClick={() => moderatePost(post.id, 'delete')}>Delete + sync</button>
              </div>
            ) : null}
          </div>
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
          {canModerate ? (
            <div className="forum-thread-moderation-toolbar">
              <button type="button" onClick={() => moderateThread(thread.pinned ? 'unpin' : 'pin')} disabled={Boolean(moderationBusy)}>{thread.pinned ? 'Unpin' : 'Pin'}</button>
              <button type="button" onClick={() => moderateThread(thread.status === 'locked' ? 'open' : 'lock')} disabled={Boolean(moderationBusy)}>{thread.status === 'locked' ? 'Unlock' : 'Lock'}</button>
              <button type="button" onClick={() => moderateThread('archive')} disabled={Boolean(moderationBusy)}>Archive</button>
              <button type="button" onClick={() => moderateThread('hide')} disabled={Boolean(moderationBusy)}>Hide + sync</button>
              <button type="button" className="danger" onClick={() => moderateThread('delete')} disabled={Boolean(moderationBusy)}>Delete + sync</button>
            </div>
          ) : null}
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
        <h2>{thread.status === 'locked' || thread.status === 'archived' ? 'This thread is closed.' : 'Add to the discussion.'}</h2>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} disabled={!signedIn || busy || thread.status === 'locked' || thread.status === 'archived'} rows={7} maxLength={6000} placeholder="Write a thoughtful reply… Discord emotes and image links will render cleanly when imported." />
        {message ? <p className={`notice ${message.includes('Could not') || message.includes('Sign in') ? 'warning' : 'success'}`}>{message}</p> : null}
        {signedIn ? <button className="button button-primary" type="submit" disabled={busy || thread.status === 'locked' || thread.status === 'archived'}><i className="fa-solid fa-reply" aria-hidden="true" /> {busy ? 'Posting…' : 'Post reply'}</button> : <a className="button button-primary" href={`/api/auth/steam?returnTo=/forum/thread/${thread.id}`}><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in to reply</a>}
      </form>
    </div>
  );
}
