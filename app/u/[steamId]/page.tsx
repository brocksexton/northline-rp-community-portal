import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProfileShowcasePanels } from '@/components/ProfileShowcasePanels';
import { UserAvatar } from '@/components/UserAvatar';
import { getPlayer, getPropertyLayoutsForSteamId, getRoleForSteamId } from '@/lib/ape-data';
import { getCommunityProfile } from '@/lib/community-data';
import { buildPublicProfileView } from '@/lib/profile-view';
import { getSessionSteamId } from '@/lib/session';
import { getSteamProfile } from '@/lib/steam-openid';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ steamId: string }> };

export default async function PublicProfilePage({ params }: Props) {
  const { steamId } = await params;
  if (!/^\d{15,20}$/.test(steamId)) notFound();

  const [viewerSteamId, player, role, steamProfile, layouts, communityProfile] = await Promise.all([
    getSessionSteamId(),
    getPlayer(steamId),
    getRoleForSteamId(steamId),
    getSteamProfile(steamId),
    getPropertyLayoutsForSteamId(steamId),
    getCommunityProfile(steamId),
  ]);

  if (!player && !steamProfile) notFound();

  const isOwner = viewerSteamId === steamId;
  const profile = buildPublicProfileView({
    steamId,
    player,
    role,
    layouts,
    communityProfile,
    fallbackName: steamProfile?.personaName || steamId,
  });
  const avatar = communityProfile?.customAvatarUrl || steamProfile?.avatarFull || steamProfile?.avatarMedium;
  const steamProfileUrl = steamProfile?.profileUrl || `https://steamcommunity.com/profiles/${steamId}`;
  const privateForViewer = profile.privacy === 'private' && !isOwner;

  return (
    <main className="page-shell public-profile-page">
      <section className="profile-hero card" style={{ ['--profile-accent' as string]: profile.bannerColor }}>
        <div className="profile-banner" />
        <div className="profile-headline">
          <UserAvatar src={avatar} name={profile.displayName} size="xl" />
          <div>
            <span className="eyebrow">Citizen profile</span>
            <h1>{profile.displayName}</h1>
            <p>{profile.bio}</p>
            <div className="pill-row">
              <span className="pill neutral">{profile.role}</span>
              <span className="pill neutral">{profile.title}</span>
              {profile.location ? <span className="pill neutral">{profile.location}</span> : null}
              {profile.websiteUrl ? <a className="pill neutral" href={profile.websiteUrl} rel="noreferrer" target="_blank">Website</a> : null}
              <span className={`pill ${privateForViewer ? 'warning' : 'success'}`}>{privateForViewer ? 'Private' : 'Public'}</span>
              <Link className="pill neutral" href={`/tweeter/profile/${steamId}`}>Open in Tweeter</Link>
            </div>
          </div>
          <div className="profile-action-stack">
            {isOwner ? <Link className="button button-soft" href="/dashboard">Edit profile</Link> : null}
            {!privateForViewer ? <a className="button button-soft steam-button" href={steamProfileUrl} rel="noreferrer" target="_blank"><i className="fa-brands fa-steam" aria-hidden="true" /> View Steam Profile</a> : null}
          </div>
        </div>
      </section>

      {privateForViewer ? (
        <section className="card auth-panel">
          <span className="eyebrow">Private profile</span>
          <h2>This citizen keeps their profile private.</h2>
          <p>Basic identity is visible, but economy, inventory, stats, property, and activity modules are hidden.</p>
        </section>
      ) : (
        <>
          <section className="card profile-public-note">
            <div>
              <span className="kicker">Public profile model</span>
              <h2>Published by player choice</h2>
              <p>Each gameplay module below is opt-in from the dashboard. Phone messages, staff logs, evidence, and moderation notes are never shown.</p>
            </div>
            <div className="profile-hidden-list">
              <strong>Hidden modules</strong>
              <span>{profile.hiddenSections.length ? profile.hiddenSections.join(', ') : 'None'}</span>
            </div>
          </section>
          <ProfileShowcasePanels profile={profile} />
        </>
      )}
    </main>
  );
}
