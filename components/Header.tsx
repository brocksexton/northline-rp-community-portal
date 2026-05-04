import Link from 'next/link';
import { getSessionSteamId } from '@/lib/session';
import { getPermissionsForSteamId, getRoleForSteamId } from '@/lib/ape-data';
import { getSiteConfig } from '@/lib/site-config';

const nav = [
  { href: '/status', label: 'Status' },
  { href: '/tweeter', label: 'Feed' },
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
  const [role, permissions] = steamId ? await Promise.all([getRoleForSteamId(steamId), getPermissionsForSteamId(steamId)]) : ['Guest', [] as string[]];
  const staff = steamId ? canSeeStaff(role, permissions) : false;

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
              <Link className="button button-soft" href="/dashboard">Dashboard</Link>
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
        <Link href="/tweeter">Feed</Link>
        <Link href="/players">Players</Link>
        <Link href="/dashboard">Me</Link>
      </nav>
    </header>
  );
}
