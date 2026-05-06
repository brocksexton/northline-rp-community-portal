'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { TweeterAccountModeration, TweeterAccountStatus } from '@/lib/tweeter-moderation-data';

type Props = {
  initialAccounts: TweeterAccountModeration[];
  canManage: boolean;
};

const statusOptions: Array<{ value: TweeterAccountStatus; label: string; description: string }> = [
  { value: 'none', label: 'Visible / clear', description: 'Remove website-only Tweeter restrictions.' },
  { value: 'hidden', label: 'Hide profile', description: 'Hide the profile from Tweeter discovery and public profile view.' },
  { value: 'soft_ban', label: 'Soft ban', description: 'Keep the profile visible but disable the user’s likes, follows, DMs, and profile changes.' },
  { value: 'full_ban', label: 'Full ban', description: 'Hide the profile and disable all Tweeter features for the account.' },
];

function formatDate(value?: string | null) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Unknown';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function toLocalInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function TweeterAdminPanel({ initialAccounts, canManage }: Props) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [steamId, setSteamId] = useState('');
  const [status, setStatus] = useState<TweeterAccountStatus>('soft_ban');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return accounts;
    return accounts.filter((account) => account.steamId.includes(clean) || account.status.toLowerCase().includes(clean) || account.reason.toLowerCase().includes(clean));
  }, [accounts, query]);

  function edit(account: TweeterAccountModeration) {
    setSteamId(account.steamId);
    setStatus(account.status);
    setReason(account.reason);
    setNote(account.note ?? '');
    setExpiresAt(toLocalInput(account.expiresAt));
    setMessage('Loaded account restriction.');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/staff/tweeter/accounts', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          steamId,
          status,
          reason,
          note,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; accounts?: TweeterAccountModeration[] };
      if (!response.ok) throw new Error(payload.error || 'Could not save restriction.');
      setAccounts(payload.accounts ?? []);
      setMessage(status === 'none' ? 'Restriction cleared.' : 'Restriction saved.');
      if (status === 'none') {
        setReason('');
        setNote('');
        setExpiresAt('');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save restriction.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tweeter-admin-grid">
      <article className="staff-panel tweeter-admin-editor">
        <div className="section-heading">
          <span className="kicker">Tweeter accounts</span>
          <h2>Moderate website profiles</h2>
          <p>Hide profiles, soft-ban website actions, or fully ban an account from Tweeter without deleting game data.</p>
        </div>

        {!canManage ? <div className="notice warning"><p>Read-only view. Developer access is required to save account restrictions.</p></div> : null}

        <form onSubmit={submit}>
          <label>
            <span>SteamID64</span>
            <input value={steamId} onChange={(event) => setSteamId(event.target.value)} placeholder="7656119..." inputMode="numeric" disabled={!canManage} />
          </label>

          <div className="tweeter-admin-status-grid" role="radiogroup" aria-label="Tweeter account status">
            {statusOptions.map((option) => (
              <button key={option.value} type="button" className={status === option.value ? 'active' : ''} disabled={!canManage} onClick={() => setStatus(option.value)}>
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>

          <label>
            <span>Public/staff reason</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={420} placeholder="Reason shown in account notices." disabled={!canManage || status === 'none'} />
          </label>

          <label>
            <span>Internal note</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Optional note for staff." disabled={!canManage || status === 'none'} />
          </label>

          <label>
            <span>Optional expiry</span>
            <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} disabled={!canManage || status === 'none'} />
          </label>

          <div className="tweeter-admin-actions">
            <span>{message}</span>
            <button type="submit" disabled={!canManage || saving || !steamId.trim()}>{saving ? 'Saving…' : status === 'none' ? 'Clear restriction' : 'Save restriction'}</button>
          </div>
        </form>
      </article>

      <article className="staff-panel tweeter-admin-list">
        <div className="section-heading">
          <span className="kicker">Active restrictions</span>
          <h2>{accounts.length.toLocaleString()} account{accounts.length === 1 ? '' : 's'}</h2>
          <p>Website-only Tweeter moderation actions currently stored on this web host.</p>
        </div>
        <label className="tweeter-admin-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SteamID, status, or reason" />
        </label>
        <div className="tweeter-admin-account-list">
          {filtered.length ? filtered.map((account) => (
            <div className={`tweeter-admin-account status-${account.status}`} key={account.steamId}>
              <div>
                <strong>{account.steamId}</strong>
                <span>{account.status.replace('_', ' ')}</span>
                <p>{account.reason}</p>
                {account.note ? <small>Note: {account.note}</small> : null}
              </div>
              <dl>
                <div><dt>Updated</dt><dd>{formatDate(account.updatedAt)}</dd></div>
                <div><dt>Expires</dt><dd>{formatDate(account.expiresAt)}</dd></div>
                <div><dt>Staff</dt><dd>{account.staffName}</dd></div>
              </dl>
              <div className="tweeter-admin-row-actions">
                <Link href={`/tweeter/profile/${account.steamId}`}>Profile</Link>
                <button type="button" onClick={() => edit(account)}>Edit</button>
              </div>
            </div>
          )) : <div className="tweeter-admin-empty"><strong>No matching restrictions.</strong><p>Hidden, soft-banned, and full-banned accounts will appear here.</p></div>}
        </div>
      </article>
    </div>
  );
}
