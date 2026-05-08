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
    description: 'Northline RP player guides for first steps, phone apps, jobs, money, inventory, banking, and property basics.',
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

const quickAnswers = [
  { q: 'How do I open my phone?', a: 'Press P in-game.' },
  { q: 'Why does a job show $0 salary?', a: 'Some jobs pay through tasks, deliveries, sales, or player interaction instead of a fixed salary.' },
  { q: 'How do I deposit cash?', a: 'Visit an ATM and use the Deposit option. The phone Bank app only shows your balance.' },
  { q: 'Where can I store items if I do not own a property?', a: 'Use the Town Hall / spawn storage until you have your own place.' },
  { q: 'Can I carry and drop cash or items?', a: 'Yes. Cash lives in your wallet and items live in your inventory, and both can be dropped when needed.' },
  { q: 'Where should I start if I am brand new?', a: 'Open the core basics guide first, then check a job guide like Courier or Citizen.' },
];

export default async function GuidesPage() {
  if (!(await isSiteFeatureEnabled('guides'))) notFound();

  const featureSettings = await getSiteFeatureSettings();
  const enabledFeatures = enabledFeatureIds(featureSettings);
  const rulesVisible = enabledFeatures.has('rules');
  const statusVisible = enabledFeatures.has('status');
  const supportVisible = enabledFeatures.has('support');
  const dashboardVisible = enabledFeatures.has('dashboard');

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
          <h1>Learn the essentials and get into the city.</h1>
          <p>
            Start with your phone, learn how money and storage work, then pick a job that matches the kind of RP you want to get into.
          </p>
          <div className="guides-hero-actions">
            <a className="button button-primary" href="#job-guides">Open guides</a>
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
              : 'Sign in with Steam to track your progress across the in-game guide cards.'}
          </p>
          <div className="guides-progress-bar" aria-hidden="true">
            <i style={{ width: `${steamId ? Math.max(percent, 8) : 12}%` }} />
          </div>
          {!steamId ? <a className="button button-soft" href="/api/auth/steam?returnTo=/guides">Sign in with Steam</a> : null}
        </aside>
      </section>

      <section className="guides-quickbar" aria-label="Useful links">
        {dashboardVisible ? <Link href="/dashboard"><strong>Dashboard</strong><span>Profile, privacy, and account tools.</span></Link> : null}
        {statusVisible ? <Link href="/status"><strong>Status</strong><span>Check the live server before you join.</span></Link> : null}
        {rulesVisible ? <Link href="/rules"><strong>Rules</strong><span>Read the server rules and roleplay expectations.</span></Link> : null}
        {supportVisible ? <Link href="/support"><strong>Support</strong><span>Get help with bugs, account issues, or reports.</span></Link> : null}
      </section>

      <section className="guides-section-heading">
        <span className="guides-kicker">Start here</span>
        <h2>The basics most players use first.</h2>
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

      <section className="guides-section-heading" id="phone-apps">
        <span className="guides-kicker">Phone apps</span>
        <h2>These are the ones you will use the most.</h2>
      </section>

      <section className="phone-app-grid">
        {phoneApps.map((app) => (
          <article key={app.name}>
            <span>{app.name}</span>
            <p>{app.use}</p>
          </article>
        ))}
      </section>

      <GuideJobSection />

      <section className="guides-layout">
        <div className="guides-main-column">
          <section className="guides-section-heading compact">
            <span className="guides-kicker">Quick answers</span>
            <h2>Common questions.</h2>
          </section>
          <article className="guides-card guide-faq-card">
            <div className="guide-faq-list">
              {quickAnswers.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </article>
        </div>

        <aside className="guides-side-column">
          <article className="guides-card guides-tip-card">
            <span className="guides-kicker">Good first picks</span>
            <h3>Citizen and Courier are easy places to start.</h3>
            <p>They help you learn the map, meet other players, and understand how the city works before you jump into bigger roles.</p>
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
