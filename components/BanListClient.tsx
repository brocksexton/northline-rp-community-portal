'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';

type BanRecord = {
  id: string;
  steamId: string;
  playerName: string;
  avatarUrl?: string | null;
  reason: string;
  staffSteamId: string | null;
  staffName: string;
  staffAvatarUrl?: string | null;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  isPermanent: boolean;
  source: 'blacklist' | 'admin_log';
  rawAction?: string | null;
};

type BanPayload = {
  generatedAt: string;
  records: BanRecord[];
  summary: { total: number; active: number; temporary: number; expired: number; latestAt: string | null };
};

type Filter = 'all' | 'active' | 'expired' | 'permanent';

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getStatus(ban: BanRecord, now: number) {
  if (ban.revokedAt) return { label: 'EXPIRED', tone: 'expired', detail: `Lifted ${new Date(ban.revokedAt).toLocaleDateString()}` };
  if (ban.isPermanent || !ban.expiresAt) return { label: 'PERMANENT', tone: 'permanent', detail: 'No scheduled expiry' };
  const remaining = new Date(ban.expiresAt).getTime() - now;
  if (remaining <= 0) return { label: 'EXPIRED', tone: 'expired', detail: 'Time served' };
  return { label: 'ACTIVE', tone: 'active', detail: formatCountdown(remaining) };
}

function relativeDate(value: string | null) {
  if (!value) return 'No records yet';
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatIssued(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  };
}

function BanCard({ ban, now }: { ban: BanRecord; now: number }) {
  const status = getStatus(ban, now);
  const issued = formatIssued(ban.createdAt);
  const isTemporary = !ban.isPermanent && ban.expiresAt;

  return (
    <article className={`ban-card ban-${status.tone}`}>
      <div className="ban-person">
        <UserAvatar src={ban.avatarUrl ?? null} name={ban.playerName} size="md" />
        <div>
          <Link href={`/u/${ban.steamId}`}><strong>{ban.playerName}</strong></Link>
          <span>{ban.steamId}</span>
          <small>{isTemporary ? 'Temporary ban' : ban.isPermanent ? 'Permanent ban' : 'Moderation action'}</small>
        </div>
      </div>

      <div className="ban-reason">
        <span>Reason</span>
        <p>{ban.reason || 'No reason provided'}</p>
      </div>

      <div className="ban-staff">
        <span>Issued by</span>
        <div className="ban-staff-person">
          <UserAvatar src={ban.staffAvatarUrl ?? null} name={ban.staffName || 'Staff'} size="sm" />
          <div>
            <strong>{ban.staffName || 'Staff'}</strong>
            {ban.staffSteamId ? <small>{ban.staffSteamId}</small> : null}
          </div>
        </div>
      </div>

      <div className="ban-dates">
        <span>Issued</span>
        <strong>{issued.date}</strong>
        <small>{issued.time}</small>
      </div>

      <div className="ban-status-box">
        <span className={`ban-state-pill ${status.tone}`}>{status.label}</span>
        <strong>{status.detail}</strong>
        {ban.expiresAt && !ban.revokedAt ? <small>Expires {new Date(ban.expiresAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</small> : null}
      </div>
    </article>
  );
}

export function BanListClient({ initialData }: { initialData: BanPayload }) {
  const [data, setData] = useState(initialData);
  const [now, setNow] = useState(Date.now());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(async () => {
      try {
        const response = await fetch('/api/bans', { cache: 'no-store', credentials: 'same-origin' });
        if (response.ok) setData(await response.json());
      } catch {}
    }, 20000);
    return () => { window.clearInterval(tick); window.clearInterval(poll); };
  }, []);

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return data.records.filter((ban) => {
      const status = getStatus(ban, now);
      if (filter === 'active' && status.tone !== 'active' && status.tone !== 'permanent') return false;
      if (filter === 'expired' && status.tone !== 'expired') return false;
      if (filter === 'permanent' && !ban.isPermanent) return false;
      if (!clean) return true;
      return ban.playerName.toLowerCase().includes(clean)
        || ban.reason.toLowerCase().includes(clean)
        || ban.steamId.includes(clean)
        || ban.staffName.toLowerCase().includes(clean);
    });
  }, [data.records, filter, now, query]);

  return (
    <main className="page-shell bans-shell">
      <section className="bans-hero">
        <div>
          <span className="nl-kicker"><i /> Moderation record</span>
          <h1>Ban List</h1>
          <p>Recent account actions from Northline RP. Temporary bans count down live; completed actions are marked expired.</p>
        </div>
        <div className="bans-summary-card">
          <span>Latest action</span>
          <strong>{relativeDate(data.summary.latestAt)}</strong>
          <small>Refreshed {new Date(data.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small>
        </div>
      </section>

      <section className="bans-stats" aria-label="Ban summary">
        <div><span>Total records</span><strong>{data.summary.total}</strong></div>
        <div><span>Active</span><strong>{data.summary.active}</strong></div>
        <div><span>Expired</span><strong>{data.summary.expired}</strong></div>
        <div><span>Temporary</span><strong>{data.summary.temporary}</strong></div>
      </section>

      <section className="ban-controls">
        <label><span>Search records</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Player, SteamID, staff, or reason" /></label>
        <div className="ban-filter-tabs" role="tablist" aria-label="Filter bans">
          {(['all','active','expired','permanent'] as Filter[]).map((value) => <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
        </div>
      </section>

      <section className="ban-list-panel">
        <div className="ban-list-header"><div><h2>Moderation history</h2><p>{filtered.length} {filtered.length === 1 ? 'record' : 'records'} shown</p></div><span>Auto-refreshes every 20s</span></div>
        {filtered.length ? <div className="ban-list">{filtered.map((ban) => <BanCard key={ban.id} ban={ban} now={now} />)}</div> : <div className="ban-empty-state"><strong>No bans to show</strong><p>No matching records were found. Once staff issue account actions, they will appear here automatically.</p></div>}
      </section>
    </main>
  );
}
