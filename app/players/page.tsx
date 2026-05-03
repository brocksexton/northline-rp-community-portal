import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';
import { getAllGuideProgress, getAllPropertyLayouts, getCitizenName, getPlayers, getRoleAssignments, getRoleDefinitions } from '@/lib/ape-data';
import { getCommunityProfiles } from '@/lib/community-data';
import { buildPublicProfileView } from '@/lib/profile-view';
import { getSteamProfiles } from '@/lib/steam-openid';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Players' };

export default async function PlayersPage() {
  const [players, roles, roleDefs, profiles, layouts, guideProgress] = await Promise.all([
    getPlayers(),
    getRoleAssignments(),
    getRoleDefinitions(),
    getCommunityProfiles(),
    getAllPropertyLayouts(),
    getAllGuideProgress(),
  ]);
  const defaultRole = roleDefs.find((role) => role.IsDefault)?.Name ?? 'User';
  const rolesBySteam = new Map(roles.map((role) => [String(role.SteamId), role.RoleName]));
  const layoutCounts = new Map<string, number>();
  for (const layout of layouts) layoutCounts.set(String(layout.OwnerSteamId), (layoutCounts.get(String(layout.OwnerSteamId)) ?? 0) + 1);
  const steamIds = players.map((player) => String(player.SteamId));
  const steamProfiles = await getSteamProfiles(steamIds);

  const publicPlayers = players
    .map((player) => {
      const steamId = String(player.SteamId);
      return { player, steamId, community: profiles[steamId] ?? null, steam: steamProfiles.get(steamId) ?? null };
    })
    .filter(({ community }) => community?.privacy !== 'private')
    .sort((a, b) => Number(b.player.TotalPlaytimeSeconds ?? 0) - Number(a.player.TotalPlaytimeSeconds ?? 0));

  return (
    <main className="page-shell players-page">
      <section className="hero split-hero">
        <div><span className="eyebrow">Citizen directory</span><h1>Players who make the city feel alive.</h1><p>Profiles are privacy-safe and opt-out. Sensitive data stays hidden from public pages.</p></div>
        <aside className="card compact-card"><span>Public profiles</span><strong>{publicPlayers.length}</strong><small>{players.length} total saves</small></aside>
      </section>

      <section className="player-grid">
        {publicPlayers.length ? publicPlayers.map(({ player, steamId, community, steam }) => {
          const role = rolesBySteam.get(steamId) ?? defaultRole;
          const profile = buildPublicProfileView({ steamId, player, role, layouts: layouts.filter((layout) => String(layout.OwnerSteamId) === steamId), communityProfile: community, fallbackName: steam?.personaName || steamId });
          const name = getCitizenName(player, steam?.personaName || steamId);
          return (
            <article className="card player-card" key={steamId}>
              <div className="player-card-top">
                <UserAvatar src={community?.customAvatarUrl || steam?.avatarMedium || null} name={name} size="lg" />
                <div><h2>{name}</h2><p>{community?.bio || player.DisplayTitle || 'Northline citizen'}</p></div>
              </div>
              <dl className="metric-grid compact">
                <div><dt>Role</dt><dd>{role}</dd></div>
                <div><dt>Level</dt><dd>{profile.stats ? profile.stats.level : 'Hidden'}</dd></div>
                <div><dt>Playtime</dt><dd>{profile.activity ? profile.activity.playtime : 'Hidden'}</dd></div>
                <div><dt>Layouts</dt><dd>{profile.properties ? (layoutCounts.get(steamId) ?? 0) : 'Hidden'}</dd></div>
                <div><dt>Guides</dt><dd>{profile.activity ? `${guideProgress.get(steamId)?.percent ?? 0}%` : 'Hidden'}</dd></div>
                <div><dt>Joined</dt><dd>{player.FirstJoinedUtc ? new Date(player.FirstJoinedUtc).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Unknown'}</dd></div>
              </dl>
              <Link className="button button-soft" href={`/u/${steamId}`}>View profile</Link>
            </article>
          );
        }) : <section className="card empty-state"><strong>No public profiles yet</strong><p>Players can make profiles public from their dashboard.</p></section>}
      </section>
    </main>
  );
}
