'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { TweeterAccountModeration, TweeterAccountStatus } from '@/lib/tweeter-moderation-data';

type Props = {
  initialAccounts: TweeterAccountModeration[];
  canManage: boolean;
};

type FilterStatus = TweeterAccountStatus | 'all';

const statusOptions: Array<{ value: TweeterAccountStatus; label: string; short: string; description: string; icon: string }> = [
  { value: 'none', label: 'Clear', short: 'Visible', description: 'Remove website-only Tweeter restrictions.', icon: 'fa-solid fa-circle-check' },
  { value: 'hidden', label: 'Hide profile', short: 'Hidden', description: 'Hide the profile from discovery, public views, and DMs.', icon: 'fa-solid fa-eye-slash' },
  { value: 'soft_ban', label: 'Soft ban', short: 'Limited', description: 'Keep the profile visible, but lock likes, follows, DMs, and edits.', icon: 'fa-solid fa-hand' },
  { value: 'full_ban', label: 'Full ban', short: 'Banned', description: 'Hide the profile and lock Tweeter features for the account.', icon: 'fa-solid fa-ban' },
];

const statusMeta = new Map(statusOptions.map((option) => [option.value, option]));

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

function statusLabel(status: TweeterAccountStatus) {
  return statusMeta.get(status)?.short ?? status.replace('_', ' ');
}

function defaultReason(status: TweeterAccountStatus) {
  if (status === 'hidden') return 'This Tweeter profile has been hidden by staff.';
  if (status === 'soft_ban') return 'This account has limited Tweeter access from staff moderation.';
  if (status === 'full_ban') return 'This account has been banned from Tweeter.';
  return '';
}

function statusHelp(status: TweeterAccountStatus) {
  return statusMeta.get(status)?.description ?? 'Moderation action.';
}

function isExpiringSoon(value?: string | null) {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return false;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return time > Date.now() && time - Date.now() <= sevenDays;
}

function statusCounts(accounts: TweeterAccountModeration[]) {
  return {
    hidden: accounts.filter((account) => account.status === 'hidden').length,
    soft: accounts.filter((account) => account.status === 'soft_ban').length,
    full: accounts.filter((account) => account.status === 'full_ban').length,
    temporary: accounts.filter((account) => Boolean(account.expiresAt)).length,
    expiringSoon: accounts.filter((account) => isExpiringSoon(account.expiresAt)).length,
  };
}

