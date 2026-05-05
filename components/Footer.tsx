import Link from 'next/link';
import { getSiteConfig } from '@/lib/site-config';

const footerGroups = [
  {
    title: 'Explore',
    links: [
      { label: 'Status', href: '/status', icon: 'fa-solid fa-signal' },
      { label: 'Tweeter', href: '/tweeter', icon: 'fa-brands fa-twitter' },
      { label: 'Players', href: '/players', icon: 'fa-solid fa-users' },
      { label: 'Leaderboards', href: '/leaderboards', icon: 'fa-solid fa-ranking-star' },
      { label: 'Cases', href: '/cases', icon: 'fa-solid fa-gift' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Guides', href: '/guides', icon: 'fa-solid fa-book-open-reader' },
      { label: 'Rules', href: '/rules', icon: 'fa-solid fa-scale-balanced' },
      { label: 'Bans', href: '/bans', icon: 'fa-solid fa-gavel' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Discord', href: null, icon: 'fa-brands fa-discord' },
      { label: 'Northbound RP', href: 'https://discord.gg/VExsvp4PXT', icon: 'fa-solid fa-gamepad' },
      { label: 'Support', href: '/support', icon: 'fa-solid fa-life-ring' },
    ],
  },
];

function FooterWordmark() {
  return (
    <span className="footer-wordmark-v3" aria-hidden="true">
      <span>Northline</span><b>RP</b>
    </span>
  );
}

export async function Footer() {
  const config = await getSiteConfig();
  const discordUrl = config.server.discordUrl || 'https://discord.gg/VExsvp4PXT';

  return (
    <footer className="site-footer site-footer-v3">
      <div className="footer-main-v3">
        <section className="footer-brand-v3">
          <Link href="/" className="footer-brand-link-v3" aria-label="Northline RP home">
            <FooterWordmark />
          </Link>
          <p>
            Northline RP is a community-run companion site for our Northbound RP server. Jump into the city, check what is happening,
            and keep your profile looking like yours.
          </p>
          <div className="footer-actions-v3">
            <a href="https://discord.gg/VExsvp4PXT" target="_blank" rel="noreferrer"><i className="fa-solid fa-gamepad" aria-hidden="true" /> Northbound RP</a>
            <a href={discordUrl} target="_blank" rel="noreferrer"><i className="fa-brands fa-discord" aria-hidden="true" /> Discord</a>
            <a href="/api/auth/steam?returnTo=/dashboard"><i className="fa-brands fa-steam" aria-hidden="true" /> Steam sign-in</a>
          </div>
        </section>

        <nav className="footer-links-v3" aria-label="Footer navigation">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <strong>{group.title}</strong>
              {group.links.map((link) => {
                const href = link.href ?? discordUrl;
                const external = href.startsWith('http');
                const content = <><i className={link.icon} aria-hidden="true" /> {link.label}</>;
                return external ? (
                  <a href={href} target="_blank" rel="noreferrer" key={`${group.title}-${link.label}`}>{content}</a>
                ) : (
                  <Link href={href} key={`${group.title}-${link.label}`}>{content}</Link>
                );
              })}
            </div>
          ))}
          <div>
            <strong>Small print</strong>
            <Link href="/legal/privacy"><i className="fa-solid fa-shield-halved" aria-hidden="true" /> Privacy</Link>
            <Link href="/legal/terms"><i className="fa-solid fa-file-contract" aria-hidden="true" /> Terms</Link>
          </div>
        </nav>
      </div>

      <div className="footer-bottom-v3">
        <span>Community run, built for fun.</span>
        <span>Not affiliated with Valve, Steam, Facepunch, Garry&apos;s Mod, ApeTavern, or Northbound RP unless otherwise stated.</span>
      </div>
    </footer>
  );
}
