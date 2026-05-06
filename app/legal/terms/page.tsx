import Link from 'next/link';
import { getSiteConfig } from '@/lib/site-config';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { enabledFeatureIds, getSiteFeatureSettings } from '@/lib/site-features-data';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Terms and Conditions',
    description: 'Northline RP website terms for community access, game data, acceptable use, and portal limitations.',
    path: '/legal/terms',
  });
}

const quickRules = [
  { icon: 'fa-solid fa-gamepad', title: 'The game comes first', body: 'Website data is helpful, but the live server is still the source of truth.' },
  { icon: 'fa-solid fa-people-group', title: 'Be decent', body: 'Use the portal like a community tool, not a weapon to harass people.' },
  { icon: 'fa-solid fa-gift', title: 'No pay-to-win', body: 'Future support perks should stay cosmetic or community-facing.' },
];

const termsSections = [
  {
    title: 'What the website is for',
    body: 'Northline RP provides this website as a companion for the Northbound RP server: status, guides, player profiles, Tweeter, ban records, support information, and staff tools where appropriate.',
  },
  {
    title: 'Account access',
    body: 'Steam sign-in connects your browser session to your SteamID64. You are responsible for activity on your signed-in browser session. If you use a shared computer, log out when you are done.',
  },
  {
    title: 'Community conduct',
    body: 'Do not use website features to harass, impersonate, spam, evade moderation, scrape private information, attack the service, or make the community worse for other players.',
  },
  {
    title: 'Profiles and public content',
    body: 'You are responsible for the profile text, cover images, and public-facing choices you make. Staff may hide, edit, reset, or restrict profile features if something is abusive, unsafe, or disruptive.',
  },
  {
    title: 'Server and website accuracy',
    body: 'The site may be delayed, incomplete, or unavailable during server restarts, maintenance, file changes, or bridge work. In-game state and staff decisions take priority over website displays.',
  },
  {
    title: 'Supporter perks',
    body: 'If donations or supporter features are added later, they should not grant money, items, XP, weapons, job access, property advantage, combat advantage, moderation preference, or any other gameplay power.',
  },
  {
    title: 'Moderation and access',
    body: 'Staff may limit access to parts of the website, remove public content, disable features, or take other steps needed to protect the server and the people playing on it.',
  },
];

export default async function TermsPage() {
  const [config, featureSettings] = await Promise.all([getSiteConfig(), getSiteFeatureSettings()]);
  const enabledFeatures = enabledFeatureIds(featureSettings);
  const rulesVisible = enabledFeatures.has('rules');
  const supportVisible = enabledFeatures.has('support');

  return (
    <main className="page-shell policy-page policy-page-v2 terms-page-v2">
      <section className="policy-hero-v2 terms-hero-v2">
        <div>
          <span className="eyebrow">Terms</span>
          <h1>Simple ground rules for using the site.</h1>
          <p>
            Northline is a community project. These terms are here to keep the website useful, protect the server,
            and make sure future features stay fair.
          </p>
          <div className="policy-hero-actions-v2">
            {rulesVisible ? <Link className="button button-primary" href="/rules"><i className="fa-solid fa-scale-balanced" aria-hidden="true" /> Read server rules</Link> : null}
            {supportVisible ? <Link className="button button-soft" href="/support"><i className="fa-solid fa-circle-question" aria-hidden="true" /> Need help?</Link> : null}
          </div>
        </div>
        <aside className="policy-note-v2">
          <span>Last updated</span>
          <strong>{config.legal.lastModified}</strong>
          <p>Questions can be sent to <a href={`mailto:${config.legal.contactEmail}`}>{config.legal.contactEmail}</a>.</p>
        </aside>
      </section>

      <section className="policy-highlight-grid-v2" aria-label="Terms highlights">
        {quickRules.map((item) => (
          <article className="policy-mini-card-v2" key={item.title}>
            <i className={item.icon} aria-hidden="true" />
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <section className="policy-section-list-v2">
        {termsSections.map((section, index) => (
          <article className="policy-section-v2" key={section.title}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
