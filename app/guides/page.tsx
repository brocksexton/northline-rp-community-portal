import Link from 'next/link';
import { getGuideProgress } from '@/lib/ape-data';
import { getSessionSteamId } from '@/lib/session';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { notFound } from 'next/navigation';
import { enabledFeatureIds, getSiteFeatureSettings, isSiteFeatureEnabled } from '@/lib/site-features-data';
import GuideJobSection from '@/components/GuideJobSection';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Guides',
    description: 'Northline RP player guides for first steps, jobs, elections, money, inventory, banking, and property basics.',
    path: '/guides',
  });
}

const essentials = [
  {
    icon: '📱',
    title: 'Start with your phone',
    body: 'Press P in-game. Most of the systems you will use first live there, including jobs, banking, government, properties, and 911.',
    bullets: ['Open Job Finder early.', 'Check Government before doing something risky.', 'Use Bank to keep an eye on your balance.'],
  },
  {
    icon: '💵',
    title: 'Learn where your money and items go',
    body: 'Cash, bank money, inventory items, safe storage, and Town Hall storage all work a little differently. Knowing the basics saves a lot of confusion later.',
    bullets: ['Deposit cash at ATMs.', 'Store items in safes or storage.', 'Keep less value on you when possible.'],
  },
  {
    icon: '💼',
    title: 'Pick a job that fits your night',
    body: 'Courier, police, medic, mayor, citizen, and store-owner roles all create different kinds of RP. Start simple and branch out once you know the city better.',
    bullets: ['Use Job Finder and set a waypoint.', 'Do not worry if a job shows $0 salary.', 'Read the role guide before jumping in.'],
  },
];

const phoneApps = [
  { name: 'Job Finder', use: 'Browse jobs, check open slots, and set waypoints.' },
  { name: 'Government', use: 'See the current tax rate, laws, and illegal items.' },
  { name: 'Bank', use: 'Check your bank balance before visiting an ATM.' },
  { name: 'Properties', use: 'Manage property, storage, and saved layouts.' },
  { name: '911 Report', use: 'Report robberies, fights, suspicious activity, or other emergencies.' },
  { name: 'Tweeter', use: 'Use the city feed for public chatter, business posts, and RP hooks.' },
];


export default async function GuidesPage() {
  if (!(await isSiteFeatureEnabled('guides'))) notFound();

  const featureSettings = await getSiteFeatureSettings();
  const enabledFeatures = enabledFeatureIds(featureSettings);
  const rulesVisible = enabledFeatures.has('rules');
  const statusVisible = enabledFeatures.has('status');
  const supportVisible = enabledFeatures.has('support');

  const steamId = await getSessionSteamId();
  const progress = steamId ? await getGuideProgress(steamId) : null;
  const percent = progress?.percent ?? 0;
  const completed = progress?.completed ?? 0;
  const total = progress?.total ?? 0;

  return (
    <main className="page-shell guides-hub-page guides-overhaul-page">
      <section className="guides-hero guides-field-hero">
        <div className="guides-hero-copy">
          <span className="guides-kicker">Northline guidebook</span>
          <h1>Get comfortable in Northline, fast.</h1>
          <p>
            Start with the basics, then open a guide for the job or system you want to learn next.
          </p>
          <div className="guides-hero-actions">
            <a className="button button-primary" href="#job-guides">Browse guides</a>
            <a className="button button-soft" href="#phone-apps">Phone apps</a>
            {rulesVisible ? <Link className="button button-ghost" href="/rules">Read the rules</Link> : null}
          </div>
        </div>
        <aside className="guides-progress-card">
          <span>Guide progress</span>
          <strong>{steamId ? `${percent}%` : 'Ready to start'}</strong>
          <p>
            {steamId
              ? `${completed}/${total} guide cards seen in-game.`
              : 'Sign in with Steam to track which guides you have already worked through.'}
          </p>
          <div className="guides-progress-bar" aria-hidden="true">
            <i style={{ width: `${steamId ? Math.max(percent, 8) : 12}%` }} />
          </div>
          {!steamId ? <a className="button button-soft" href="/api/auth/steam?returnTo=/guides">Sign in with Steam</a> : null}
        </aside>
      </section>

      <section className="guides-quickbar" aria-label="Useful links">
        <Link href="/dashboard"><strong>Dashboard</strong><span>Profile, privacy, and account tools.</span></Link>
        {statusVisible ? <Link href="/status"><strong>Status</strong><span>Check the live server before you join.</span></Link> : null}
        {rulesVisible ? <Link href="/rules"><strong>Rules</strong><span>Read the server rules and roleplay expectations.</span></Link> : null}
        {supportVisible ? <Link href="/support"><strong>Support</strong><span>Get help with bugs, account issues, or reports.</span></Link> : null}
      </section>

      <section className="guides-section-heading">
        <span className="guides-kicker">Before you jump in</span>
        <h2>The things most new players need first.</h2>
      </section>

      <section className="guide-path-grid">
        {essentials.map((item) => (
          <article className="guide-path-card" key={item.title}>
            <span className="guide-path-icon">{item.icon}</span>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <ul>{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
          </article>
        ))}
      </section>

      <section className="guides-section-heading compact" id="phone-apps">
        <span className="guides-kicker">Most-used phone apps</span>
        <h2>Keep these in mind.</h2>
      </section>

      <section className="phone-app-grid">
        {phoneApps.slice(0, 6).map((app) => (
          <article key={app.name}>
            <span>{app.name}</span>
            <p>{app.use}</p>
          </article>
        ))}
      </section>

      <GuideJobSection />

      <section className="guides-layout">
        <aside className="guides-side-column">
          <article className="guides-card guides-tip-card">
            <span className="guides-kicker">Good first picks</span>
            <h3>Citizen, Courier, and the core basics guide are great starting points.</h3>
            <p>Once you know where your money, items, and storage live, the rest of the city starts to make a lot more sense.</p>
            <div className="guides-hero-actions">
              <a className="button button-primary" href="#job-guides">Browse guides</a>
              {supportVisible ? <Link className="button button-soft" href="/support">Need help?</Link> : null}
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}
