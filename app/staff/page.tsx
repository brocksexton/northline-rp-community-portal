import Link from 'next/link';
import { getCityOverview, getDataHealth, getHostMetrics, getPermissionsForSteamId, getPopulationSummary, getRecentAdminLogs, getRecentChatLogs, getRecentDamageLogs, getRoleForSteamId, hasPermission } from '@/lib/ape-data';
import { duration, fullDate } from '@/lib/format';
import { getMaintenanceSettings } from '@/lib/maintenance-data';
import { getSessionSteamId } from '@/lib/session';
import { enabledFeatureIds, getSiteFeatureSettings } from '@/lib/site-features-data';
import { getDailyDropsAdminState } from '@/lib/cases-data';
import { SiteFeaturesAdminPanel } from '@/components/SiteFeaturesAdminPanel';
import { DailyDropsAdminPanel } from '@/components/DailyDropsAdminPanel';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Staff' };

function bytesToGb(bytes: number): string {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export default async function StaffPage() {
  const steamId = await getSessionSteamId();
  const roleForAccess = steamId ? await getRoleForSteamId(steamId) : 'Guest';
  const allowed = Boolean(steamId) && (roleForAccess.toLowerCase() === 'developer' || await hasPermission(steamId, 'ViewLogs'));

  if (!steamId || !allowed) {
    return (
      <main className="page-shell">
        <section className="card auth-panel">
          <span className="eyebrow">Staff</span>
          <h1>Access denied</h1>
          <p>This page requires a Northbound RP staff role.</p>
          <a className="button button-primary" href="/api/auth/steam?returnTo=/staff"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</a>
        </section>
      </main>
    );
  }

  const [health, population, metrics, permissions, role, overview, adminLogs, chatLogs, damageLogs, maintenanceSettings, featureSettings, dailyDropsState] = await Promise.all([
    getDataHealth(),
    getPopulationSummary(),
    Promise.resolve(getHostMetrics()),
    getPermissionsForSteamId(steamId),
    Promise.resolve(roleForAccess),
    getCityOverview(),
    getRecentAdminLogs(15),
    getRecentChatLogs(15),
    getRecentDamageLogs(15),
    getMaintenanceSettings(),
    getSiteFeatureSettings(),
    getDailyDropsAdminState(),
  ]);

  const canManageSiteFeatures = role.toLowerCase() === 'developer';
  const enabledFeatures = enabledFeatureIds(featureSettings);
  const statusVisible = enabledFeatures.has('status');
  const bansVisible = enabledFeatures.has('bans');
  const tweeterVisible = enabledFeatures.has('tweeter');

  return (
    <main className="page-shell staff-page staff-command-page">
      <section className="staff-command-hero">
        <div className="staff-command-copy">
          <span className="ops-kicker"><i /> Staff Control Center</span>
          <h1>City operations at a glance</h1>
          <p>Review server health, player volume, and recent moderation signals from one readable staff dashboard.</p>
          <div className="staff-hero-actions">
            {statusVisible ? <Link className="button button-primary" href="/status">Public status</Link> : null}
            <Link className="button button-soft" href="/staff/status"><i className="fa-solid fa-stethoscope" aria-hidden="true" /> Status diagnostics</Link>
            {bansVisible ? <Link className="button button-soft" href="/bans">Ban list</Link> : null}
            {tweeterVisible ? <Link className="button button-soft" href="/staff/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> Tweeter admin</Link> : null}
          </div>
        </div>
        <aside className="staff-identity-card">
          <span>Signed in as</span>
          <strong>{role}</strong>
          <p>{permissions.length} permissions</p>
          <small>{steamId}</small>
        </aside>
      </section>

      <section className="staff-signal-grid" aria-label="Staff overview">
        <article><span>Online now</span><strong>{population.onlineCount}</strong><p>Connected players</p></article>
        <article><span>Known saves</span><strong>{overview.players}</strong><p>Saved citizens</p></article>
        <article><span>Warnings</span><strong>{overview.warnings}</strong><p>Moderation records</p></article>
        <article><span>Mutes</span><strong>{overview.mutes}</strong><p>Voice/chat controls</p></article>
      </section>




      <section className="staff-dashboard-admin-grid">
        <SiteFeaturesAdminPanel initialSettings={featureSettings} canManage={canManageSiteFeatures} />
        <DailyDropsAdminPanel initialState={dailyDropsState} canManage={canManageSiteFeatures} />
      </section>

      <section className="staff-command-grid maintenance-command-grid">
        <article className="staff-panel maintenance-control-card">
          <div className="section-heading"><span className="kicker">Maintenance</span><h2>Maintenance studio</h2><p>Open the dedicated studio to pause the main site, pause Tweeter, pick a preset, and customize the downtime page.</p></div>
          <dl className="maintenance-status-list">
            <div><dt>Main site</dt><dd>{maintenanceSettings.enabled ? 'Maintenance on' : 'Open'}</dd></div>
            <div><dt>Tweeter</dt><dd>{maintenanceSettings.tweeterMaintenanceEnabled ? 'Maintenance on' : maintenanceSettings.allowTweeterDuringMaintenance ? 'Allowed through' : 'Normal'}</dd></div>
            <div><dt>Theme</dt><dd>{maintenanceSettings.theme}</dd></div>
          </dl>
          <div className="staff-hero-actions"><Link className="button button-primary" href="/staff/maintenance"><i className="fa-solid fa-screwdriver-wrench" aria-hidden="true" /> Open studio</Link></div>
        </article>
        <article className="staff-panel maintenance-help-panel">
          <div className="section-heading"><span className="kicker">How it works</span><h2>Site controls</h2><p>Use this when you want visitors to see a clean update page instead of a half-finished feature.</p></div>
          <div className="stack-list compact-stack">
            <div><strong>Main site</strong><span>Close most pages while still letting Developer accounts in.</span><small>You can optionally keep Tweeter open.</small></div>
            <div><strong>Tweeter</strong><span>Pause Tweeter by itself with a page that matches the feed.</span><small>Useful when only social pages need work.</small></div>
            <div><strong>Presets + custom buttons</strong><span>Pick a starting look, then tweak text, colors, countdowns, and visitor buttons.</span><small>Everything saves to the website data folder.</small></div>
          </div>
        </article>

        <article className="staff-panel maintenance-help-panel">
          <div className="section-heading"><span className="kicker">Status diagnostics</span><h2>Server reachability</h2><p>See heartbeat freshness, query hosts, local process checks, and host metrics without exposing technical details on the public status page.</p></div>
          <div className="stack-list compact-stack">
            <div><strong>Network checks</strong><span>Compare configured public host and local fallback hosts.</span><small>Useful when UDP queries are blocked or hairpin routing fails.</small></div>
            <div><strong>Process fallback</strong><span>Confirms whether the game process appears to be running on the same host.</span><small>Only staff can see these details.</small></div>
          </div>
          <div className="staff-hero-actions"><Link className="button button-primary" href="/staff/status"><i className="fa-solid fa-stethoscope" aria-hidden="true" /> Open diagnostics</Link></div>
        </article>

        <article className="staff-panel maintenance-help-panel">
          <div className="section-heading"><span className="kicker">Tweeter moderation</span><h2>Social account controls</h2><p>Hide Tweeter profiles, soft-ban website actions, or fully ban an account from Tweeter without changing game save data.</p></div>
          <div className="stack-list compact-stack">
            <div><strong>Hide profile</strong><span>Removes a profile from public Tweeter views and discovery.</span><small>Useful for cleanup or privacy issues.</small></div>
            <div><strong>Soft ban</strong><span>Leaves the profile visible but disables social actions.</span><small>Likes, follows, DMs, and profile edits are locked.</small></div>
            <div><strong>Full ban</strong><span>Hides the account and locks Tweeter features entirely.</span><small>Active in-game bans also show notices on profiles.</small></div>
          </div>
          <div className="staff-hero-actions">{tweeterVisible ? <Link className="button button-primary" href="/staff/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> Open Tweeter admin</Link> : <span className="muted-inline-note">Tweeter is hidden publicly, but developer visibility can be changed above.</span>}</div>
        </article>
      </section>

      <section className="staff-command-grid">
        <article className="staff-panel health-panel">
          <div className="section-heading"><span className="kicker">Data health</span><h2>{health.exists ? 'Connected' : 'Needs setup'}</h2><p>{health.exists ? 'The website can read Northbound RP server files.' : 'The website cannot currently read the configured server data path.'}</p></div>
          {health.warnings.length ? <div className="notice danger">{health.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : <p className="notice success">Game data is readable.</p>}
        </article>
        <article className="staff-panel host-panel">
          <div className="section-heading"><span className="kicker">Host summary</span><h2>{metrics.machine}</h2><p>{metrics.platform}</p></div>
          <dl className="metric-grid compact">
            <div><dt>Host uptime</dt><dd>{duration(metrics.uptimeSeconds)}</dd></div>
            <div><dt>Web uptime</dt><dd>{duration(metrics.webProcess.uptimeSeconds)}</dd></div>
            <div><dt>RAM used</dt><dd>{bytesToGb(metrics.systemMemory.usedBytes)}</dd></div>
            <div><dt>Web RAM</dt><dd>{bytesToGb(metrics.webProcess.rssBytes)}</dd></div>
          </dl>
        </article>
      </section>

      <section className="staff-log-grid">
        <article className="staff-log-panel"><div className="section-heading"><span className="kicker">Admin logs</span><h2>Recent actions</h2></div><div className="stack-list compact-stack">{adminLogs.map((log) => <div key={`${log.Timestamp}-${log.ActionType}-${log.TargetName}`}><strong>{log.ActionType}</strong><span>{log.AdminName} {log.TargetName ? `→ ${log.TargetName}` : ''}</span><small>{fullDate(log.Timestamp)} · {log.Details || 'No details'}</small></div>)}</div></article>
        <article className="staff-log-panel"><div className="section-heading"><span className="kicker">Chat logs</span><h2>Recent messages</h2></div><div className="stack-list compact-stack">{chatLogs.map((log) => <div key={`${log.Timestamp}-${log.SenderSteamId}-${log.Message}`}><strong>{log.SenderName}</strong><span>{log.Message}</span><small>{fullDate(log.Timestamp)} · {log.Type}</small></div>)}</div></article>
        <article className="staff-log-panel"><div className="section-heading"><span className="kicker">Damage logs</span><h2>Recent damage</h2></div><div className="stack-list compact-stack">{damageLogs.map((log) => <div key={`${log.Timestamp}-${log.VictimSteamId}-${log.Damage}`}><strong>{log.Cause || 'Damage'}</strong><span>{log.AttackerName || 'Unknown'} → {log.VictimName} · {Math.round(Number(log.Damage ?? 0))} dmg</span><small>{fullDate(log.Timestamp)}{log.IsFatal ? ' · fatal' : ''}</small></div>)}</div></article>
      </section>
    </main>
  );
}
