import { notFound } from 'next/navigation';
import { PlayersDirectory, type PlayerDirectoryEntry } from '@/components/PlayersDirectory';
import {
  getCitizenName,
  getConnectionEvents,
  getPlayers,
  getPopulationSummary,
  getRoleAssignments,
  getRoleDefinitions,
  getTweeterData,
} from '@/lib/ape-data';
import { getCommunityProfiles } from '@/lib/community-data';
import { getSessionSteamId } from '@/lib/session';
import { getSteamProfiles } from '@/lib/steam-openid';
import { playerTitle } from '@/lib/format';
import { getProfileCoverPreset } from '@/lib/profile-customization';
import { getTweeterRestrictionMap } from '@/lib/tweeter-moderation-data';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { enabledFeatureIds, getSiteFeatureSettings, isSiteFeatureEnabled } from '@/lib/site-features-data';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Players',
    description: 'Public Northline RP citizen directory for claimed, discoverable community profiles.',
    path: '/players',
  });
}

function makeHandle(name: string, steamId: string) {
  const clean = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return clean ? `@${clean}` : `@${steamId.slice(-8)}`;
}

function joinedLabel(value: unknown) {
  const raw = typeof value === 'string' ? value : '';
  if (!raw) return 'Joined date unknown';
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return 'Joined date unknown';
  return `Joined ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
}

function activityLabel(steamId: string, onlineIds: Set<string>, lastSeen: Map<string, string>) {
  if (onlineIds.has(steamId)) return { label: 'Online now', bucket: 'recent' as const };
  const seen = lastSeen.get(steamId);
  if (!seen) return { label: 'Not enough history', bucket: 'unknown' as const };
  const diff = Date.now() - new Date(seen).getTime();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  if (Number.isFinite(diff) && diff <= fourteenDays) return { label: 'Recently around', bucket: 'recent' as const };
  return { label: 'Quiet lately', bucket: 'quiet' as const };
}

function publicModuleCount(showcase: { economy?: boolean; inventory?: boolean; stats?: boolean; properties?: boolean; activity?: boolean } | undefined | null) {
  return Object.values(showcase ?? {}).filter(Boolean).length;
}

export default async function PlayersPage() {
  if (!(await isSiteFeatureEnabled('players'))) notFound();

  const [sessionSteamId, players, roles, roleDefs, profiles, population, events, tweeter, featureSettings] = await Promise.all([
    getSessionSteamId(),
    getPlayers(),
    getRoleAssignments(),
    getRoleDefinitions(),
    getCommunityProfiles(),
    getPopulationSummary(),
    getConnectionEvents(),
    getTweeterData(),
    getSiteFeatureSettings(),
  ]);

  const enabledFeatures = enabledFeatureIds(featureSettings);
  const tweeterVisible = enabledFeatures.has('tweeter');
  const supportVisible = enabledFeatures.has('support');

  const playerBySteam = new Map(players.map((player) => [String(player.SteamId), player]));
  const defaultRole = roleDefs.find((role) => role.IsDefault)?.Name ?? 'User';
  const rolesBySteam = new Map(roles.map((role) => [String(role.SteamId), role.RoleName]));
  const onlineIds = new Set(population.onlinePlayers.map((player) => player.steamId));
  const lastSeenBySteam = new Map<string, string>();
  for (const event of events) lastSeenBySteam.set(String(event.SteamId), event.Timestamp);

  const tweetCounts = new Map<string, number>();
  if (tweeterVisible) for (const tweet of tweeter.Tweets) {
    const steamId = String(tweet.AuthorSteamId);
    tweetCounts.set(steamId, (tweetCounts.get(steamId) ?? 0) + 1);
  }

  const profileSteamIds = Object.keys(profiles);
  const [steamProfiles, restrictionMap] = await Promise.all([
    getSteamProfiles(profileSteamIds),
    getTweeterRestrictionMap(profileSteamIds),
  ]);
  const claimedSaveIds = new Set(profileSteamIds.filter((steamId) => playerBySteam.has(steamId)));
  const isAllowedOnPublicDirectory = (steamId: string) => {
    const restriction = restrictionMap[steamId];
    return !restriction || (restriction.status === 'none' && !restriction.activeGameBan && !restriction.hiddenFromTweeter);
  };

  const entries: PlayerDirectoryEntry[] = Object.entries(profiles)
    .filter(([steamId, profile]) => profile.privacy === 'public' && isAllowedOnPublicDirectory(steamId))
    .map(([steamId, profile]) => {
      const player = playerBySteam.get(steamId) ?? null;
      const steam = steamProfiles.get(steamId) ?? null;
      const displayName = getCitizenName(player, steam?.personaName || `Citizen ${steamId.slice(-8)}`);
      const role = rolesBySteam.get(steamId) ?? defaultRole;
      const activity = activityLabel(steamId, onlineIds, lastSeenBySteam);
      const coverPreset = getProfileCoverPreset(profile.coverPreset);
      const coverImageUrl = profile.customCoverUrl?.trim() || coverPreset.imageUrl || '';
      return {
        steamId,
        displayName,
        handle: makeHandle(displayName, steamId),
        avatarUrl: profile.customAvatarUrl || steam?.avatarMedium || steam?.avatarFull || null,
        bannerColor: profile.bannerColor || '#38bdf8',
        coverImageUrl,
        coverGradient: coverPreset.gradient,
        role,
        title: playerTitle(player?.DisplayTitle),
        bio: profile.bio?.trim() || '',
        location: profile.location?.trim() || '',
        joinedLabel: joinedLabel(player?.FirstJoinedUtc),
        lastSeenLabel: activity.label,
        activityBucket: activity.bucket,
        tweetCount: tweetCounts.get(steamId) ?? 0,
        publicModules: publicModuleCount(profile.showcase),
        hasBio: Boolean(profile.bio?.trim()),
        isCurrentUser: sessionSteamId === steamId,
      };
    });

  const rolesInUse = [...new Set(entries.map((entry) => entry.role))].sort((a, b) => {
    if (a === defaultRole) return 1;
    if (b === defaultRole) return -1;
    return a.localeCompare(b);
  });
  const privateProfiles = Object.entries(profiles).filter(([steamId, profile]) => profile.privacy === 'private' && playerBySteam.has(steamId) && isAllowedOnPublicDirectory(steamId)).length;
  const currentProfile = sessionSteamId ? profiles[sessionSteamId] ?? null : null;

  return (
    <main className="page-shell players-directory-page">
      <PlayersDirectory
        entries={entries}
        roles={rolesInUse}
        stats={{
          totalSaves: players.length,
          listedProfiles: entries.length,
          privateProfiles,
          unclaimedSaves: Math.max(0, players.length - claimedSaveIds.size),
          onlineNow: population.onlineCount,
        }}
        signedIn={Boolean(sessionSteamId)}
        currentUserListed={Boolean(sessionSteamId && entries.some((entry) => entry.steamId === sessionSteamId))}
        currentUserPrivate={currentProfile?.privacy === 'private'}
        currentUserRestricted={Boolean(sessionSteamId && !isAllowedOnPublicDirectory(sessionSteamId))}
        tweeterVisible={tweeterVisible}
        supportVisible={supportVisible}
      />
    </main>
  );
}
