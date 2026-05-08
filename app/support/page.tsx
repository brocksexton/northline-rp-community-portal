import Link from 'next/link';
import { getSiteConfig } from '@/lib/site-config';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { notFound } from 'next/navigation';
import { enabledFeatureIds, getSiteFeatureSettings, isSiteFeatureEnabled, type SiteFeatureId } from '@/lib/site-features-data';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Support',
    description: 'Get help with Northline RP account issues, bugs, moderation questions, server status, and community support.',
    path: '/support',
  });
}

const helpCards: Array<{ icon: string; title: string; body: string; href: string; action: string; featureId: SiteFeatureId }> = [
  {
    icon: 'fa-solid fa-compass',
    title: 'New or lost?',
    body: 'Start with the field guide. It covers first steps, money, properties, Tweeter, and the bits people usually ask about first.',
    href: '/guides',
    action: 'Open guides',
    featureId: 'guides',
  },
  {
    icon: 'fa-solid fa-signal',
    title: 'Server acting weird?',
    body: 'Check the status page before assuming something broke. Restarts and file syncs can make the site lag behind the game for a bit.',
    href: '/status',
    action: 'Check status',
    featureId: 'status',
  },
  {
    icon: 'fa-solid fa-gavel',
    title: 'Ban or moderation question?',
    body: 'Public ban records are available for transparency. If you need to ask about a situation, bring context and keep it calm.',
    href: '/bans',
    action: 'View ban list',
    featureId: 'bans',
  },
];

const goodReportItems = [
  'Your Steam name or SteamID64',
  'What you were trying to do',
  'What happened instead',
  'A screenshot or clip if it helps',
  'Rough time/date if the issue happened in-game',
];

const supportBoundaries = [
  'Do not share passwords, Steam Guard codes, or private account tokens.',
  'Staff will not ask for payment to remove punishments or give in-game power.',
  'Profile and website bugs are easier to fix when reports are specific.',
];

export default async function SupportPage() {
  if (!(await isSiteFeatureEnabled('support'))) notFound();

  const [config, featureSettings] = await Promise.all([getSiteConfig(), getSiteFeatureSettings()]);
  const enabledFeatures = enabledFeatureIds(featureSettings);
  const guidesVisible = enabledFeatures.has('guides');
  const visibleHelpCards = helpCards.filter((card) => enabledFeatures.has(card.featureId));
  const shopVisible = enabledFeatures.has('shop');
  const discordUrl = config.server.discordUrl || 'https://discord.gg/mmwPf2dT8W';
  const northboundDiscord = 'https://discord.gg/VExsvp4PXT';

  return (
    <main className="page-shell support-page support-page-v2">
      <section className="support-hero-v2">
        <div>
          <span className="eyebrow">Support</span>
          <h1>Need help? Start here.</h1>
          <p>
            Use this page to find the right place for bugs, account help, questions, or moderation issues.
          </p>
          <div className="support-action-row-v2">
            <a className="button button-primary" href={discordUrl} target="_blank" rel="noreferrer"><i className="fa-brands fa-discord" aria-hidden="true" /> Join Northline Discord</a>
            {guidesVisible ? <Link className="button button-soft" href="/guides"><i className="fa-solid fa-book-open-reader" aria-hidden="true" /> Read the field guide</Link> : null}
          </div>
        </div>
        <aside className="support-contact-card-v2">
          <span>Best first step</span>
          <strong>Ask in Discord</strong>
          <p>For account, website, bug, or moderation questions, Discord is usually the quickest way to reach someone.</p>
        </aside>
      </section>

      <section className="support-card-grid-v2" aria-label="Common help paths">
        {visibleHelpCards.map((card) => (
          <article className="support-path-card-v2" key={card.title}>
            <i className={card.icon} aria-hidden="true" />
            <h2>{card.title}</h2>
            <p>{card.body}</p>
            <Link href={card.href}>{card.action} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
          </article>
        ))}
      </section>

      <section className="support-layout-v2">
        <article className="support-panel-v2">
          <span className="kicker">Making a useful report</span>
          <h2>What to include</h2>
          <p>Short reports are fine. Clear reports are better. A few details saves a lot of back-and-forth.</p>
          <div className="support-checklist-v2">
            {goodReportItems.map((item) => <span key={item}><i className="fa-solid fa-check" aria-hidden="true" /> {item}</span>)}
          </div>
        </article>

        {shopVisible ? (
          <article className="support-panel-v2 support-panel-warm-v2">
            <span className="kicker">Supporter stuff</span>
            <h2>Shop support is being prepared.</h2>
            <p>
              If Northline adds supporter perks later, the plan is still simple: keep it cosmetic, community-facing, and never pay-to-win.
            </p>
            <Link className="button button-soft" href="/legal/terms"><i className="fa-solid fa-file-contract" aria-hidden="true" /> Read the no pay-to-win promise</Link>
          </article>
        ) : null}
      </section>

      <section className="support-safety-strip-v2">
        <div>
          <span className="kicker">Quick reminders</span>
          <h2>Keep yourself safe.</h2>
        </div>
        <div className="support-boundary-list-v2">
          {supportBoundaries.map((item) => <p key={item}>{item}</p>)}
        </div>
      </section>

      <section className="support-community-links-v2">
        <a href={northboundDiscord} target="_blank" rel="noreferrer"><i className="fa-solid fa-gamepad" aria-hidden="true" /> Northbound RP Discord</a>
        <Link href="/legal/privacy"><i className="fa-solid fa-shield-halved" aria-hidden="true" /> Privacy Policy</Link>
        <Link href="/legal/terms"><i className="fa-solid fa-file-contract" aria-hidden="true" /> Terms</Link>
      </section>
    </main>
  );
}
