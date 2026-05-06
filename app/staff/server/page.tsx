import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ServerAdminPanel } from '@/components/ServerAdminPanel';
import { getServerAdminSnapshot } from '@/lib/server-admin';
import { canRunModerationActions, canRunServerPowerActions, requireServerAdministrationPage } from '@/lib/staff-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const metadata = { title: 'Server Administration' };

export default async function StaffServerPage() {
  const identity = await requireServerAdministrationPage();
  if (!identity) notFound();
  const snapshot = await getServerAdminSnapshot();

  return (
    <main className="page-shell staff-page staff-command-page server-admin-page">
      <section className="staff-command-hero server-admin-hero">
        <div className="staff-command-copy">
          <span className="ops-kicker"><i /> Live administration</span>
          <h1>Server control room</h1>
          <p>Watch the latest console output, review connected players, and run safe staff actions from the website.</p>
          <div className="staff-hero-actions">
            <Link className="button button-soft" href="/staff"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to staff panel</Link>
            <Link className="button button-soft" href="/staff/status"><i className="fa-solid fa-stethoscope" aria-hidden="true" /> Diagnostics</Link>
          </div>
        </div>
        <aside className="staff-identity-card">
          <span>Signed in as</span>
          <strong>{identity.displayName}</strong>
          <p>{identity.role}</p>
          <small>{identity.steamId}</small>
        </aside>
      </section>

      <ServerAdminPanel
        initialSnapshot={snapshot}
        canModerate={canRunModerationActions(identity)}
        canPowerControl={canRunServerPowerActions(identity)}
      />
    </main>
  );
}
