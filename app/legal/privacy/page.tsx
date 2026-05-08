import Link from 'next/link';
import { getSiteConfig } from '@/lib/site-config';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { enabledFeatureIds, getSiteFeatureSettings } from '@/lib/site-features-data';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Privacy Policy',
    description: 'How Northline RP collects, uses, stores, displays, and moderates Steam-linked portal, community, and server data.',
    path: '/legal/privacy',
  });
}

const privacyHighlights = [
  {
    icon: 'fa-brands fa-steam',
    title: 'Steam-linked access',
    body: 'Steam OpenID confirms your SteamID64 so the portal can connect you to your Northline RP citizen profile and permissions.',
  },
  {
    icon: 'fa-solid fa-user-shield',
    title: 'Privacy by default',
    body: 'Profiles and public pages are intentionally limited, with sensitive gameplay, account, message, and staff data kept out of public view.',
  },
  {
    icon: 'fa-solid fa-gavel',
    title: 'Safety and moderation',
    body: 'Staff may review logs, reports, posts, messages, bans, and audit records when needed to protect the server and community.',
  },
];


const thirdPartyPrivacyLinks = [
  { label: 'Cloudflare Privacy Policy', href: 'https://www.cloudflare.com/privacypolicy/' },
  { label: 'Steam Privacy Agreement', href: 'https://store.steampowered.com/privacy_agreement/' },
  { label: 'Discord Privacy Policy', href: 'https://discord.com/privacy' },
  { label: 's&box website', href: 'https://sbox.game/' },
];

const privacySections = [
  {
    title: 'Who this policy covers',
    body: [
      'This Privacy Policy applies to the Northline RP community portal at northline.lol and related Northline RP web features for the Northbound RP / ApeTavern / aperp s&box server.',
      'Northline RP is a community-run server. It is not affiliated with Valve, Steam, Facepunch, Garry\'s Mod, ApeTavern, or Northbound RP unless expressly stated.',
    ],
  },
  {
    title: 'Information we collect or read',
    body: [
      'The portal may read or store SteamID64 values, Steam display names, Steam avatars, citizen names, profile settings, public profile text, titles, roles, playtime summaries, job and character data, server connection history, public Tweeter/forum content, follows, likes, direct-message metadata/content where the messaging feature is used, Discord-link status, support/job applications, leaderboard values, ban records, moderation cases, audit logs, and server status information.',
      'The site also uses website-owned records such as profile privacy choices, bios, visibility settings, moderation settings, staff access overrides, maintenance settings, status posts, and feature toggles. These records are stored separately from the live game save files.',
    ],
  },
  {
    title: 'Technical data, cookies, and sessions',
    body: [
      'When you sign in with Steam, the portal stores a session cookie so you can stay signed in and use account features such as dashboard settings, follows, likes, messages, applications, and staff tools where authorized.',
      'The website is served through Cloudflare as the CDN, DNS, security, and reverse-proxy layer. Cloudflare and the origin host may process normal technical logs such as IP address, browser information, requested URLs, timestamps, errors, cache events, firewall/security events, and performance data. These logs are used for reliability, abuse prevention, troubleshooting, and security.',
    ],
  },
  {
    title: 'Steam, Discord, and third-party services',
    body: [
      'Steam handles login confirmation through Steam OpenID. Northline RP also uses server-side Steam Web API keys where configured to request public Steam profile information such as display name and avatar. Steam does not give Northline RP your Steam password through this process, and Steam API keys must remain server-side.',
      'Northline RP integrates with Discord for community support, announcements, account linking, forum identity, staff notifications, admin audit webhooks, and bot/relay features. Discord bot tokens, webhook URLs, Steam API keys, and other credentials are operational secrets and should not be exposed publicly. Discord, Steam, s&box, Cloudflare, and the hosting provider operate under their own terms and privacy policies.',
    ],
  },
  {
    title: 'How we use information',
    body: [
      'We use portal and server information to provide login, player profiles, dashboards, server status, public activity, Tweeter/forum features, messages, leaderboards, applications, support workflows, bans/cases, staff tools, security checks, abuse prevention, and community moderation.',
      'We may also use aggregate or operational data to understand uptime, population, feature usage, staff activity, server health, and whether a system is being abused or needs adjustment.',
    ],
  },
  {
    title: 'What may be public',
    body: [
      'Depending on feature settings and your profile choices, public pages may show Steam display name/avatar, citizen name, public bio, selected profile sections, public Tweeter posts, forum posts, follows/likes where visible, leaderboard entries, server activity summaries, and moderation records that are intentionally published for transparency.',
      'Private profiles are hidden from the public player directory. Some server-published or moderation-related information may still appear where it is required for safety, transparency, or rule enforcement.',
    ],
  },
  {
    title: 'What is restricted from public view',
    body: [
      'The portal should not publicly expose private messages, exact private inventories, sensitive economy details, internal staff notes, moderation evidence, staff audit data, private Discord relay material, server secrets, webhook URLs, Steam API keys, or information that would make the server easier to exploit.',
      'Staff-only pages may show more information than public pages. Staff access is permission-based and may be audited, restricted, or removed.',
    ],
  },
  {
    title: 'Moderation, staff review, and safety records',
    body: [
      'Staff may review user content, private reports, applications, messages, connection history, ban records, cases, server actions, and audit logs when needed to investigate abuse, enforce rules, protect players, secure the site, or comply with a legitimate request.',
      'Administrative actions may be logged with the acting staff member, affected SteamID/account, action type, timestamp, and relevant notes so the team can detect misuse and maintain accountability.',
    ],
  },
  {
    title: 'Retention and deletion',
    body: [
      'You can update profile visibility and editable profile content from the dashboard where those controls are available. You can also contact the team for help with account/profile data that cannot be changed directly.',
      'You can use Profile Studio > Data & Privacy to request a downloadable archive of your account-linked website data and available game/server data, or to submit a deletion request for staff review. The export is provided as a ZIP with plain README notes and structured JSON files where available.',
      'Deletion requests can affect live game data. If processed, your character progress, money, inventory, rewards, and other in-game progress may be reset or removed with no recovery option. The deletion tool requires acknowledgement checkboxes and typed confirmation before the request is submitted. Some limited moderation, security, audit, or abuse-prevention records may be retained where operationally necessary.',
      'Northline RP keeps limited server/provider backups for up to 14 days. Deleted live data may remain inside backup snapshots until those backups expire. If a backup must be restored, we will communicate it through Discord and the website status page, and will make a reasonable effort to re-apply completed deletion requests where technically possible.',
    ],
  },
  {
    title: 'Security',
    body: [
      'Northline RP uses server-side permission checks for staff and admin functionality, Cloudflare as a public-facing protection layer, and private server-side credentials for integrations. Secrets such as Steam Web API keys, Discord bot tokens, webhook URLs, bridge tokens, and command credentials should remain server-side and should not be committed to public code.',
      'No community website can guarantee perfect security. Please report suspected data leaks, account issues, or unsafe pages through Discord support or the contact email below.',
    ],
  },
  {
    title: 'Access, questions, and changes',
    body: [
      'You may ask what account/profile information is associated with your SteamID64, request correction of inaccurate website-owned profile data, or ask for deletion where deletion is practical and not blocked by moderation, security, or operational needs.',
      'We may update this policy as the portal adds or changes features. The Last updated date shows when this page was last materially revised.',
    ],
  },
];

