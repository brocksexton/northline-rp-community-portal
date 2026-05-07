import Link from 'next/link';
import { MaintenanceSettingsPanel } from '@/components/MaintenanceSettingsPanel';
import { getMaintenanceSettings } from '@/lib/maintenance-data';
import { getCurrentStaffIdentity, canAccessServerAdministration, canManageSiteConfiguration } from '@/lib/staff-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Maintenance Studio' };

export default async function StaffMaintenancePage() {
  const identity = await getCurrentStaffIdentity();
  const allowed = identity ? canAccessServerAdministration(identity) : false;

  if (!identity || !allowed) {
    return (
      <main className="page-shell">
        <section className="card auth-panel">
          <span className="eyebrow">Staff</span>
          <h1>Access denied</h1>
          <p>This page requires a Northbound RP staff role.</p>
          <a className="button button-primary" href="/api/auth/steam?returnTo=/staff/maintenance"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</a>
        </section>
      </main>
    );
  }

  const settings = await getMaintenanceSettings();
  const canManage = canManageSiteConfiguration(identity);

  return (
    <main className="page-shell staff-page maintenance-studio-page">
      <section className="staff-command-hero maintenance-studio-hero">
        <div className="staff-command-copy">
          <span className="ops-kicker"><i /> Staff tools</span>
          <h1>Maintenance studio</h1>
          <p>Control what visitors see when the website, Tweeter, or both need a short break.</p>
          <div className="staff-hero-actions">
            <Link className="button button-soft" href="/staff"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to staff panel</Link>
            <Link className="button button-primary" href="/status"><i className="fa-solid fa-signal" aria-hidden="true" /> Public status</Link>
          </div>
        </div>
        <aside className="staff-identity-card">
          <span>Signed in as</span>
          <strong>{identity.roleLabel}</strong>
          <p>{canManage ? 'Can change maintenance settings' : 'Read-only access'}</p>
          <small>{identity.steamId}</small>
        </aside>
      </section>

      <MaintenanceSettingsPanel initialSettings={settings} canManage={canManage} studio />
    </main>
  );
}
