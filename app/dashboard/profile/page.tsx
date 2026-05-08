import Link from 'next/link';
import { ProfileSettingsForm } from '@/components/ProfileSettingsForm';
import { UserAvatar } from '@/components/UserAvatar';
import { getCitizenName, getPermissionsForSteamId, getPlayer, getPropertyLayoutsForSteamId, getRoleForSteamId } from '@/lib/ape-data';
import { getCommunityProfile } from '@/lib/community-data';
import { createProfileEditToken, getSessionSteamId } from '@/lib/session';
import { getSteamProfile } from '@/lib/steam-openid';
import { enabledFeatureIds, getSiteFeatureSettings } from '@/lib/site-features-data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profile Studio' };

export default async function ProfileStudioPage() {
  const steamId = await getSessionSteamId();
  if (!steamId) return <main className="page-shell"><section className="card auth-panel"><span className="eyebrow">Profile studio</span><h1>Sign in required</h1><p>Sign in to edit your Northline profile.</p><a className="button button-primary" href="/api/auth/steam?returnTo=/dashboard/profile"><i className="fa-brands fa-steam" /> Sign in with Steam</a></section></main>;
  const [player, role, permissions, steamProfile, layouts, profile, featureSettings] = await Promise.all([getPlayer(steamId), getRoleForSteamId(steamId), getPermissionsForSteamId(steamId), getSteamProfile(steamId), getPropertyLayoutsForSteamId(steamId), getCommunityProfile(steamId), getSiteFeatureSettings()]);
  const displayName = getCitizenName(player, steamId);
  const avatar = profile?.customAvatarUrl || steamProfile?.avatarFull || steamProfile?.avatarMedium;
  const tweeterVisible = enabledFeatureIds(featureSettings).has('tweeter');
  return (
    <main className="page-shell dashboard-page account-command-page">
      <section className="dashboard-hero card dashboard-studio-hero account-subpage-hero">
        <div className="profile-headline dashboard-studio-headline"><UserAvatar src={avatar} name={displayName} size="xl" /><div><span className="eyebrow">Profile Studio</span><h1>Shape how citizens see you.</h1><p>Edit the visual identity, privacy, and public modules for {displayName}. Changes are account-scoped and do not alter your in-game character.</p><div className="button-row"><Link className="button button-soft" href="/dashboard"><i className="fa-solid fa-arrow-left" /> Back to hub</Link>{tweeterVisible ? <Link className="button button-primary" href={`/tweeter/profile/${steamId}`}>Preview public profile</Link> : null}<Link className="button button-soft" href="/dashboard/profile/data"><i className="fa-solid fa-file-shield" /> Data & Privacy</Link></div></div></div>
        <aside className="role-card dashboard-studio-progress"><span>Profile state</span><strong>{profile?.privacy === 'public' ? 'Public' : 'Private'}</strong><small>{Object.values(profile?.showcase ?? {}).filter(Boolean).length} public sections · {permissions.length} permissions</small></aside>
      </section>
      <ProfileSettingsForm profile={profile} profileEditToken={createProfileEditToken(steamId)} role={role} steamId={steamId} displayName={displayName} fallbackAvatar={avatar} tweeterVisible={tweeterVisible} />
    </main>
  );
}