export function TweeterAdminPanel({ initialAccounts, canManage }: Props) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [steamId, setSteamId] = useState('');
  const [status, setStatus] = useState<TweeterAccountStatus>('soft_ban');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const counts = useMemo(() => statusCounts(accounts), [accounts]);

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return accounts.filter((account) => {
      if (statusFilter !== 'all' && account.status !== statusFilter) return false;
      if (!clean) return true;
      return [account.steamId, account.status, account.reason, account.note ?? '', account.staffName]
        .some((value) => value.toLowerCase().includes(clean));
    });
  }, [accounts, query, statusFilter]);

  function applyStatus(nextStatus: TweeterAccountStatus) {
    setStatus(nextStatus);
    if (nextStatus !== 'none' && !reason.trim()) setReason(defaultReason(nextStatus));
    if (nextStatus === 'none') setReason('');
  }

  function edit(account: TweeterAccountModeration) {
    setSteamId(account.steamId);
    setStatus(account.status);
    setReason(account.reason);
    setNote(account.note ?? '');
    setExpiresAt(toLocalInput(account.expiresAt));
    setMessage('Loaded restriction into the editor.');
  }

  function resetForm() {
    setSteamId('');
    setStatus('soft_ban');
    setReason('');
    setNote('');
    setExpiresAt('');
    setMessage('Editor cleared.');
  }

  function setExpiryDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const offset = date.getTimezoneOffset() * 60000;
    setExpiresAt(new Date(date.getTime() - offset).toISOString().slice(0, 16));
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
    <div className="tweeter-admin-workspace">
      <section className="tweeter-admin-overview" aria-label="Tweeter moderation summary">
        <article>
          <span>Hidden</span>
          <strong>{counts.hidden.toLocaleString()}</strong>
          <p>Profiles removed from public Tweeter views.</p>
        </article>
        <article>
          <span>Soft bans</span>
          <strong>{counts.soft.toLocaleString()}</strong>
          <p>Visible accounts with social actions locked.</p>
        </article>
        <article>
          <span>Full bans</span>
          <strong>{counts.full.toLocaleString()}</strong>
          <p>Fully blocked from Tweeter surfaces.</p>
        </article>
        <article>
          <span>Temporary</span>
          <strong>{counts.temporary.toLocaleString()}</strong>
          <p>{counts.expiringSoon ? `${counts.expiringSoon} expiring soon.` : 'Expiry-backed actions.'}</p>
        </article>
      </section>

      <div className="tweeter-admin-grid">
        <article className="staff-panel tweeter-admin-editor">
          <div className="section-heading tweeter-admin-heading">
            <span className="kicker">Account action</span>
            <h2>Moderate a profile</h2>
            <p>Enter a SteamID64, choose the action, and save. This only affects the website/Tweeter layer.</p>
          </div>

          {!canManage ? <div className="notice warning"><p>Read-only view. Developer access is required to save account restrictions.</p></div> : null}

          <form onSubmit={submit}>
            <label className="tweeter-admin-steamid-field">
              <span>SteamID64</span>
              <input value={steamId} onChange={(event) => setSteamId(event.target.value)} placeholder="7656119..." inputMode="numeric" disabled={!canManage} />
            </label>

            <div className="tweeter-admin-status-grid" role="radiogroup" aria-label="Tweeter account status">
              {statusOptions.map((option) => (
                <button key={option.value} type="button" className={`status-choice-${option.value} ${status === option.value ? 'active' : ''}`} disabled={!canManage} onClick={() => applyStatus(option.value)}>
                  <i className={option.icon} aria-hidden="true" />
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>

            <div className="tweeter-admin-form-grid">
              <label>
                <span>Public reason</span>
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={420} placeholder="Reason shown in account notices." disabled={!canManage || status === 'none'} />
              </label>

              <label>
                <span>Internal note</span>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Optional note for staff." disabled={!canManage || status === 'none'} />
              </label>
            </div>

            <div className="tweeter-admin-expiry-row">
              <label>
                <span>Optional expiry</span>
                <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} disabled={!canManage || status === 'none'} />
              </label>
              <div className="tweeter-admin-expiry-presets" aria-label="Expiry presets">
                <button type="button" onClick={() => setExpiryDays(1)} disabled={!canManage || status === 'none'}>24h</button>
                <button type="button" onClick={() => setExpiryDays(7)} disabled={!canManage || status === 'none'}>7d</button>
                <button type="button" onClick={() => setExpiryDays(30)} disabled={!canManage || status === 'none'}>30d</button>
                <button type="button" onClick={() => setExpiresAt('')} disabled={!canManage || status === 'none'}>No expiry</button>
              </div>
            </div>

            <div className={`tweeter-admin-action-preview preview-${status}`}>
              <i className={statusMeta.get(status)?.icon ?? 'fa-solid fa-circle-info'} aria-hidden="true" />
              <div>
                <strong>{statusLabel(status)}</strong>
                <p>{statusHelp(status)}</p>
              </div>
            </div>

            <div className="tweeter-admin-actions">
              <span>{message}</span>
              <div>
                <button type="button" className="secondary" onClick={resetForm} disabled={!canManage || saving}>Reset</button>
                <button type="submit" disabled={!canManage || saving || !steamId.trim()}>{saving ? 'Saving…' : status === 'none' ? 'Clear restriction' : 'Save restriction'}</button>
              </div>
            </div>
          </form>
        </article>

        <article className="staff-panel tweeter-admin-list">
          <div className="section-heading tweeter-admin-heading">
            <span className="kicker">Active restrictions</span>
            <h2>{accounts.length.toLocaleString()} account{accounts.length === 1 ? '' : 's'}</h2>
            <p>Search, review, and jump straight into a profile without digging through raw files.</p>
          </div>

          <div className="tweeter-admin-list-tools">
            <label className="tweeter-admin-search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SteamID, staff, status, reason" />
            </label>
            <div className="tweeter-admin-filter-pills" aria-label="Filter restrictions">
              {(['all', 'hidden', 'soft_ban', 'full_ban'] as FilterStatus[]).map((filter) => (
                <button key={filter} type="button" className={statusFilter === filter ? 'active' : ''} onClick={() => setStatusFilter(filter)}>
                  {filter === 'all' ? 'All' : statusLabel(filter)}
                </button>
              ))}
            </div>
          </div>

          <div className="tweeter-admin-account-list">
            {filtered.length ? filtered.map((account) => {
              const meta = statusMeta.get(account.status);
              return (
                <div className={`tweeter-admin-account status-${account.status}`} key={account.steamId}>
                  <div className="tweeter-admin-account-main">
                    <span className="tweeter-admin-status-badge"><i className={meta?.icon ?? 'fa-solid fa-circle-info'} aria-hidden="true" /> {statusLabel(account.status)}</span>
                    <strong>{account.steamId}</strong>
                    <p>{account.reason}</p>
                    {account.note ? <small>Internal note: {account.note}</small> : null}
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
              );
            }) : <div className="tweeter-admin-empty"><strong>No matching restrictions.</strong><p>Try clearing the search or switching the filter back to All.</p></div>}
          </div>
        </article>
      </div>
    </div>
  );
}
