import Link from 'next/link';
import { getCityOverview, getDataHealth, getHostMetrics, getPopulationSummary } from '@/lib/ape-data';
import { duration } from '@/lib/format';
import { getMaintenanceSettings } from '@/lib/maintenance-data';
import { getCurrentStaffIdentity, canAccessServerAdministration, canManageSiteConfiguration } from '@/lib/staff-auth';
import { enabledFeatureIds, getSiteFeatureSettings } from '@/lib/site-features-data';
import { getDailyDropsAdminState } from '@/lib/cases-data';
import { getJobsAdminState } from '@/lib/jobs-data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Staff Command Center' };

function bytesToGb(bytes: number): string {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function WorkspaceCard({
  eyebrow,
  title,
  description,
  icon,
  href,
  tone = 'blue',
  stats = [],
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  tone?: 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'slate';
  stats?: { label: string; value: string | number }[];
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <article className={`staff-launch-card tone-${tone}`}>
      <div className="staff-launch-card-topline">
        <span className="kicker">{eyebrow}</span>
        <span className="staff-launch-icon"><i className={icon} aria-hidden="true" /></span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {stats.length ? (
        <dl className="staff-launch-stats">
          {stats.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="staff-launch-actions">
        <Link className="button button-primary" href={href}><i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> Open workspace</Link>
        {secondaryHref && secondaryLabel ? <Link className="button button-soft" href={secondaryHref}>{secondaryLabel}</Link> : null}
      </div>
    </article>
  );
}

export default async function StaffPage() {
  const identity = await getCurrentStaffIdentity();
  const allowed = identity ? canAccessServerAdministration(identity) : false;

  if (!identity || !allowed) {
    return (
      <main className="page-shell">
        <section className="card auth-panel">
          <span className="eyebrow">Staff</span>
          <h1>Access denied</h1>
          <p>This page requires a Northbound RP staff role.</p>
          <a className="button button-primary" href="/api/auth/steam?returnTo=/staff">
            <i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam
          </a>
        </section>
      </main>
    );
  }

  const [health, population, metrics, overview, maintenanceSettings, featureSettings, dailyDropsState, jobsAdminState] = await Promise.all([
    getDataHealth(),
    getPopulationSummary(),
    Promise.resolve(getHostMetrics()),
    getCityOverview(),
    getMaintenanceSettings(),
    getSiteFeatureSettings(),
    getDailyDropsAdminState(),
    getJobsAdminState(),
  ]);

  const canManageSiteFeatures = canManageSiteConfiguration(identity);
  const enabledFeatures = enabledFeatureIds(featureSettings);
  const siteMode = maintenanceSettings.enabled ? 'Maintenance' : 'Open';
  const tweeterMode = maintenanceSettings.tweeterMaintenanceEnabled ? 'Paused' : enabledFeatures.has('tweeter') ? 'Visible' : 'Hidden';

  return (
    <main className="page-shell staff-page staff-command-page staff-command-center-v2">
      <section className="staff-command-hero staff-command-center-hero">
        <div className="staff-command-copy">
          <span className="ops-kicker"><i /> Staff Command Center</span>
          <h1>One calm launchpad for every staff tool.</h1>
          <p>Use this page for situational awareness and routing. Configuration, logs, moderation, server controls, applications, cases, and site settings now live in dedicated workspaces.</p>
          <div className="staff-hero-actions">
            <Link className="button button-primary" href="/staff/server"><i className="fa-solid fa-terminal" aria-hidden="true" /> Server control</Link>
            <Link className="button button-soft" href="/staff/activity"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> Activity center</Link>
            {canManageSiteFeatures ? <Link className="button button-soft" href="/staff/site"><i className="fa-solid fa-sliders" aria-hidden="true" /> Site settings</Link> : null}
          </div>
        </div>

        <aside className="staff-identity-card staff-operator-card">
          <span>Operator</span>
          <strong>{identity.displayName}</strong>
          <p>{identity.roleLabel} · {identity.permissions.length} permission{identity.permissions.length === 1 ? '' : 's'}</p>
          <small>{identity.steamId}</small>
        </aside>
      </section>

      <section className="staff-signal-grid staff-command-signals" aria-label="Staff overview">
        <article><span>Players online</span><strong>{population.onlineCount}</strong><p>Connected citizens right now</p></article>
        <article><span>Known saves</span><strong>{overview.players}</strong><p>Persisted citizen records</p></article>
        <article><span>Site mode</span><strong>{siteMode}</strong><p>Main website availability</p></article>
        <article><span>Tweeter</span><strong>{tweeterMode}</strong><p>Social feature visibility</p></article>
      </section>

      {!health.exists || health.warnings.length ? (
        <section className="staff-command-alert">
          <div>
            <span className="kicker">Attention needed</span>
            <h2>{health.exists ? 'Server data has warnings' : 'Server data path needs setup'}</h2>
            <p>{health.warnings[0] ?? 'The website cannot currently read the configured server data path.'}</p>
          </div>
          <Link className="button button-primary" href="/staff/status"><i className="fa-solid fa-stethoscope" aria-hidden="true" /> Open diagnostics</Link>
        </section>
      ) : null}

      <section className="staff-section-head">
        <div>
          <span className="kicker">Workspaces</span>
          <h2>Choose the tool you need</h2>
          <p>Each workspace gets room to breathe. The homepage stays focused on routing and live context.</p>
        </div>
      </section>

      <section className="staff-launch-grid" aria-label="Staff workspaces">
        <WorkspaceCard
          eyebrow="Hiring"
          title="Applications"
          description="Review applicants, edit postings, publish hidden drafts, and leave applicant-visible notes."
          icon="fa-solid fa-briefcase"
          href="/staff/jobs"
          secondaryHref="/jobs"
          secondaryLabel="Public portal"
          tone="blue"
          stats={[
            { label: 'Apps', value: jobsAdminState.stats.totalApplications },
            { label: 'Open', value: jobsAdminState.stats.openApplications },
            { label: 'Postings', value: jobsAdminState.stats.visiblePostings },
          ]}
        />
        <WorkspaceCard
          eyebrow="Daily Drops"
          title="Cases"
          description="Tune cases, reward pools, cadence, presentation, and future shop-ready case testing."
          icon="fa-solid fa-gift"
          href="/staff/cases"
          secondaryHref="/cases"
          secondaryLabel="Public cases"
          tone="violet"
          stats={[
            { label: 'Cases', value: dailyDropsState.definitions.length },
            { label: 'Active', value: dailyDropsState.activeCount },
            { label: 'Claims', value: dailyDropsState.claimedCount },
          ]}
        />
        <WorkspaceCard
          eyebrow="Server"
          title="Control room"
          description="Run server actions, watch connected players, manage power controls, and use audited moderation commands."
          icon="fa-solid fa-server"
          href="/staff/server"
          tone="green"
          stats={[
            { label: 'Online', value: population.onlineCount },
            { label: 'Uptime', value: duration(metrics.uptimeSeconds) },
            { label: 'RAM', value: bytesToGb(metrics.systemMemory.usedBytes) },
          ]}
        />
        <WorkspaceCard
          eyebrow="Maintenance"
          title="Maintenance studio"
          description="Pause the site or Tweeter, choose downtime copy, and control visitor-facing maintenance presentation."
          icon="fa-solid fa-screwdriver-wrench"
          href="/staff/maintenance"
          tone="amber"
          stats={[
            { label: 'Site', value: siteMode },
            { label: 'Tweeter', value: tweeterMode },
            { label: 'Theme', value: maintenanceSettings.theme },
          ]}
        />
        <WorkspaceCard
          eyebrow="Social"
          title="Tweeter admin"
          description="Manage Tweeter restrictions, filtered words, hidden profiles, soft bans, and social moderation controls."
          icon="fa-brands fa-twitter"
          href="/staff/tweeter"
          secondaryHref="/tweeter"
          secondaryLabel="Open feed"
          tone="rose"
          stats={[
            { label: 'Public', value: enabledFeatures.has('tweeter') ? 'Yes' : 'No' },
            { label: 'Mode', value: tweeterMode },
          ]}
        />

        <WorkspaceCard
          eyebrow="Discord"
          title="Bot manager"
          description="Send guided embed panels, preview Discord messages, inspect server data, and manage simple role/user actions from the website."
          icon="fa-brands fa-discord"
          href="/staff/discord"
          tone="violet"
          stats={[
            { label: 'Panels', value: 'Preview' },
            { label: 'Roles', value: 'Manage' },
            { label: 'Bot', value: 'Live' },
          ]}
        />
        <WorkspaceCard
          eyebrow="Site"
          title="Site settings"
          description="Feature visibility, public modules, and Ape Tavern badge/display configuration live here."
          icon="fa-solid fa-sliders"
          href="/staff/site"
          tone="slate"
          stats={[
            { label: 'Features', value: featureSettings.features.length },
            { label: 'Enabled', value: featureSettings.features.filter((feature) => feature.enabled).length },
          ]}
        />
        <WorkspaceCard
          eyebrow="Signals"
          title="Diagnostics"
          description="Check data health, heartbeat freshness, query results, process status, and public status diagnostics."
          icon="fa-solid fa-stethoscope"
          href="/staff/status"
          secondaryHref="/status"
          secondaryLabel="Public status"
          tone="blue"
          stats={[
            { label: 'Data', value: health.exists ? 'OK' : 'Missing' },
            { label: 'Warnings', value: health.warnings.length },
          ]}
        />
        <WorkspaceCard
          eyebrow="Logs"
          title="Activity center"
          description="Browse recent admin actions, chat messages, and damage events away from the staff homepage."
          icon="fa-solid fa-clock-rotate-left"
          href="/staff/activity"
          tone="slate"
          stats={[
            { label: 'Warnings', value: overview.warnings },
            { label: 'Mutes', value: overview.mutes },
          ]}
        />
      </section>
    </main>
  );
}
