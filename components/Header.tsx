import { HeaderNavClient } from '@/components/HeaderNavClient';
import { getCitizenName, getPermissionsForSteamId, getPlayer, getPopulationSummary, getRoleForSteamId } from '@/lib/ape-data';
import { getCommunityProfile } from '@/lib/community-data';
import { getSessionSteamId } from '@/lib/session';
import { getSteamProfile } from '@/lib/steam-openid';

const nav = [
  { href: '/status', label: 'Status', icon: 'fa-solid fa-signal', description: 'Server state and activity' },
  { href: '/tweeter', label: 'Tweeter', icon: 'fa-brands fa-twitter', description: 'In-character chatter' },
  { href: '/players', label: 'Players', icon: 'fa-solid fa-users', description: 'Public citizen profiles' },
  { href: '/guides', label: 'Guides', icon: 'fa-solid fa-book-open-reader', description: 'Getting started and tips' },
  { href: '/rules', label: 'Rules', icon: 'fa-solid fa-scale-balanced', description: 'How we keep things fun' },
  { href: '/bans', label: 'Bans', icon: 'fa-solid fa-gavel', description: 'Public moderation records' },
];

function canSeeStaff(role: string, permissions: string[]) {
  return ['Developer', 'Admin', 'Moderator'].includes(role) || permissions.includes('ViewLogs') || permissions.includes('AdminTools');
}

export async function Header() {
  const [steamId, population] = await Promise.all([getSessionSteamId(), getPopulationSummary()]);
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
      onlineCount={population.onlineCount}
      user={steamId ? { steamId, displayName, role, avatar } : null}
    />
  );
}
