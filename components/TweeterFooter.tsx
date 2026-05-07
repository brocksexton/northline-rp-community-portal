import Link from 'next/link';
import { APP_VERSION } from '@/lib/app-version';

export function TweeterFooter() {
  return (
    <footer className="tweeter-legal-footer" aria-label="Tweeter disclaimer">
      <div className="tweeter-legal-footer-inner">
        <div className="tweeter-legal-copy">
          <strong>Tweeter is a parody social experience for Northline RP.</strong>
          <p>
            It is a fan-made feature for roleplay and community use, and is not affiliated with or endorsed by X, Twitter, or any other social platform.
          </p>
        </div>
        <nav className="tweeter-legal-links" aria-label="Tweeter footer links">
          <Link href="/rules">Rules</Link>
          <Link href="/players">Players</Link>
          <Link href="/status">Status</Link>
          <Link href="/">Main site</Link>
          <span className="tweeter-version-pill">v{APP_VERSION}</span>
        </nav>
      </div>
    </footer>
  );
}
