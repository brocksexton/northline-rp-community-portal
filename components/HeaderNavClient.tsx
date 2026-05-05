'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserAvatar } from '@/components/UserAvatar';

type NavItem = {
  href: string;
  label: string;
  icon: string;
  description?: string;
};

type HeaderNavClientProps = {
  navItems: NavItem[];
  staff: boolean;
  user: {
    steamId: string;
    displayName: string;
    role: string;
    avatar: string | null;
  } | null;
  onlineCount: number;
};

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Wordmark() {
  return (
    <span className="northline-wordmark" aria-hidden="true">
      <span className="northline-wordmark-text">Northline</span><span className="northline-wordmark-rp">RP</span>
    </span>
  );
}

export function HeaderNavClient({ navItems, staff, user, onlineCount }: HeaderNavClientProps) {
  const pathname = usePathname() || '/';
  const visibleItems = staff ? [...navItems, { href: '/staff', label: 'Staff', icon: 'fa-solid fa-shield-halved', description: 'Staff tools' }] : navItems;
  const profileHref = user ? `/tweeter/profile/${user.steamId}` : '/api/auth/steam?returnTo=/dashboard';

  return (
    <header className="site-header site-header-v3">
      <div className="header-inner header-inner-v3">
        <Link href="/" className="brand-lockup brand-lockup-v3" aria-label="Northline RP home">
          <Wordmark />
        </Link>

        <nav className="desktop-nav desktop-nav-v3" aria-label="Primary navigation">
          {visibleItems.map((item) => (
            <Link className={isActive(pathname, item.href) ? 'active' : ''} key={item.href} href={item.href}>
              <i className={item.icon} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="header-actions header-actions-v3">
          <Link className="city-status-pill" href="/status" aria-label={`${onlineCount} players online, view status`}>
            <span className="city-status-dot" aria-hidden="true" />
            <strong>{onlineCount}</strong>
            <span>online</span>
          </Link>

          {user ? (
            <details className="account-menu">
              <summary aria-label="Open account menu">
                <UserAvatar src={user.avatar} name={user.displayName} size="sm" />
                <span className="account-summary-text">
                  <strong>{user.displayName}</strong>
                  <small>{user.role}</small>
                </span>
                <i className="fa-solid fa-chevron-down" aria-hidden="true" />
              </summary>
              <div className="account-menu-panel">
                <div className="account-menu-heading">
                  <UserAvatar src={user.avatar} name={user.displayName} size="md" />
                  <span><strong>{user.displayName}</strong><small>{user.role}</small></span>
                </div>
                <Link href="/dashboard"><i className="fa-solid fa-sliders" aria-hidden="true" /> Profile studio</Link>
                <Link href={profileHref}><i className="fa-brands fa-twitter" aria-hidden="true" /> My profile</Link>
                <Link href="/cases"><i className="fa-solid fa-gift" aria-hidden="true" /> Cases</Link>
                <Link href="/leaderboards"><i className="fa-solid fa-ranking-star" aria-hidden="true" /> Leaderboards</Link>
                <Link href="/guides"><i className="fa-solid fa-book-open-reader" aria-hidden="true" /> Guides</Link>
                <form action="/api/auth/logout" method="post">
                  <button type="submit"><i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" /> Log out</button>
                </form>
              </div>
            </details>
          ) : (
            <a className="button button-primary nav-steam-signin" href="/api/auth/steam?returnTo=/dashboard"><i className="fa-brands fa-steam" aria-hidden="true" /> Steam sign-in</a>
          )}

          <details className="mobile-menu-v3">
            <summary aria-label="Open navigation menu"><i className="fa-solid fa-bars" aria-hidden="true" /></summary>
            <div className="mobile-menu-panel-v3">
              <Link href="/" className="mobile-brand-link"><Wordmark /></Link>
              <div className="mobile-menu-status"><span className="city-status-dot" /> <strong>{onlineCount}</strong> players online</div>
              <nav aria-label="Mobile navigation">
                {visibleItems.map((item) => (
                  <Link className={isActive(pathname, item.href) ? 'active' : ''} key={item.href} href={item.href}>
                    <i className={item.icon} aria-hidden="true" />
                    <span><strong>{item.label}</strong><small>{item.description}</small></span>
                  </Link>
                ))}
              </nav>
              <div className="mobile-account-actions">
                {user ? (
                  <>
                    <Link href="/dashboard"><i className="fa-solid fa-sliders" aria-hidden="true" /> Profile studio</Link>
                    <Link href={profileHref}><i className="fa-brands fa-twitter" aria-hidden="true" /> My profile</Link>
                    <Link href="/cases"><i className="fa-solid fa-gift" aria-hidden="true" /> Cases</Link>
                    <form action="/api/auth/logout" method="post"><button type="submit"><i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" /> Log out</button></form>
                  </>
                ) : (
                  <a href="/api/auth/steam?returnTo=/dashboard"><i className="fa-brands fa-steam" aria-hidden="true" /> Steam sign-in</a>
                )}
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
