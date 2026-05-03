import Link from 'next/link';
import { getSiteConfig } from '@/lib/site-config';

export async function Footer() {
  const config = await getSiteConfig();
  return (
    <footer className="site-footer">
      <div>
        <strong>{config.brand.name}</strong>
        <p>{config.content.footerText}</p>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/legal/terms">Terms</Link>
        <Link href="/support">Support</Link>
        <a href={config.server.discordUrl}>Discord</a>
      </nav>
    </footer>
  );
}
