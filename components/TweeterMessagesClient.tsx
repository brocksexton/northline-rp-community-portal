'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';
import { TweeterVerifiedBadge } from '@/components/TweeterVerifiedBadge';

type TweeterUser = {
  steamId: string;
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
  verifiedKind?: string;
  bio?: string;
  joinedAt?: string | null;
  hasPlayedInServer?: boolean;
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
  suggestions?: TweeterUser[];
  serverLocked?: boolean;
  lockReason?: string;
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

function mergeUsers(users: Record<string, TweeterUser>, suggestions: TweeterUser[]) {
  const next = { ...users };
  for (const user of suggestions) next[user.steamId] = { ...next[user.steamId], ...user };
  return next;
}

export function TweeterMessagesClient({ initialData }: { initialData: InitialData }) {
  const initialSuggestions = initialData.suggestions ?? [];
  const [summaries, setSummaries] = useState(initialData.summaries);
  const [users, setUsers] = useState(() => mergeUsers(initialData.users, initialSuggestions));
  const [selectedSteamId, setSelectedSteamId] = useState(initialData.serverLocked ? '' : (initialData.selectedSteamId ?? initialData.summaries[0]?.otherSteamId ?? ''));
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const bubblesEndRef = useRef<HTMLDivElement | null>(null);

  const serverLocked = !!initialData.serverLocked;
  const lockReason = initialData.lockReason || 'Join the Northline game server once before using website DMs.';
  const suggestions = useMemo(() => initialSuggestions.filter((user) => user.steamId !== initialData.currentSteamId), [initialData.currentSteamId, initialSuggestions]);
  const selectedUser = selectedSteamId ? users[selectedSteamId] : null;

  async function refreshSummaries() {
    if (serverLocked) return;
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
    if (!steamId || serverLocked) return;
    try {
      const response = await fetch(`/api/tweeter/social/messages?with=${encodeURIComponent(steamId)}`, { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        setNotice(data.error || 'That conversation is not available right now.');
        setMessages([]);
        return;
      }
      const data = await response.json() as { messages: DirectMessage[]; otherUser: TweeterUser };
      setMessages(data.messages);
      setUsers((current) => ({ ...current, [data.otherUser.steamId]: data.otherUser }));
      await refreshSummaries();
    } catch {
      // keep current conversation
    }
  }

  function selectConversation(steamId: string) {
    if (serverLocked) return;
    setSelectedSteamId(steamId);
    setNotice('');
    setBody('');
    const url = new URL(window.location.href);
    url.searchParams.set('with', steamId);
    window.history.replaceState(null, '', url.toString());
  }

  useEffect(() => {
    if (selectedSteamId && !serverLocked) void loadConversation(selectedSteamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSteamId, serverLocked]);

  useEffect(() => {
    bubblesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, selectedSteamId]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (serverLocked) {
      setNotice(lockReason);
      return;
    }
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
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || 'send_failed');
      }
      setBody('');
      await loadConversation(selectedSteamId);
    } catch (error) {
      setNotice(error instanceof Error && error.message !== 'send_failed' ? error.message : 'Could not send that message right now.');
    } finally {
      setBusy(false);
    }
  }

  const visibleSummaries = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return summaries;
    return summaries.filter((summary) => {
      const user = users[summary.otherSteamId];
      return (user?.displayName ?? '').toLowerCase().includes(clean)
        || (user?.handle ?? '').toLowerCase().includes(clean)
        || summary.lastMessage.body.toLowerCase().includes(clean);
    });
  }, [query, summaries, users]);

  const visibleSuggestions = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return suggestions
      .filter((user) => !summaries.some((summary) => summary.otherSteamId === user.steamId))
      .filter((user) => !clean || user.displayName.toLowerCase().includes(clean) || user.handle.toLowerCase().includes(clean))
      .slice(0, 5);
  }, [query, suggestions, summaries]);

  const emptyInbox = summaries.length === 0 && !selectedSteamId;

  return (
    <main className="tweeter-shell tweeter-messages-shell">
      <div className="tweeter-messages-layout twitter-dm-layout">
        <aside className="tweeter-messages-list">
          <header>
            <Link className="tweeter-message-back" href="/tweeter" aria-label="Back to Tweeter"><i className="fa-solid fa-arrow-left" aria-hidden="true" /></Link>
            <div><h1>Messages</h1><p>Private website DMs for Northline citizens.</p></div>
            <Link className="tweeter-message-new" href="/tweeter" aria-label="Find citizens to message"><i className="fa-regular fa-pen-to-square" aria-hidden="true" /></Link>
          </header>

          <label className="tweeter-message-search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Direct Messages" disabled={serverLocked} />
          </label>

          {serverLocked ? (
            <div className="tweeter-message-empty-mini locked">
              <i className="fa-solid fa-lock" aria-hidden="true" />
              <strong>Messages locked</strong>
              <p>{lockReason}</p>
            </div>
          ) : visibleSummaries.length ? visibleSummaries.map((summary) => {
            const user = users[summary.otherSteamId];
            const displayName = user?.displayName ?? `Citizen ${summary.otherSteamId.slice(-6)}`;
            const mine = summary.lastMessage.fromSteamId === initialData.currentSteamId;
            return (
              <button type="button" key={summary.otherSteamId} className={selectedSteamId === summary.otherSteamId ? 'active' : ''} onClick={() => selectConversation(summary.otherSteamId)}>
                <UserAvatar src={user?.avatarUrl ?? null} name={displayName} size="md" />
                <span>
                  <span className="tweeter-message-person-line"><strong>{displayName} <TweeterVerifiedBadge kind={user?.verifiedKind} /></strong><time dateTime={summary.lastMessage.createdAt}>{formatConversationTime(summary.lastMessage.createdAt)}</time></span>
                  <small>{mine ? 'You: ' : ''}{summary.lastMessage.body}</small>
                  <small className="tweeter-message-handle">{user?.handle ?? '@citizen'}</small>
                </span>
                {summary.unreadCount ? <em>{summary.unreadCount}</em> : null}
              </button>
            );
          }) : (
            <div className="tweeter-message-empty-mini">
              <i className="fa-regular fa-comments" aria-hidden="true" />
              <strong>{query ? 'No matching conversations' : 'No messages yet'}</strong>
              <p>{query ? 'Try another name, handle, or message.' : 'Start with a citizen below or open a profile and press Message.'}</p>
            </div>
          )}

          {!serverLocked && visibleSuggestions.length ? (
            <section className="tweeter-message-suggestions" aria-label="Suggested message recipients">
              <span>Suggested citizens</span>
              {visibleSuggestions.map((user) => (
                <button type="button" key={user.steamId} onClick={() => selectConversation(user.steamId)}>
                  <UserAvatar src={user.avatarUrl ?? null} name={user.displayName} size="sm" />
                  <strong>{user.displayName}</strong>
                  <small>{user.handle}</small>
                </button>
              ))}
            </section>
          ) : null}

          <footer className="tweeter-message-sidebar-note">
            <strong>Website-only DMs</strong>
            <span>Use these for quick coordination outside the game. In-character actions still belong on the server.</span>
          </footer>
        </aside>

        <section className="tweeter-message-thread">
          {serverLocked ? (
            <div className="tweeter-message-empty-state locked">
              <i className="fa-solid fa-lock" aria-hidden="true" />
              <h2>Join the game server to unlock messages</h2>
              <p>{lockReason} After the server records your first join date, the DM inbox, follows, likes, and profile tools will unlock here.</p>
              <Link className="tweeter-message-profile-link" href="/tweeter">Back to Tweeter</Link>
            </div>
          ) : selectedUser ? (
            <>
              <header className="tweeter-message-thread-head">
                <UserAvatar src={selectedUser.avatarUrl ?? null} name={selectedUser.displayName} size="md" />
                <div>
                  <h2>{selectedUser.displayName} <TweeterVerifiedBadge kind={selectedUser.verifiedKind} /></h2>
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
                }) : (
                  <div className="tweeter-message-thread-starter">
                    <UserAvatar src={selectedUser.avatarUrl ?? null} name={selectedUser.displayName} size="xl" />
                    <h2>{selectedUser.displayName}</h2>
                    <span>{selectedUser.handle}</span>
                    <p>{selectedUser.bio || 'Start a private website-only conversation with this Northline citizen.'}</p>
                    <Link href={`/tweeter/profile/${selectedUser.steamId}`}>View profile</Link>
                  </div>
                )}
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
            <div className="tweeter-message-empty-state">
              <i className="fa-regular fa-envelope" aria-hidden="true" />
              <h2>{emptyInbox ? 'Welcome to your inbox' : 'Select a conversation'}</h2>
              <p>{emptyInbox ? 'Choose a suggested citizen, search for an existing DM, or open any Tweeter profile and press Message.' : 'Pick a conversation from the left to continue chatting.'}</p>
              {visibleSuggestions.length ? (
                <div className="tweeter-message-start-grid">
                  {visibleSuggestions.slice(0, 3).map((user) => (
                    <button type="button" key={user.steamId} onClick={() => selectConversation(user.steamId)}>
                      <UserAvatar src={user.avatarUrl ?? null} name={user.displayName} size="md" />
                      <strong>{user.displayName}</strong>
                      <small>{user.handle}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
