import Link from 'next/link';
import { TweeterAdminPanel } from '@/components/TweeterAdminPanel';
import { getCurrentStaffIdentity, canAccessServerAdministration, canAccessStaffPage, canManageTweeterConfiguration } from '@/lib/staff-auth';
import { listTweeterAccountModeration } from '@/lib/tweeter-moderation-data';
import { listTweeterContentFilterRules } from '@/lib/tweeter-content-filter-data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tweeter Administration' };

export default async function StaffTweeterPage() {
  const identity = await getCurrentStaffIdentity();
  const allowed = identity ? await canAccessStaffPage(identity, 'tweeter') : false;

  if (!identity || !allowed) {
    return (
      <main className="page-shell">
        <section className="card auth-panel">
          <span className="eyebrow">Staff</span>
          <h1>Access denied</h1>
          <p>This page requires a Northbound RP staff role.</p>
          <a className="button button-primary" href="/api/auth/steam?returnTo=/staff/tweeter"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</a>
        </section>
      </main>
    );
  }

  const [accounts, filterRules] = await Promise.all([listTweeterAccountModeration(), listTweeterContentFilterRules()]);
  const canManage = canManageTweeterConfiguration(identity);

  return (
    <main className="page-shell staff-page tweeter-admin-page">
      <section className="staff-command-hero tweeter-admin-hero">
        <div className="staff-command-copy">
          <span className="ops-kicker"><i /> Tweeter moderation</span>
          <h1>Tweeter moderation</h1>
          <p>Manage profile visibility and website-side restrictions without changing in-game data.</p>
          <div className="staff-hero-actions">
            <Link className="button button-soft" href="/staff"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to staff panel</Link>
            <Link className="button button-primary" href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> Open Tweeter</Link>
          </div>
        </div>
        <aside className="staff-identity-card">
          <span>Signed in as</span>
          <strong>{identity.roleLabel}</strong>
          <p>{canManage ? 'Can change Tweeter restrictions' : 'Read-only access'}</p>
          <small>{identity.steamId}</small>
        </aside>
      </section>

      <TweeterAdminPanel initialAccounts={accounts} initialFilterRules={filterRules} canManage={canManage} />
    </main>
  );
}
