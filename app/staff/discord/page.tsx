import Link from 'next/link';
import { DiscordBotManagerPanel } from '@/components/DiscordBotManagerPanel';
import { getDiscordGuildSummary } from '@/lib/discord-manager';
import { getCurrentStaffIdentity, canAccessServerAdministration, canAccessStaffPage, canManageSiteConfiguration, canRunModerationActions } from '@/lib/staff-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Discord Operations' };

export default async function StaffDiscordPage() {
  const identity = await getCurrentStaffIdentity();
  const allowed = identity ? await canAccessStaffPage(identity, 'discord') : false;

  if (!identity || !allowed) {
    return (
      <main className="page-shell">
        <section className="card auth-panel">
          <span className="eyebrow">Staff</span>
          <h1>Access denied</h1>
          <p>This page requires a Northbound RP staff role.</p>
          <a className="button button-primary" href="/api/auth/steam?returnTo=/staff/discord"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</a>
        </section>
      </main>
    );
  }

  const summary = await getDiscordGuildSummary();
  const canSendPanels = canManageSiteConfiguration(identity);
  const canManageMembers = canRunModerationActions(identity);

  return (
    <main className="page-shell staff-page staff-command-page staff-discord-manager-page">
      <section className="staff-command-hero staff-dedicated-hero discord-manager-hero">
        <div className="staff-command-copy">
          <span className="ops-kicker"><i /> Discord operations</span>
          <h1>Discord command center.</h1>
          <p>Send polished embeds, launch guide cards, review bot commands, inspect Discord data, and handle careful member actions from one staff page.</p>
          <div className="staff-hero-actions">
            <Link className="button button-primary" href="/staff"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to command center</Link>
            <Link className="button button-soft" href="/forum"><i className="fa-solid fa-comments" aria-hidden="true" /> Website forum</Link>
          </div>
        </div>
        <aside className="staff-identity-card">
          <span>Bot connection</span>
          <strong>{summary.configured ? 'Connected' : 'Needs setup'}</strong>
          <p>{summary.guild?.name ?? 'Set Discord environment variables'}</p>
          <small>{canSendPanels ? 'Embeds and guide cards enabled' : 'Read-only / limited access'}</small>
        </aside>
      </section>

      <DiscordBotManagerPanel initialSummary={summary} canSendPanels={canSendPanels} canManageMembers={canManageMembers} />
    </main>
  );
}
