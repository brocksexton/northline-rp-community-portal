import Link from 'next/link';
import { getSiteConfig } from '@/lib/site-config';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { enabledFeatureIds, getSiteFeatureSettings } from '@/lib/site-features-data';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Privacy Policy',
    description: 'How the Northline RP portal uses Steam sign-in, public profiles, server files, and website-owned data.',
    path: '/legal/privacy',
  });
}

const privacyHighlights = [
  {
    icon: 'fa-brands fa-steam',
    title: 'Steam sign-in',
    body: 'We use Steam OpenID so the site knows which in-game save belongs to you.',
  },
  {
    icon: 'fa-solid fa-eye',
    title: 'Public profiles are opt-in',
    body: 'You decide whether your citizen profile is public and which game sections can show.',
  },
  {
    icon: 'fa-solid fa-server',
    title: 'Game exports power the site',
    body: 'Most gameplay information shown here comes from Northbound RP server files.',
  },
];

const privacySections = [
  {
    title: 'What this site reads',
    body: [
      'Northline reads server-side Northbound RP data so the website can show useful community pages. That can include citizen names, SteamID64 values, avatars, roles, titles, playtime summaries, profile settings, public Tweeter posts, property layout summaries, moderation records, and server status information.',
      'The game server stays the source of truth. If the website looks stale, missing, or odd during a restart, the in-game data is what matters.',
    ],
  },
  {
    title: 'What you can choose to share',
    body: [
      'Your public profile is controlled from the dashboard. You can keep your profile private, or you can publish selected sections such as economy, stats, properties, activity, or inventory summaries if that feature is available.',
      'Private profiles are hidden from the public player directory. Some basic moderation or ban-list information may still appear where the server publishes it for transparency.',
    ],
  },
  {
    title: 'What stays off public profiles',
    body: [
      'The website should not publicly expose private messages, staff-only notes, internal evidence, sensitive account details, private moderation discussion, or anything that would make the server less safe to run.',
      'If a page ever appears to show something it should not, please report it so it can be fixed quickly.',
    ],
  },
  {
    title: 'Cookies and sessions',
    body: [
      'When you sign in with Steam, the site stores a session cookie so you do not have to reconnect on every page. This cookie is used for account features such as likes, profile settings, and dashboard access.',
      'Clearing browser cookies or using certain privacy tools may sign you out.',
    ],
  },
  {
    title: 'Steam and third-party services',
    body: [
      'Steam handles the login confirmation. If configured, the site may request public Steam profile information such as display name and avatar. Discord links are provided for community support, but Discord is its own service with its own account and privacy settings.',
    ],
  },
  {
    title: 'Data changes and removal',
    body: [
      'You can change your profile visibility from the dashboard. If you need help with account/profile data that cannot be changed there, contact the server team through support or Discord.',
      'Some records may be kept when they are needed for moderation, safety, server integrity, or basic community transparency.',
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
          <span className="eyebrow">Privacy</span>
          <h1>Plain, practical privacy for Northline.</h1>
          <p>
            This website is here to make the server easier to use, not to surprise people with hidden data grabs.
            Here is what the portal reads, what you control, and where to ask for help.
          </p>
          <div className="policy-hero-actions-v2">
            <Link className="button button-primary" href="/dashboard"><i className="fa-solid fa-sliders" aria-hidden="true" /> Manage profile settings</Link>
            {supportVisible ? <Link className="button button-soft" href="/support"><i className="fa-solid fa-life-ring" aria-hidden="true" /> Ask for help</Link> : null}
          </div>
        </div>
        <aside className="policy-note-v2">
          <span>Last updated</span>
          <strong>{config.legal.lastModified}</strong>
          <p>Questions can be sent to <a href={`mailto:${config.legal.contactEmail}`}>{config.legal.contactEmail}</a>.</p>
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