export default async function PrivacyPage() {
  const [config, featureSettings] = await Promise.all([getSiteConfig(), getSiteFeatureSettings()]);
  const enabledFeatures = enabledFeatureIds(featureSettings);
  const supportVisible = enabledFeatures.has('support');

  return (
    <main className="page-shell policy-page policy-page-v2">
      <section className="policy-hero-v2">
        <div>
          <span className="eyebrow">Privacy Policy</span>
          <h1>Plain, practical privacy for Northline RP.</h1>
          <p>
            This portal connects Steam, website features, and Northbound RP server data. This policy explains what
            information is collected or read, what may become public, what remains restricted, and how to contact the team.
          </p>
          <div className="policy-hero-actions-v2">
            <Link className="button button-primary" href="/dashboard/profile/data"><i className="fa-solid fa-file-shield" aria-hidden="true" /> Manage Data & Privacy</Link>
            {supportVisible ? <Link className="button button-soft" href="/support"><i className="fa-solid fa-life-ring" aria-hidden="true" /> Ask for help</Link> : null}
          </div>
        </div>
        <aside className="policy-note-v2">
          <span>Last updated</span>
          <strong>{config.legal.lastModified}</strong>
          <p>Privacy questions can be sent to <a href={`mailto:${config.legal.contactEmail}`}>{config.legal.contactEmail}</a>.</p>
        </aside>
      </section>

      <section className="policy-highlight-grid-v2" aria-label="Privacy highlights">
        {privacyHighlights.map((item) => (
          <article className="policy-mini-card-v2" key={item.title}>
            <i className={item.icon} aria-hidden="true" />
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </section>


      <section className="policy-self-service-v2" aria-label="Your privacy tools">
        <div>
          <span className="eyebrow">Your privacy tools</span>
          <h2>Download your data or request deletion.</h2>
          <p>Signed-in players can use Profile Studio to export account-linked records or submit a deletion request. Deletion can reset in-game progress, so the request form explains the impact before it can be sent.</p>
        </div>
        <Link className="button button-primary" href="/dashboard/profile/data"><i className="fa-solid fa-file-shield" aria-hidden="true" /> Open Data & Privacy</Link>
      </section>

      <section className="policy-service-links-v2" aria-label="Related third-party privacy links">
        <strong>Related service policies</strong>
        <div>
          {thirdPartyPrivacyLinks.map((item) => <a href={item.href} target="_blank" rel="noreferrer" key={item.href}>{item.label}</a>)}
        </div>
      </section>

      <section className="policy-section-list-v2">
        {privacySections.map((section, index) => (
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
