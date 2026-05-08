'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { UserAvatar } from '@/components/UserAvatar';

type NavItem = {
  href: string;
  label: string;
  icon: string;
  description?: string;
};

type AccountLink = { href: string; label: string; icon: string };

type HeaderNavClientProps = {
  navItems: NavItem[];
  staff: boolean;
  supportVisible: boolean;
  statusVisible: boolean;
  accountLinks: AccountLink[];
  user: {
    steamId: string;
    displayName: string;
    role: string;
    avatar: string | null;
  } | null;
  onlineCount: number | null;
  statusState: string;
  statusLabel: string;
};


type LiveHeaderStatus = {
  onlineCount: number | null;
  statusState: string;
  statusLabel: string;
};

function liveStatusLabel(state: string, onlineCount: number | null) {
  if (state === 'offline') return 'Offline';
  if (state === 'data_missing' || state === 'unknown') return 'Checking';
  if (onlineCount === 1) return '1 online';
  return `${onlineCount ?? 0} online`;
}

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

export function HeaderNavClient({ navItems, staff, supportVisible, statusVisible, accountLinks, user, onlineCount, statusState, statusLabel }: HeaderNavClientProps) {
  const pathname = usePathname() || '/';
  const [liveStatus, setLiveStatus] = useState<LiveHeaderStatus>({ onlineCount, statusState, statusLabel });

  useEffect(() => {
    setLiveStatus({ onlineCount, statusState, statusLabel });
  }, [onlineCount, statusState, statusLabel]);

  useEffect(() => {
    if (!statusVisible) return;
    let cancelled = false;
    const refreshStatus = async () => {
      try {
        const response = await fetch('/api/status', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        const state = String(data?.runtime?.state ?? data?.state ?? 'unknown');
        const count = state === 'offline' || state === 'data_missing' || state === 'unknown'
          ? null
          : typeof data?.population?.onlineCount === 'number'
            ? data.population.onlineCount
            : typeof data?.runtime?.playerCount === 'number'
              ? data.runtime.playerCount
              : null;
        if (!cancelled) setLiveStatus({ onlineCount: count, statusState: state, statusLabel: liveStatusLabel(state, count) });
      } catch {
        // Keep the server-rendered value if the refresh fails.
      }
    };
    void refreshStatus();
    const interval = window.setInterval(refreshStatus, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [statusVisible]);
  const visibleItems = staff ? [...navItems, { href: '/staff', label: 'Staff', icon: 'fa-solid fa-shield-halved', description: 'Staff tools' }] : navItems;
  const supportItem: NavItem | null = supportVisible ? { href: '/support', label: 'Support', icon: 'fa-solid fa-life-ring', description: 'Get help or report an issue' } : null;
  const primaryHrefs = new Set(['/status', '/tweeter', '/players', '/rules', '/leaderboards']);
  const primaryItems = visibleItems.filter((item) => primaryHrefs.has(item.href));
  const moreItems = [...visibleItems.filter((item) => !primaryHrefs.has(item.href)), ...(supportItem ? [supportItem] : [])];
  const moreActive = moreItems.some((item) => isActive(pathname, item.href));
  const mobileItems = [...visibleItems, ...(supportItem ? [supportItem] : [])];

  return (
    <header className="site-header site-header-v3">
      <div className="header-inner header-inner-v3">
        <Link href="/" className="brand-lockup brand-lockup-v3" aria-label="Northline RP home">
          <Wordmark />
        </Link>

        <nav className="desktop-nav desktop-nav-v3" aria-label="Primary navigation">
          {primaryItems.map((item) => (
            <Link className={isActive(pathname, item.href) ? 'active' : ''} key={item.href} href={item.href}>
              <i className={item.icon} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
          {moreItems.length ? (
            <details className="nav-more-menu">
              <summary className={moreActive ? 'active' : ''}>
                <i className="fa-solid fa-ellipsis" aria-hidden="true" />
                <span>More</span>
                <i className="fa-solid fa-chevron-down nav-more-chevron" aria-hidden="true" />
              </summary>
              <div className="nav-more-panel">
                {moreItems.map((item) => (
                  <Link className={isActive(pathname, item.href) ? 'active' : ''} key={item.href} href={item.href}>
                    <i className={item.icon} aria-hidden="true" />
                    <span><strong>{item.label}</strong><small>{item.description}</small></span>
                  </Link>
                ))}
              </div>
            </details>
          ) : null}
        </nav>

        <div className="header-actions header-actions-v3">
          {statusVisible ? (
            <Link className={`city-status-pill tone-${liveStatus.statusState}`} href="/status" aria-label={`${liveStatus.statusLabel}, view server status`}>
              <span className="city-status-dot" aria-hidden="true" />
              {liveStatus.onlineCount === null ? <strong>{liveStatus.statusLabel}</strong> : <><strong>{liveStatus.onlineCount}</strong><span>online</span></>}
            </Link>
          ) : null}

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
                {accountLinks.map((link) => (
                  <Link href={link.href} key={link.href}><i className={link.icon} aria-hidden="true" /> {link.label}</Link>
                ))}
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
              {statusVisible ? <div className={`mobile-menu-status tone-${liveStatus.statusState}`}><span className="city-status-dot" /> <strong>{liveStatus.statusLabel}</strong></div> : null}
              <nav aria-label="Mobile navigation">
                {mobileItems.map((item) => (
                  <Link className={isActive(pathname, item.href) ? 'active' : ''} key={item.href} href={item.href}>
                    <i className={item.icon} aria-hidden="true" />
                    <span><strong>{item.label}</strong><small>{item.description}</small></span>
                  </Link>
                ))}
              </nav>
              <div className="mobile-account-actions">
                {user ? (
                  <>
                    {accountLinks.map((link) => (
                      <Link href={link.href} key={link.href}><i className={link.icon} aria-hidden="true" /> {link.label}</Link>
                    ))}
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
