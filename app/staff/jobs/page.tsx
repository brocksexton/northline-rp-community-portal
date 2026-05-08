import Link from 'next/link';
import { StaffJobsAdminPanel } from '@/components/StaffJobsAdminPanel';
import { getJobsAdminState } from '@/lib/jobs-data';
import { getCurrentStaffIdentity, canAccessServerAdministration, canAccessStaffPage, canManageJobPostings, canReviewJobApplications } from '@/lib/staff-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Staff Applications Workspace' };

export default async function StaffJobsWorkspacePage() {
  const identity = await getCurrentStaffIdentity();
  const allowed = identity ? await canAccessStaffPage(identity, 'jobs') : false;

  if (!identity || !allowed) {
    return (
      <main className="page-shell">
        <section className="card auth-panel">
          <span className="eyebrow">Staff</span>
          <h1>Access denied</h1>
          <p>This page requires a Northbound RP staff role.</p>
          <a className="button button-primary" href="/api/auth/steam?returnTo=/staff/jobs">
            <i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam
          </a>
        </section>
      </main>
    );
  }

  const state = await getJobsAdminState();
  const canManagePostings = canManageJobPostings(identity);
  const canReviewApplications = canReviewJobApplications(identity);

  return (
    <main className="page-shell staff-page staff-command-page staff-dedicated-shell">
      <section className="staff-command-hero staff-dedicated-hero">
        <div className="staff-command-copy">
          <span className="ops-kicker"><i /> Hiring workspace</span>
          <h1>Staff applications and role postings</h1>
          <p>Everything related to role postings and applicant review now has its own dedicated workspace so it is easier to read, manage, and navigate.</p>
          <div className="staff-hero-actions">
            <Link className="button button-primary" href="/staff"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to staff home</Link>
            <Link className="button button-soft" href="/jobs"><i className="fa-solid fa-eye" aria-hidden="true" /> Open public portal</Link>
          </div>
        </div>
        <aside className="staff-identity-card">
          <span>Current queue</span>
          <strong>{state.stats.openApplications}</strong>
          <p>{state.stats.totalApplications} total applications</p>
          <small>{state.stats.visiblePostings} public posting{state.stats.visiblePostings === 1 ? '' : 's'} live</small>
        </aside>
      </section>

      <section className="staff-workspace-grid staff-context-grid">
        <article className="staff-workspace-card compact">
          <div className="staff-workspace-topline"><span className="kicker">Postings</span><span className="staff-workspace-icon"><i className="fa-solid fa-list-check" aria-hidden="true" /></span></div>
          <h3>Role builder</h3>
          <p>Create and tune public postings with summaries, expectations, qualities, and custom position-specific questions.</p>
        </article>
        <article className="staff-workspace-card compact">
          <div className="staff-workspace-topline"><span className="kicker">Reviews</span><span className="staff-workspace-icon"><i className="fa-solid fa-clipboard-check" aria-hidden="true" /></span></div>
          <h3>Applicant review queue</h3>
          <p>Change statuses, add applicant-facing notes, and keep staff-only context in the same focused review layout.</p>
        </article>
      </section>

      <StaffJobsAdminPanel initialState={state} canManagePostings={canManagePostings} canReviewApplications={canReviewApplications} />
    </main>
  );
}
