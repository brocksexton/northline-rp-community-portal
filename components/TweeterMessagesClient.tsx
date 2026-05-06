'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';

type TweeterUser = {
  steamId: string;
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
  verifiedKind?: string;
};

type DirectMessage = {
  id: string;
  fromSteamId: string;
  toSteamId: string;
  body: string;
  createdAt: string;
};

type Summary = {
  otherSteamId: string;
  lastMessage: DirectMessage;
  unreadCount: number;
};

type InitialData = {
  currentSteamId: string;
  summaries: Summary[];
  users: Record<string, TweeterUser>;
  selectedSteamId?: string | null;
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatConversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = Date.now();
  const diff = now - date.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff >= 0 && diff < day) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function verifiedBadge(kind?: string) {
  if (!kind || kind === 'None') return null;
  return <span className="tweeter-verified" title={kind} aria-label={kind}><span className="verified-check">✓</span></span>;
}

export function TweeterMessagesClient({ initialData }: { initialData: InitialData }) {
  const [summaries, setSummaries] = useState(initialData.summaries);
  const [users, setUsers] = useState(initialData.users);
  const [selectedSteamId, setSelectedSteamId] = useState(initialData.selectedSteamId ?? initialData.summaries[0]?.otherSteamId ?? '');
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const bubblesEndRef = useRef<HTMLDivElement | null>(null);

  const selectedUser = selectedSteamId ? users[selectedSteamId] : null;

  async function refreshSummaries() {
    try {
      const response = await fetch('/api/tweeter/social/messages', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) return;
      const data = await response.json() as { summaries: Summary[]; users: Record<string, TweeterUser> };
      setSummaries(data.summaries);
      setUsers((current) => ({ ...current, ...data.users }));
    } catch {
      // keep current view
    }
  }

  async function loadConversation(steamId: string) {
    if (!steamId) return;
    try {
      const response = await fetch(`/api/tweeter/social/messages?with=${encodeURIComponent(steamId)}`, { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) return;
      const data = await response.json() as { messages: DirectMessage[]; otherUser: TweeterUser };
      setMessages(data.messages);
      setUsers((current) => ({ ...current, [data.otherUser.steamId]: data.otherUser }));
      await refreshSummaries();
    } catch {
      // keep current conversation
    }
  }

  useEffect(() => {
    if (selectedSteamId) void loadConversation(selectedSteamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSteamId]);

  useEffect(() => {
    bubblesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, selectedSteamId]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSteamId || !body.trim() || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/tweeter/social/messages', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ toSteamId: selectedSteamId, body }),
      });
      if (!response.ok) throw new Error('send_failed');
      setBody('');
      await loadConversation(selectedSteamId);
    } catch {
      setNotice('Could not send that message right now.');
    } finally {
      setBusy(false);
    }
  }

  const empty = useMemo(() => summaries.length === 0 && !selectedSteamId, [summaries.length, selectedSteamId]);

  return (
    <main className="tweeter-shell tweeter-messages-shell">
      <div className="tweeter-messages-layout">
        <aside className="tweeter-messages-list">
          <header>
            <Link className="tweeter-message-back" href="/tweeter" aria-label="Back to Tweeter"><i className="fa-solid fa-arrow-left" aria-hidden="true" /></Link>
            <div><h1>Messages</h1><p>Private website DMs for Northline citizens.</p></div>
          </header>
          {summaries.length ? summaries.map((summary) => {
            const user = users[summary.otherSteamId];
            const displayName = user?.displayName ?? `Citizen ${summary.otherSteamId.slice(-6)}`;
            const mine = summary.lastMessage.fromSteamId === initialData.currentSteamId;
            return (
              <button type="button" key={summary.otherSteamId} className={selectedSteamId === summary.otherSteamId ? 'active' : ''} onClick={() => setSelectedSteamId(summary.otherSteamId)}>
                <UserAvatar src={user?.avatarUrl ?? null} name={displayName} size="md" />
                <span>
                  <span className="tweeter-message-person-line"><strong>{displayName} {verifiedBadge(user?.verifiedKind)}</strong><time dateTime={summary.lastMessage.createdAt}>{formatConversationTime(summary.lastMessage.createdAt)}</time></span>
                  <small>{mine ? 'You: ' : ''}{summary.lastMessage.body}</small>
                  <small className="tweeter-message-handle">{user?.handle ?? '@citizen'}</small>
                </span>
                {summary.unreadCount ? <em>{summary.unreadCount}</em> : null}
              </button>
            );
          }) : (
            <div className="tweeter-message-empty-mini">
              <i className="fa-regular fa-comments" aria-hidden="true" />
              <strong>No messages yet</strong>
              <p>Open someone’s profile and press Message to start a conversation.</p>
            </div>
          )}
        </aside>

        <section className="tweeter-message-thread">
          {empty ? (
            <div className="tweeter-message-empty-state">
              <i className="fa-regular fa-envelope" aria-hidden="true" />
              <h2>No conversations yet</h2>
              <p>Follow citizens, open profiles, and start a small website-only chat when you need to coordinate outside the game.</p>
            </div>
          ) : selectedUser ? (
            <>
              <header className="tweeter-message-thread-head">
                <UserAvatar src={selectedUser.avatarUrl ?? null} name={selectedUser.displayName} size="md" />
                <div>
                  <h2>{selectedUser.displayName} {verifiedBadge(selectedUser.verifiedKind)}</h2>
                  <Link href={`/tweeter/profile/${selectedUser.steamId}`}>{selectedUser.handle}</Link>
                </div>
                <Link className="tweeter-message-profile-link" href={`/tweeter/profile/${selectedUser.steamId}`}>View profile</Link>
              </header>

              <div className="tweeter-message-bubbles">
                {messages.length ? messages.map((message) => {
                  const mine = message.fromSteamId === initialData.currentSteamId;
                  return (
                    <article key={message.id} className={mine ? 'mine' : ''}>
                      <p>{message.body}</p>
                      <small>{formatTime(message.createdAt)}</small>
                    </article>
                  );
                }) : <div className="tweeter-message-empty-mini"><i className="fa-regular fa-message" aria-hidden="true" /><strong>No messages here yet</strong><p>Send the first one.</p></div>}
                <div ref={bubblesEndRef} />
              </div>

              <form className="tweeter-message-compose" onSubmit={send}>
                <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} placeholder={`Message ${selectedUser.displayName}…`} />
                <div>
                  <span className={notice ? 'error' : ''}>{notice || `${body.length}/1000`}</span>
                  <button type="submit" disabled={busy || !body.trim()}>{busy ? 'Sending…' : 'Send'}</button>
                </div>
              </form>
            </>
          ) : (
            <div className="tweeter-message-empty-state"><h2>Choose a conversation</h2></div>
          )}
        </section>
      </div>
    </main>
  );
}
