import Link from 'next/link';
import { getCityOverview, getDataHealth, getHostMetrics, getPermissionsForSteamId, getPopulationSummary, getRecentAdminLogs, getRecentChatLogs, getRecentDamageLogs, getRoleForSteamId, hasPermission } from '@/lib/ape-data';
import { duration, fullDate } from '@/lib/format';
import { getSessionSteamId } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Staff' };

function bytesToGb(bytes: number): string {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export default async function StaffPage() {
  const steamId = await getSessionSteamId();
  const allowed = await hasPermission(steamId, 'ViewLogs');

  if (!steamId || !allowed) {
    return (
      <main className="page-shell">
        <section className="card auth-panel">
          <span className="eyebrow">Staff</span>
          <h1>Access denied</h1>
          <p>This page requires a Northbound RP role with the <code>ViewLogs</code> permission.</p>
          <Link className="button button-primary" href="/api/auth/steam?returnTo=/staff"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</Link>
        </section>
      </main>
    );
  }

  const [health, population, metrics, permissions, role, overview, adminLogs, chatLogs, damageLogs] = await Promise.all([
    getDataHealth(),
    getPopulationSummary(),
    Promise.resolve(getHostMetrics()),
    getPermissionsForSteamId(steamId),
    getRoleForSteamId(steamId),
    getCityOverview(),
    getRecentAdminLogs(15),
    getRecentChatLogs(15),
    getRecentDamageLogs(15),
  ]);

  return (
    <main className="page-shell staff-page">
      <section className="hero split-hero">
        <div><span className="eyebrow">Staff operations</span><h1>Read-only control center.</h1><p>Use this as an operational overview. Game-affecting write actions should wait for a signed, audited in-game bridge.</p></div>
        <aside className="card compact-card"><span>Signed in</span><strong>{role}</strong><small>{permissions.length} permissions · {steamId}</small></aside>
      </section>

      <section className="stat-band four">
        <div><span>Online</span><strong>{population.onlineCount}</strong></div>
        <div><span>Known saves</span><strong>{overview.players}</strong></div>
        <div><span>Warnings</span><strong>{overview.warnings}</strong></div>
        <div><span>Mutes</span><strong>{overview.mutes}</strong></div>
      </section>

      <section className="layout-two">
        <article className="card">
          <div className="section-heading"><span className="kicker">Data path</span><h2>{health.exists ? 'Connected' : 'Missing'}</h2><p><code>{health.dataPath ?? 'APE_RP_DATA_PATH not configured'}</code></p></div>
          {health.warnings.length ? <div className="notice danger">{health.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : <p className="notice success">Game data is readable.</p>}
        </article>
        <article className="card">
          <div className="section-heading"><span className="kicker">Host</span><h2>{metrics.machine}</h2><p>{metrics.platform}</p></div>
          <dl className="metric-grid compact">
            <div><dt>Host uptime</dt><dd>{duration(metrics.uptimeSeconds)}</dd></div>
            <div><dt>Web uptime</dt><dd>{duration(metrics.webProcess.uptimeSeconds)}</dd></div>
            <div><dt>RAM used</dt><dd>{bytesToGb(metrics.systemMemory.usedBytes)}</dd></div>
            <div><dt>Web RAM</dt><dd>{bytesToGb(metrics.webProcess.rssBytes)}</dd></div>
          </dl>
        </article>
      </section>

      <section className="layout-three">
        <article className="card log-card"><div className="section-heading"><span className="kicker">Admin logs</span><h2>Recent actions</h2></div><div className="stack-list compact-stack">{adminLogs.map((log) => <div key={`${log.Timestamp}-${log.ActionType}-${log.TargetName}`}><strong>{log.ActionType}</strong><span>{log.AdminName} {log.TargetName ? `→ ${log.TargetName}` : ''}</span><small>{fullDate(log.Timestamp)} · {log.Details || 'No details'}</small></div>)}</div></article>
        <article className="card log-card"><div className="section-heading"><span className="kicker">Chat logs</span><h2>Recent messages</h2></div><div className="stack-list compact-stack">{chatLogs.map((log) => <div key={`${log.Timestamp}-${log.SenderSteamId}-${log.Message}`}><strong>{log.SenderName}</strong><span>{log.Message}</span><small>{fullDate(log.Timestamp)} · {log.Type}</small></div>)}</div></article>
        <article className="card log-card"><div className="section-heading"><span className="kicker">Damage logs</span><h2>Recent damage</h2></div><div className="stack-list compact-stack">{damageLogs.map((log) => <div key={`${log.Timestamp}-${log.VictimSteamId}-${log.Damage}`}><strong>{log.Cause || 'Damage'}</strong><span>{log.AttackerName || 'Unknown'} → {log.VictimName} · {Math.round(Number(log.Damage ?? 0))} dmg</span><small>{fullDate(log.Timestamp)}{log.IsFatal ? ' · fatal' : ''}</small></div>)}</div></article>
      </section>
    </main>
  );
}
