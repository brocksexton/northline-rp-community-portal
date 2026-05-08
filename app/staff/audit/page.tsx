import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StaffAuditPanel } from '@/components/StaffAuditPanel';
import { getStaffAuditState } from '@/lib/staff-audit-data';
import { requireServerAdministrationPage } from '@/lib/staff-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const metadata = { title: 'Staff Audit' };

export default async function StaffAuditPage() {
  const identity = await requireServerAdministrationPage('audit');
  if (!identity) notFound();
  const state = await getStaffAuditState();

  return (
    <main className="page-shell staff-page staff-command-page staff-dedicated-shell staff-audit-page">
      <section className="staff-command-hero staff-dedicated-hero">
        <div className="staff-command-copy">
          <span className="ops-kicker"><i /> Administrator audit</span>
          <h1>Staff activity and access audit.</h1>
          <p>Review sign-in gaps, action patterns, and page access overrides in one place.</p>
          <div className="staff-hero-actions">
            <Link className="button button-primary" href="/staff"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to command center</Link>
            <Link className="button button-soft" href="/staff/activity"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> Activity center</Link>
          </div>
        </div>
        <aside className="staff-identity-card">
          <span>Signed in as</span>
          <strong>{identity.displayName}</strong>
          <p>{identity.role}</p>
          <small>{identity.steamId}</small>
        </aside>
      </section>

      <StaffAuditPanel initialState={state} />
    </main>
  );
}
