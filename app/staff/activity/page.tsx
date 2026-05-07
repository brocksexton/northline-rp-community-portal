import Link from 'next/link';
import { getRecentAdminLogs, getRecentChatLogs, getRecentDamageLogs } from '@/lib/ape-data';
import { fullDate } from '@/lib/format';
import { getCurrentStaffIdentity, canAccessServerAdministration } from '@/lib/staff-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Staff Activity' };

export default async function StaffActivityPage() {
  const identity = await getCurrentStaffIdentity();
  const allowed = identity ? canAccessServerAdministration(identity) : false;

  if (!identity || !allowed) {
    return (
      <main className="page-shell">
        <section className="card auth-panel">
          <span className="eyebrow">Staff</span>
          <h1>Access denied</h1>
          <p>This page requires a Northbound RP staff role.</p>
          <a className="button button-primary" href="/api/auth/steam?returnTo=/staff/activity"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</a>
        </section>
      </main>
    );
  }

  const [adminLogs, chatLogs, damageLogs] = await Promise.all([
    getRecentAdminLogs(40),
    getRecentChatLogs(40),
    getRecentDamageLogs(40),
  ]);

  return (
    <main className="page-shell staff-page staff-command-page staff-dedicated-shell staff-activity-page">
      <section className="staff-command-hero staff-dedicated-hero">
        <div className="staff-command-copy">
          <span className="ops-kicker"><i /> Activity center</span>
          <h1>Recent city signals.</h1>
          <p>Admin actions, chat, and damage events are separated from the staff homepage so the command center stays clean.</p>
          <div className="staff-hero-actions">
            <Link className="button button-primary" href="/staff"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to command center</Link>
            <Link className="button button-soft" href="/staff/status"><i className="fa-solid fa-stethoscope" aria-hidden="true" /> Diagnostics</Link>
          </div>
        </div>
        <aside className="staff-identity-card">
          <span>Loaded events</span>
          <strong>{adminLogs.length + chatLogs.length + damageLogs.length}</strong>
          <p>{adminLogs.length} admin · {chatLogs.length} chat · {damageLogs.length} damage</p>
          <small>{identity.roleLabel}</small>
        </aside>
      </section>

      <section className="staff-activity-grid">
        <article className="staff-activity-panel">
          <div className="section-heading"><span className="kicker">Admin logs</span><h2>Recent actions</h2><p>Moderation, tooling, and server-side staff actions.</p></div>
          <div className="stack-list compact-stack">
            {adminLogs.map((log) => (
              <div key={`${log.Timestamp}-${log.ActionType}-${log.TargetName}`}>
                <strong>{log.ActionType}</strong>
                <span>{log.AdminName} {log.TargetName ? `→ ${log.TargetName}` : ''}</span>
                <small>{fullDate(log.Timestamp)} · {log.Details || 'No details'}</small>
              </div>
            ))}
          </div>
        </article>
        <article className="staff-activity-panel">
          <div className="section-heading"><span className="kicker">Chat logs</span><h2>Recent messages</h2><p>Recent public communication from server logs.</p></div>
          <div className="stack-list compact-stack">
            {chatLogs.map((log) => (
              <div key={`${log.Timestamp}-${log.SenderSteamId}-${log.Message}`}>
                <strong>{log.SenderName}</strong>
                <span>{log.Message}</span>
                <small>{fullDate(log.Timestamp)} · {log.Type}</small>
              </div>
            ))}
          </div>
        </article>
        <article className="staff-activity-panel wide">
          <div className="section-heading"><span className="kicker">Damage logs</span><h2>Recent damage</h2><p>Damage, combat, and fatal events for quick review.</p></div>
          <div className="stack-list compact-stack">
            {damageLogs.map((log) => (
              <div key={`${log.Timestamp}-${log.VictimSteamId}-${log.Damage}`}>
                <strong>{log.Cause || 'Damage'}{log.IsFatal ? ' · fatal' : ''}</strong>
                <span>{log.AttackerName || 'Unknown'} → {log.VictimName} · {Math.round(Number(log.Damage ?? 0))} dmg</span>
                <small>{fullDate(log.Timestamp)}</small>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
