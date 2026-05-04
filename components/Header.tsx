import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';
import { getCitizenName, getPermissionsForSteamId, getPlayer, getRoleForSteamId } from '@/lib/ape-data';
import { getCommunityProfile } from '@/lib/community-data';
import { getSessionSteamId } from '@/lib/session';
import { getSiteConfig } from '@/lib/site-config';
import { getSteamProfile } from '@/lib/steam-openid';

const nav = [
  { href: '/status', label: 'Status' },
  { href: '/tweeter', label: 'Tweeter' },
  { href: '/players', label: 'Players' },
  { href: '/guides', label: 'Guides' },
  { href: '/rules', label: 'Rules' },
  { href: '/bans', label: 'Bans' },
];

function canSeeStaff(role: string, permissions: string[]) {
  return ['Developer', 'Admin', 'Moderator'].includes(role) || permissions.includes('ViewLogs') || permissions.includes('AdminTools');
}

export async function Header() {
  const [config, steamId] = await Promise.all([getSiteConfig(), getSessionSteamId()]);
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
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand-lockup" aria-label="Northline RP home">
          <span className="brand-mark">NL</span>
          <span>
            <strong>{config.brand.logoText}</strong>
            <small>{config.server.modeLabel}</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {nav.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          {staff ? <Link href="/staff">Staff</Link> : null}
        </nav>
        <div className="header-actions">
          {steamId ? (
            <>
              <Link className="header-user-pill" href="/dashboard" title="Open dashboard">
                <UserAvatar src={avatar} name={displayName} size="sm" />
                <span><strong>{displayName}</strong><small>{role}</small></span>
              </Link>
              <Link className="button button-ghost compact" href="/api/auth/logout">Log out</Link>
            </>
          ) : (
            <Link className="button button-primary" href="/api/auth/steam?returnTo=/dashboard"><i className="fa-brands fa-steam" aria-hidden="true" /> Steam sign-in</Link>
          )}
        </div>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <Link href="/">Home</Link>
        <Link href="/status">Status</Link>
        <Link href="/tweeter">Tweeter</Link>
        <Link href="/players">Players</Link>
        <Link href="/dashboard">Me</Link>
      </nav>
    </header>
  );
}
