import Link from 'next/link';
import { getSiteConfig } from '@/lib/site-config';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { enabledFeatureIds, getSiteFeatureSettings } from '@/lib/site-features-data';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Terms and Conditions',
    description: 'Northline RP terms for Steam-linked access, community conduct, portal content, moderation, staff tools, and server data.',
    path: '/legal/terms',
  });
}

const quickRules = [
  { icon: 'fa-solid fa-gamepad', title: 'The live server wins', body: 'Website data is useful, but the in-game server and staff decisions are the authority.' },
  { icon: 'fa-solid fa-people-group', title: 'Use it respectfully', body: 'Do not use profiles, Tweeter, forum, messages, or support tools to harass, spam, impersonate, or evade moderation.' },
  { icon: 'fa-solid fa-gift', title: 'No pay-to-win', body: 'Any future supporter perks should remain cosmetic, convenience-based, or community-facing without gameplay power.' },
];

const termsSections = [
  {
    title: 'Agreement to these terms',
    body: [
      'By using the Northline RP website, signing in with Steam, posting content, applying for roles, using messages, or using staff tools, you agree to these Terms and Conditions and any server rules or community guidelines linked from the site or Discord.',
      'If you do not agree, do not use the portal. You may still be subject to server rules when playing on the Northline RP game server.',
    ],
  },
  {
    title: 'What the portal is for',
    body: [
      'Northline RP provides this website as a companion portal for the Northbound RP / ApeTavern / aperp s&box server. Features may include Steam sign-in, dashboards, player profiles, Tweeter, forum threads, messages, status pages, leaderboards, jobs/applications, bans/cases, support information, Discord integrations, and staff tools.',
      'The portal is provided for community use and server operations. Features may be changed, restricted, reset, disabled, or removed as the server develops.',
    ],
  },
  {
    title: 'Account access and responsibility',
    body: [
      'Steam sign-in connects your browser session to your SteamID64. You are responsible for actions taken through your signed-in browser session, especially on shared computers or public devices.',
      'Do not attempt to access another person\'s account, session, staff tools, API routes, server bridge, webhook, token, or permission-controlled page.',
    ],
  },
  {
    title: 'Community conduct',
    body: [
      'Do not use the website to harass, threaten, impersonate, dox, spam, scam, evade punishment, exploit bugs, scrape restricted information, attack the service, publish malware, or interfere with another player\'s ability to use the community.',
      'Content that is abusive, discriminatory, sexually exploitative, illegal, malicious, or disruptive may be hidden, edited, deleted, reported, or used as moderation evidence.',
    ],
  },
  {
    title: 'Profiles, posts, messages, and user content',
    body: [
      'You are responsible for profile text, avatars or linked images, Tweeter posts, forum posts, messages, applications, reports, and any other content you submit or make visible through the portal.',
      'By submitting content, you allow Northline RP to host, display, moderate, store, copy, and use that content as needed to run the website, operate the server, investigate reports, and preserve moderation history. You should not post content you do not have permission to use.',
    ],
  },
  {
    title: 'Moderation and access restrictions',
    body: [
      'Staff may warn users, remove content, hide profiles, restrict website features, disable messages, limit applications, soft-ban or ban accounts, revoke staff permissions, block specific pages, or take other reasonable actions needed to protect the server and community.',
      'Moderation decisions may consider in-game behaviour, website behaviour, Discord behaviour, ban history, staff audit records, and attempts to bypass restrictions.',
    ],
  },
  {
    title: 'Staff tools and administrative controls',
    body: [
      'Staff-only pages are provided for authorized operational use. Staff members must use those tools only for legitimate server administration, moderation, support, maintenance, and safety purposes.',
      'Staff actions may be logged, reviewed, and restricted. Access to pages such as Server Control, maintenance, audit panels, site settings, cases, Tweeter moderation, and Discord tools may be changed or disabled at any time.',
    ],
  },
  {
    title: 'Server and website accuracy',
    body: [
      'The live game server remains the source of truth for gameplay state. Website data may be delayed, stale, incomplete, or temporarily wrong during restarts, maintenance, bridge failures, file migrations, caching, or development work.',
      'Northline RP is not responsible for losses caused by relying on a stale website display instead of live in-game state or staff confirmation.',
    ],
  },
  {
    title: 'Supporter perks, donations, and store features',
    body: [
      'If donations, shop pages, or supporter features are added, they must not grant money, items, XP, weapons, job access, property advantage, combat advantage, police/government advantage, moderation preference, or any other gameplay power.',
      'Any supporter benefit should be cosmetic, convenience-based, community-facing, or otherwise non-pay-to-win. Refund rules, fulfilment details, and any required disclosures should be posted before paid features are accepted.',
    ],
  },
  {
    title: 'Availability, changes, and early access',
    body: [
      'Northline RP is an evolving community project. The website, server, data bridge, Discord relay, bot features, game exports, and staff tools may be unavailable, interrupted, changed, or removed without advance notice.',
      'We may update these terms when features, rules, integrations, or operational needs change. The Last updated date shows when this page was last materially revised.',
    ],
  },
  {
    title: 'Third-party services and non-affiliation',
    body: [
      'Steam, Discord, s&box, Facepunch, hosting providers, and other linked services are separate services with their own accounts, rules, terms, and privacy practices.',
      'Northline RP is not affiliated with Valve, Steam, Facepunch, Garry\'s Mod, ApeTavern, or Northbound RP unless expressly stated.',
    ],
  },
  {
    title: 'Contact',
    body: [
      'Questions about these terms, account access, profile restrictions, or moderation issues can be sent through Discord support or the contact email listed on this page.',
    ],
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
          <span className="eyebrow">Terms and Conditions</span>
          <h1>Ground rules for using the Northline RP portal.</h1>
          <p>
            These terms keep the website useful, protect the server, set expectations for community behaviour,
            and make clear that staff may moderate access when needed.
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
              {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
