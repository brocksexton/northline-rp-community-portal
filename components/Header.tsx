import { HeaderNavClient } from '@/components/HeaderNavClient';
import { getCitizenName, getDataHealth, getPermissionsForSteamId, getPlayer, getPopulationSummary, getRoleForSteamId, getServerRuntimeStatus } from '@/lib/ape-data';
import { getCommunityProfile } from '@/lib/community-data';
import { getSessionSteamId } from '@/lib/session';
import { getSiteConfig } from '@/lib/site-config';
import { enabledFeatureIds, getSiteFeatureSettings, type SiteFeatureId } from '@/lib/site-features-data';
import { getSteamProfile } from '@/lib/steam-openid';

type HeaderNavItem = {
  href: string;
  label: string;
  icon: string;
  description: string;
  featureId: SiteFeatureId;
};

const nav: HeaderNavItem[] = [
  { href: '/status', label: 'Status', icon: 'fa-solid fa-signal', description: 'Server state and activity', featureId: 'status' },
  { href: '/tweeter', label: 'Tweeter', icon: 'fa-brands fa-twitter', description: 'In-character chatter', featureId: 'tweeter' },
  { href: '/players', label: 'Players', icon: 'fa-solid fa-users', description: 'Public citizen profiles', featureId: 'players' },
  { href: '/leaderboards', label: 'Boards', icon: 'fa-solid fa-ranking-star', description: 'Public rankings and brag boards', featureId: 'leaderboards' },
  { href: '/cases', label: 'Daily Drops', icon: 'fa-solid fa-gift', description: 'Daily free check-in cases', featureId: 'dailyDrops' },
  { href: '/jobs', label: 'Staff Apps', icon: 'fa-solid fa-briefcase', description: 'Staff job postings and applications', featureId: 'jobs' },
  { href: '/guides', label: 'Guides', icon: 'fa-solid fa-book-open-reader', description: 'Getting started and tips', featureId: 'guides' },
  { href: '/rules', label: 'Rules', icon: 'fa-solid fa-scale-balanced', description: 'How we keep things fun', featureId: 'rules' },
  { href: '/bans', label: 'Bans', icon: 'fa-solid fa-gavel', description: 'Public moderation records', featureId: 'bans' },
  { href: '/dev-blog', label: 'Dev Blog', icon: 'fa-solid fa-newspaper', description: 'Release notes and updates', featureId: 'devBlog' },
  { href: '/shop', label: 'Shop', icon: 'fa-solid fa-store', description: 'Supporter shop', featureId: 'shop' },
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
  const [steamId, population, config, health, featureSettings] = await Promise.all([
    getSessionSteamId(),
    getPopulationSummary(),
    getSiteConfig(),
    getDataHealth(),
    getSiteFeatureSettings(),
  ]);
  const enabled = enabledFeatureIds(featureSettings);
  const statusVisible = enabled.has('status');
  const tweeterVisible = enabled.has('tweeter');
  const dailyDropsVisible = enabled.has('dailyDrops');
  const guidesVisible = enabled.has('guides');
  const leaderboardsVisible = enabled.has('leaderboards');
  const supportVisible = enabled.has('support');

  const runtime = await getServerRuntimeStatus({
    health,
    population,
    staleAfterMinutes: config.status.offlineAfterMinutes,
    serverHost: config.status.serverHost,
    serverPort: config.status.serverPort,
    queryTimeoutMs: config.status.queryTimeoutMs,
    fallbackQueryHosts: config.status.fallbackQueryHosts,
    processNames: config.status.processNames,
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
  const profileHref = steamId ? `/tweeter/profile/${steamId}` : '/dashboard';
  const accountLinks = [
    { href: '/dashboard', label: 'Profile studio', icon: 'fa-solid fa-sliders' },
    ...(tweeterVisible ? [{ href: profileHref, label: 'My profile', icon: 'fa-brands fa-twitter' }] : []),
    ...(dailyDropsVisible ? [{ href: '/cases', label: 'Daily Drops', icon: 'fa-solid fa-gift' }] : []),
    ...(leaderboardsVisible ? [{ href: '/leaderboards', label: 'Leaderboards', icon: 'fa-solid fa-ranking-star' }] : []),
    ...(guidesVisible ? [{ href: '/guides', label: 'Guides', icon: 'fa-solid fa-book-open-reader' }] : []),
  ];

  return (
    <HeaderNavClient
      navItems={nav.filter((item) => enabled.has(item.featureId)).map(({ featureId: _featureId, ...item }) => item)}
      staff={staff}
      supportVisible={supportVisible}
      statusVisible={statusVisible}
      accountLinks={accountLinks}
      onlineCount={visibleOnlineCount}
      statusState={runtime.state}
      statusLabel={statusPillLabel(runtime.state, visibleOnlineCount)}
      user={steamId ? { steamId, displayName, role, avatar } : null}
    />
  );
}
