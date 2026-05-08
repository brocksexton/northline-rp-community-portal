import Link from 'next/link';
import { StaffPrivacyRequestsPanel } from '@/components/StaffPrivacyRequestsPanel';
import { canManageStaffAudit, getCurrentStaffIdentity } from '@/lib/staff-auth';
import { getPrivacyAdminState } from '@/lib/privacy-data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Privacy Requests' };

export default async function StaffPrivacyPage() {
  const identity = await getCurrentStaffIdentity();
  if (!identity || !canManageStaffAudit(identity)) return <main className="page-shell"><section className="card auth-panel"><span className="eyebrow">Staff privacy</span><h1>Access denied</h1><p>This workspace is limited to Administrators and Developers.</p><a className="button button-primary" href="/api/auth/steam?returnTo=/staff/privacy"><i className="fa-brands fa-steam" /> Sign in with Steam</a></section></main>;
  const state = await getPrivacyAdminState();
  return <main className="page-shell staff-page staff-command-page"><section className="staff-command-hero staff-command-center-hero"><div className="staff-command-copy"><span className="ops-kicker"><i /> Privacy Requests</span><h1>Data exports and deletion requests.</h1><p>Review player privacy requests, track processing notes, and make sure deletion requests are handled carefully.</p><div className="staff-hero-actions"><Link className="button button-soft" href="/staff"><i className="fa-solid fa-arrow-left" /> Back to staff panel</Link></div></div><aside className="staff-identity-card staff-operator-card"><span>Operator</span><strong>{identity.displayName}</strong><p>{identity.roleLabel}</p><small>{identity.steamId}</small></aside></section><StaffPrivacyRequestsPanel initialState={state} /></main>;
}
