'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
            <Link href="/tweeter" aria-label="Back to Tweeter">←</Link>
            <div><h1>Messages</h1><p>Website-only DMs for Northline. These do not touch the game server.</p></div>
          </header>
          {summaries.length ? summaries.map((summary) => {
            const user = users[summary.otherSteamId];
            return (
              <button type="button" key={summary.otherSteamId} className={selectedSteamId === summary.otherSteamId ? 'active' : ''} onClick={() => setSelectedSteamId(summary.otherSteamId)}>
                <UserAvatar src={user?.avatarUrl ?? null} name={user?.displayName ?? 'Citizen'} size="sm" />
                <span>
                  <strong>{user?.displayName ?? `Citizen ${summary.otherSteamId.slice(-6)}`}</strong>
                  <small>{summary.lastMessage.body}</small>
                </span>
                {summary.unreadCount ? <em>{summary.unreadCount}</em> : null}
              </button>
            );
          }) : (
            <div className="tweeter-message-empty-mini">
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
                }) : <div className="tweeter-message-empty-mini"><strong>No messages here yet</strong><p>Send the first one.</p></div>}
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
