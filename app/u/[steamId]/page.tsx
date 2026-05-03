import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CharacterCard } from '@/components/CharacterCard';
import { UserAvatar } from '@/components/UserAvatar';
import { getCitizenName, getPlayer, getPropertyLayoutsForSteamId, getRoleForSteamId } from '@/lib/ape-data';
import { getCommunityProfile } from '@/lib/community-data';
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
  const isPrivate = communityProfile?.privacy === 'private' && !isOwner;
  const displayName = getCitizenName(player, steamProfile?.personaName || steamId);
  const avatar = communityProfile?.customAvatarUrl || steamProfile?.avatarFull || steamProfile?.avatarMedium;

  return (
    <main className="page-shell public-profile-page">
      <section className="profile-hero card" style={{ ['--profile-accent' as string]: communityProfile?.bannerColor ?? '#38bdf8' }}>
        <div className="profile-banner" />
        <div className="profile-headline">
          <UserAvatar src={avatar} name={displayName} size="xl" />
          <div>
            <span className="eyebrow">Citizen profile</span>
            <h1>{displayName}</h1>
            <p>{communityProfile?.bio || 'No public bio has been set yet.'}</p>
            <div className="pill-row">
              <span className="pill neutral">{role}</span>
              {communityProfile?.location ? <span className="pill neutral">{communityProfile.location}</span> : null}
              <span className={`pill ${isPrivate ? 'warning' : 'success'}`}>{isPrivate ? 'Private' : 'Public'}</span>
            </div>
          </div>
          {isOwner ? <Link className="button button-soft" href="/dashboard">Edit profile</Link> : null}
        </div>
      </section>

      {isPrivate ? (
        <section className="card auth-panel">
          <span className="eyebrow">Private profile</span>
          <h2>This citizen keeps their profile private.</h2>
          <p>Basic identity is visible, but character stats, property summaries, and activity details are hidden.</p>
        </section>
      ) : (
        <section className="layout-two single-profile-card">
          <CharacterCard player={player} steamId={steamId} layouts={layouts} publicView />
          <article className="card">
            <div className="section-heading"><span className="kicker">Public privacy model</span><h2>What is shown here</h2></div>
            <div className="mini-list">
              <div><strong>Shown</strong><span>Display name, bio, role label, playtime, selected stats, layout counts.</span></div>
              <div><strong>Hidden</strong><span>Exact inventory, phone messages, private logs, staff evidence, and sensitive gameplay details.</span></div>
            </div>
          </article>
        </section>
      )}
    </main>
  );
}
