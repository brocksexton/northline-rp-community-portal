import Link from 'next/link';
import { getSiteConfig } from '@/lib/site-config';

const communityLinks = [
  { label: 'Status', href: '/status', icon: 'fa-solid fa-signal' },
  { label: 'Tweeter', href: '/tweeter', icon: 'fa-brands fa-twitter' },
  { label: 'Players', href: '/players', icon: 'fa-solid fa-users' },
  { label: 'Guides', href: '/guides', icon: 'fa-solid fa-book-open-reader' },
  { label: 'Rules', href: '/rules', icon: 'fa-solid fa-scale-balanced' },
  { label: 'Bans', href: '/bans', icon: 'fa-solid fa-gavel' },
];

export async function Footer() {
  const config = await getSiteConfig();
  return (
    <footer className="site-footer site-footer-v2">
      <div className="site-footer-brand">
        <Link href="/" className="footer-wordmark" aria-label="Northline RP home">
          <span>Northline</span><b>RP</b>
        </Link>
        <p>{config.content.footerText || 'A small community-run companion site for Northline RP.'}</p>
        <div className="footer-pill-row" aria-label="Community notes">
          <span><i className="fa-solid fa-gamepad" aria-hidden="true" /> Northbound RP</span>
          <span><i className="fa-brands fa-steam" aria-hidden="true" /> Steam sign-in</span>
          <span><i className="fa-solid fa-heart" aria-hidden="true" /> Community run</span>
        </div>
      </div>

      <nav className="site-footer-links" aria-label="Footer navigation">
        <div>
          <strong>Explore</strong>
          {communityLinks.slice(0, 3).map((link) => (
            <Link href={link.href} key={link.href}><i className={link.icon} aria-hidden="true" /> {link.label}</Link>
          ))}
        </div>
        <div>
          <strong>Help</strong>
          {communityLinks.slice(3).map((link) => (
            <Link href={link.href} key={link.href}><i className={link.icon} aria-hidden="true" /> {link.label}</Link>
          ))}
        </div>
        <div>
          <strong>Community</strong>
          <a href={config.server.discordUrl}><i className="fa-brands fa-discord" aria-hidden="true" /> Discord</a>
          <a href="https://discord.gg/VExsvp4PXT" target="_blank" rel="noreferrer"><i className="fa-solid fa-beer-mug-empty" aria-hidden="true" /> Northbound RP</a>
          <Link href="/support"><i className="fa-solid fa-life-ring" aria-hidden="true" /> Support</Link>
        </div>
        <div>
          <strong>Small print</strong>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
        </div>
      </nav>
    </footer>
  );
}
