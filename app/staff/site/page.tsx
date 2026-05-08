import Link from 'next/link';
import { SiteFeaturesAdminPanel } from '@/components/SiteFeaturesAdminPanel';
import { ApeStaffAdminPanel } from '@/components/ApeStaffAdminPanel';
import { getApeStaffState } from '@/lib/ape-staff-data';
import { getSiteFeatureSettings } from '@/lib/site-features-data';
import { getCurrentStaffIdentity, canAccessServerAdministration, canAccessStaffPage, canManageSiteConfiguration } from '@/lib/staff-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Site Settings' };

export default async function StaffSitePage() {
  const identity = await getCurrentStaffIdentity();
  const allowed = identity ? await canAccessStaffPage(identity, 'site') : false;

  if (!identity || !allowed) {
    return (
      <main className="page-shell">
        <section className="card auth-panel">
          <span className="eyebrow">Staff</span>
          <h1>Access denied</h1>
          <p>This page requires a Northbound RP staff role.</p>
          <a className="button button-primary" href="/api/auth/steam?returnTo=/staff/site"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</a>
        </section>
      </main>
    );
  }

  const [featureSettings, apeStaffState] = await Promise.all([getSiteFeatureSettings(), getApeStaffState()]);
  const canManage = canManageSiteConfiguration(identity);

  return (
    <main className="page-shell staff-page staff-command-page staff-dedicated-shell staff-site-settings-page">
      <section className="staff-command-hero staff-dedicated-hero">
        <div className="staff-command-copy">
          <span className="ops-kicker"><i /> Site settings</span>
          <h1>Site features and public modules.</h1>
          <p>Enable or hide public sections and manage website display settings.</p>
          <div className="staff-hero-actions">
            <Link className="button button-primary" href="/staff"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to command center</Link>
            <Link className="button button-soft" href="/"><i className="fa-solid fa-house" aria-hidden="true" /> View homepage</Link>
          </div>
        </div>
        <aside className="staff-identity-card">
          <span>Access</span>
          <strong>{canManage ? 'Editable' : 'Read-only'}</strong>
          <p>{featureSettings.features.filter((feature) => feature.enabled).length} of {featureSettings.features.length} public modules enabled</p>
          <small>{identity.roleLabel}</small>
        </aside>
      </section>

      <section className="staff-site-settings-grid">
        <SiteFeaturesAdminPanel initialSettings={featureSettings} canManage={canManage} />
        <ApeStaffAdminPanel initialState={apeStaffState} canManage={canManage} />
      </section>
    </main>
  );
}
