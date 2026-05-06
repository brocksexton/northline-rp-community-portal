import { HeaderNavClient } from '@/components/HeaderNavClient';
import { getCitizenName, getDataHealth, getPermissionsForSteamId, getPlayer, getPopulationSummary, getRoleForSteamId, getServerRuntimeStatus } from '@/lib/ape-data';
import { getCommunityProfile } from '@/lib/community-data';
import { getSessionSteamId } from '@/lib/session';
import { getSiteConfig } from '@/lib/site-config';
import { getSteamProfile } from '@/lib/steam-openid';

const nav = [
  { href: '/status', label: 'Status', icon: 'fa-solid fa-signal', description: 'Server state and activity' },
  { href: '/tweeter', label: 'Tweeter', icon: 'fa-brands fa-twitter', description: 'In-character chatter' },
  { href: '/players', label: 'Players', icon: 'fa-solid fa-users', description: 'Public citizen profiles' },
  { href: '/leaderboards', label: 'Boards', icon: 'fa-solid fa-ranking-star', description: 'Public rankings and brag boards' },
  { href: '/cases', label: 'Cases', icon: 'fa-solid fa-gift', description: 'Daily free check-in cases' },
  { href: '/guides', label: 'Guides', icon: 'fa-solid fa-book-open-reader', description: 'Getting started and tips' },
  { href: '/rules', label: 'Rules', icon: 'fa-solid fa-scale-balanced', description: 'How we keep things fun' },
  { href: '/bans', label: 'Bans', icon: 'fa-solid fa-gavel', description: 'Public moderation records' },
];

function canSeeStaff(role: string, permissions: string[]) {
  return ['Developer', 'Admin', 'Moderator'].includes(role) || permissions.includes('ViewLogs') || permissions.includes('AdminTools');
}

function statusPillLabel(state: string, onlineCount: number | null) {
  if (state === 'offline') return 'Offline';
  if (state === 'data_missing' || state === 'unknown') return 'Checking';
  if (onlineCount === 1) return '1 online';
  return `${onlineCount ?? 0} online`;
}

export async function Header() {
  const [steamId, population, config, health] = await Promise.all([
    getSessionSteamId(),
    getPopulationSummary(),
    getSiteConfig(),
    getDataHealth(),
  ]);
  const runtime = await getServerRuntimeStatus({
    health,
    population,
    staleAfterMinutes: config.status.offlineAfterMinutes,
    serverHost: config.status.serverHost,
    serverPort: config.status.serverPort,
    queryTimeoutMs: config.status.queryTimeoutMs,
  });
  const visibleOnlineCount = runtime.state === 'offline' || runtime.state === 'data_missing'
    ? null
    : runtime.playerCount ?? population.onlineCount;
  const [role, permissions, player, communityProfile, steamProfile] = steamId
    ? await Promise.all([
      getRoleForSteamId(steamId),
      getPermissionsForSteamId(steamId),
      getPlayer(steamId),
      getCommunityProfile(steamId),
      getSteamProfile(steamId),
    ])
    : ['Guest', [] as string[], null, null, null] as const;
  const staff = steamId ? canSeeStaff(role, permissions) : false;
  const displayName = steamId ? getCitizenName(player, steamId) : 'Guest';
  const avatar = communityProfile?.customAvatarUrl || steamProfile?.avatarMedium || steamProfile?.avatarFull || null;

  return (
    <HeaderNavClient
      navItems={nav}
      staff={staff}
      onlineCount={visibleOnlineCount}
      statusState={runtime.state}
      statusLabel={statusPillLabel(runtime.state, visibleOnlineCount)}
      user={steamId ? { steamId, displayName, role, avatar } : null}
    />
  );
}
