import Link from 'next/link';
import { DailyDropsAdminPanel } from '@/components/DailyDropsAdminPanel';
import { getDailyDropsAdminState } from '@/lib/cases-data';
import { getCurrentStaffIdentity, canAccessServerAdministration, canAccessStaffPage, canManageSiteConfiguration } from '@/lib/staff-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Daily Drop Workspace' };

export default async function StaffCasesWorkspacePage() {
  const identity = await getCurrentStaffIdentity();
  const allowed = identity ? await canAccessStaffPage(identity, 'cases') : false;

  if (!identity || !allowed) {
    return (
      <main className="page-shell">
        <section className="card auth-panel">
          <span className="eyebrow">Staff</span>
          <h1>Access denied</h1>
          <p>This page requires a Northbound RP staff role.</p>
          <a className="button button-primary" href="/api/auth/steam?returnTo=/staff/cases">
            <i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam
          </a>
        </section>
      </main>
    );
  }

  const state = await getDailyDropsAdminState();
  const canManage = canManageSiteConfiguration(identity);

  return (
    <main className="page-shell staff-page staff-command-page staff-dedicated-shell">
      <section className="staff-command-hero staff-dedicated-hero">
        <div className="staff-command-copy">
          <span className="ops-kicker"><i /> Daily drop workspace</span>
          <h1>Case modifications and reward pools</h1>
          <p>Daily-drop case editing now lives on its own dedicated page so every reward, rarity, cadence, and visibility control has room to breathe.</p>
          <div className="staff-hero-actions">
            <Link className="button button-primary" href="/staff"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to staff home</Link>
            <Link className="button button-soft" href="/cases"><i className="fa-solid fa-eye" aria-hidden="true" /> Open public page</Link>
          </div>
        </div>
        <aside className="staff-identity-card">
          <span>Configured cases</span>
          <strong>{state.definitions.length}</strong>
          <p>{state.activeCount} active · {state.hiddenCount} hidden</p>
          <small>{state.claimedCount} claims / {state.openedCount} opened</small>
        </aside>
      </section>

      <section className="staff-workspace-grid staff-context-grid">
        <article className="staff-workspace-card compact">
          <div className="staff-workspace-topline"><span className="kicker">Cadence</span><span className="staff-workspace-icon"><i className="fa-solid fa-clock" aria-hidden="true" /></span></div>
          <h3>Daily schedule</h3>
          <p>Adjust how often a case can be claimed and which case definitions are active, hidden, or retired.</p>
        </article>
        <article className="staff-workspace-card compact">
          <div className="staff-workspace-topline"><span className="kicker">Rewards</span><span className="staff-workspace-icon"><i className="fa-solid fa-gem" aria-hidden="true" /></span></div>
          <h3>Reward pool editor</h3>
          <p>Edit reward rarity, odds, item IDs, cash values, and hidden entries from a cleaner management layout.</p>
        </article>
      </section>

      <DailyDropsAdminPanel initialState={state} canManage={canManage} />
    </main>
  );
}
