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

function countdown(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m`;
  return `${seconds}s`;
}

function getStatus(ban: BanRecord, now: number) {
  if (ban.revokedAt) return { label: 'Expired', tone: 'neutral', detail: `Lifted ${new Date(ban.revokedAt).toLocaleDateString()}` };
  if (ban.isPermanent || !ban.expiresAt) return { label: 'Permanent', tone: 'danger', detail: 'No scheduled expiry' };
  const remaining = new Date(ban.expiresAt).getTime() - now;
  if (remaining <= 0) return { label: 'Expired', tone: 'neutral', detail: 'Time served' };
  return { label: 'Active', tone: 'warning', detail: countdown(remaining) };
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
      if (filter === 'active' && status.label !== 'Active' && status.label !== 'Permanent') return false;
      if (filter === 'expired' && status.label !== 'Expired') return false;
      if (filter === 'permanent' && !ban.isPermanent) return false;
      if (!clean) return true;
      return ban.playerName.toLowerCase().includes(clean)
        || ban.reason.toLowerCase().includes(clean)
        || ban.steamId.includes(clean)
        || ban.staffName.toLowerCase().includes(clean);
    });
  }, [data.records, filter, now, query]);

  return (
    <main className="page-shell bans-page">
      <section className="hero split-hero">
        <div>
          <span className="eyebrow">Moderation transparency</span>
          <h1>Ban list</h1>
          <p>Public-safe account actions from Northline RP. Staff evidence and private notes stay out of public view.</p>
        </div>
        <aside className="card compact-card"><span>Latest action</span><strong>{data.summary.latestAt ? new Date(data.summary.latestAt).toLocaleDateString() : 'None yet'}</strong><small>Auto-refreshes</small></aside>
      </section>

      <section className="stat-band four">
        <div><span>Total</span><strong>{data.summary.total}</strong></div>
        <div><span>Active</span><strong>{data.summary.active}</strong></div>
        <div><span>Temporary</span><strong>{data.summary.temporary}</strong></div>
        <div><span>Expired</span><strong>{data.summary.expired}</strong></div>
      </section>

      <section className="card controls-card">
        <label className="field search-field"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Player, SteamID, staff, or reason" /></label>
        <div className="tabs">
          {(['all', 'active', 'expired', 'permanent'] as Filter[]).map((value) => <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value}</button>)}
        </div>
      </section>

      <section className="record-list">
        {filtered.length ? filtered.map((ban) => {
          const status = getStatus(ban, now);
          return (
            <article className="card ban-card" key={ban.id}>
              <div className="ban-person">
                <UserAvatar src={ban.avatarUrl ?? null} name={ban.playerName} />
                <div>
                  <Link href={`/u/${ban.steamId}`}><strong>{ban.playerName}</strong></Link>
                  <span>{ban.steamId}</span>
                </div>
              </div>
              <div><span className="muted-label">Reason</span><p>{ban.reason || 'No reason provided'}</p></div>
              <div><span className="muted-label">Issued by</span><strong>{ban.staffName || 'Staff'}</strong></div>
              <div><span className={`pill ${status.tone}`}>{status.label}</span><strong>{status.detail}</strong><small>{new Date(ban.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</small></div>
            </article>
          );
        }) : <div className="card empty-state"><strong>No records found</strong><p>No moderation records match the current filters.</p></div>}
      </section>
    </main>
  );
}
