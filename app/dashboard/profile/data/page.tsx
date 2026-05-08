import Link from 'next/link';
import { ProfileDataPrivacyPanel } from '@/components/ProfileDataPrivacyPanel';
import { getUserPrivacyRequests } from '@/lib/privacy-data';
import { getSessionSteamId } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Data & Privacy' };

export default async function ProfileDataPrivacyPage() {
  const steamId = await getSessionSteamId();
  if (!steamId) return <main className="page-shell"><section className="card auth-panel"><span className="eyebrow">Data & Privacy</span><h1>Sign in required</h1><p>Sign in with Steam to download your account data or request deletion.</p><a className="button button-primary" href="/api/auth/steam?returnTo=/dashboard/profile/data"><i className="fa-brands fa-steam" /> Sign in with Steam</a></section></main>;
  const requests = await getUserPrivacyRequests(steamId);
  return <main className="page-shell privacy-studio-page"><section className="dashboard-hero card dashboard-studio-hero account-subpage-hero privacy-studio-hero"><div><span className="eyebrow">Profile Studio</span><h1>Data & Privacy</h1><p>Download your account-linked data or request deletion. The deletion flow uses plain warnings because it can affect your in-game progress.</p><div className="button-row"><Link className="button button-soft" href="/dashboard/profile"><i className="fa-solid fa-arrow-left" /> Back to Profile Studio</Link><Link className="button button-soft" href="/legal/privacy">Read privacy policy</Link></div></div><aside className="role-card"><span>Signed in SteamID</span><strong>{steamId}</strong><small>Only this account can be exported from here.</small></aside></section><ProfileDataPrivacyPanel requests={requests} /></main>;
}
