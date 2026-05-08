import Link from 'next/link';
import { GUIDE_CATALOG, getGuideProgress } from '@/lib/ape-data';
import { getSessionSteamId } from '@/lib/session';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { notFound } from 'next/navigation';
import { enabledFeatureIds, getSiteFeatureSettings, isSiteFeatureEnabled } from '@/lib/site-features-data';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Guides',
    description: 'Northline RP field guides for first steps, roleplay, money, property, Tweeter, and getting settled.',
    path: '/guides',
  });
}

const paths = [
  {
    id: 'first-night',
    icon: '🌙',
    title: 'I just spawned in',
    summary: 'A simple route through your first session without overthinking everything.',
    bullets: ['Skim the quick rules', 'Find food and water', 'Say hi and see what people are doing'],
  },
  {
    id: 'money',
    icon: '💸',
    title: 'I need cash',
    summary: 'A few ways to get started without turning every night into a grind.',
    bullets: ['Try basic jobs', 'Ask about player businesses', 'Save a bit before buying toys'],
  },
  {
    id: 'roleplay',
    icon: '🎭',
    title: 'I want better scenes',
    summary: 'Small habits that make hanging out, arguing, working, and getting into trouble more fun.',
    bullets: ['Give people something to reply to', 'Play along when it feels right', 'Have a reason for what you do'],
  },
  {
    id: 'property',
    icon: '🏠',
    title: 'I want a place',
    summary: 'Turn a blank room into a hangout, shop, office, hideout, or questionable garage.',
    bullets: ['Start small', 'Make it easy to use', 'Save layouts carefully'],
  },
  {
    id: 'trouble',
    icon: '🚨',
    title: 'Something went wrong',
    summary: 'What to do if there is a bug, a rule issue, or a scene stops being fun.',
    bullets: ['Take a breath', 'Keep useful details', 'Ask staff when it actually needs a hand'],
  },
  {
    id: 'identity',
    icon: '🪪',
    title: 'I want people to know my character',
    summary: 'Use Tweeter, profiles, and regular in-game moments to become a familiar face.',
    bullets: ['Claim your profile', 'Post from in-game Tweeter', 'Give people something to remember'],
  },
];

const quickAnswers = [
  { q: 'Where do I start?', a: 'Hop in, get food and water, say hi to someone, and find out what people are already doing.' },
  { q: 'Do I need a public profile?', a: 'No. Profiles are opt-in. If you want to appear in the player directory, make your profile public from the dashboard.' },
  { q: 'Can I post to Tweeter from the website?', a: 'Not yet. Post from inside the game for now so it stays tied to the live server.' },
  { q: 'What should I do when a scene feels off?', a: 'Take a breath, step back if you need to, and only use reports when something actually needs staff attention.' },
];

const guideSections = [
  {
    id: 'first-night',
    title: 'Your first 15 minutes',
    tag: 'Start here',
    summary: 'You do not need to know everything on day one. Get settled, find a reason to talk to someone, and let the night go from there.',
    steps: [
      'Skim the rules page before jumping into anything messy.',
      'Find food and water so the basics are handled early.',
      'Talk to another player with a small reason: work, directions, gossip, a favor, or just curiosity.',
      'Hold off on huge crime or huge drama until you understand the server a little better.',
      'Open Tweeter in-game and see what people are talking about.',
    ],
  },
  {
    id: 'roleplay',
    title: 'Making scenes fun',
    tag: 'Playing your character',
    summary: 'You do not need a huge backstory. Give people something to respond to and let things happen naturally.',
    steps: [
      'Give your character a simple reason to talk before starting a scene.',
      'Use talking, jokes, deals, mistakes, pride, or bad ideas before jumping straight to violence.',
      'Let scenes breathe. A pause can be more interesting than a sprint to the next mechanic.',
      'Take small losses when they make sense. People remember players who are fun to deal with.',
      'Try to keep out-of-character frustration from steering every in-character choice.',
    ],
  },
  {
    id: 'money',
    title: 'Making money without turning it into homework',
    tag: 'Economy',
    summary: 'Money is useful, but it is more fun when it gives you reasons to meet people, make plans, and get into situations.',
    steps: [
      'Start with simple work until you understand the server rhythm.',
      'Ask around for player-run jobs, shops, delivery work, repairs, events, or odd favors.',
      'Treat criminal money as a choice that can create trouble, not just a faster wallet number.',
      'Do not dump every dollar into one plan unless you are ready for that plan to go sideways.',
      'Only show profile stats you are comfortable with other players seeing.',
    ],
  },
  {
    id: 'property',
    title: 'Properties, builds, and hangouts',
    tag: 'World building',
    summary: 'A good space gives people a reason to stop by. It does not need to be perfect; it just needs to feel useful or fun.',
    steps: [
      'Pick a simple purpose: store, apartment, club, clinic, office, workshop, or meeting spot.',
      'Make the entrance and interaction points obvious so people know how to use the space.',
      'Use props to support the scene, not bury it under clutter.',
      'Save layouts when you are happy with them and avoid relying on unsaved changes.',
      'Invite people in. A business, club, or hangout only works when people know it exists.',
    ],
  },
  {
    id: 'trouble',
    title: 'When something goes sideways',
    tag: 'Help',
    summary: 'Most problems get easier when everyone slows down. If something really needs staff, clear details help more than heat.',
    steps: [
      'Separate “I did not like that” from “a rule was broken.” They are not always the same thing.',
      'Keep names, time, clips, screenshots, and a short explanation if you have them.',
      'Do not chase or harass the other player while waiting for staff.',
      'Use reports, appeals, or tickets with calm details. Staff can work faster when the message is readable.',
      'If staff makes a call, try to move on unless there is a real reason to follow up.',
    ],
  },
  {
    id: 'identity',
    title: 'Profiles, Tweeter, and local reputation',
    tag: 'Community',
    summary: 'The website is here to back up what happens in-game, not replace it.',
    steps: [
      'Claim your profile from the dashboard if you want to appear publicly.',
      'Choose what gameplay details, if any, you want to show publicly.',
      'Use Tweeter for rumors, jokes, business posts, beef, apologies, events, and terrible decisions.',
      'Keep private profiles private if that suits you. Not every character needs a public page.',
      'Give people an easy way to describe your character. That is how regulars start remembering you.',
    ],
  },
];

const doDont = [
  { do: 'Give people an easy way into the scene.', dont: 'Expect everyone to read your mind.' },
  { do: 'Play along when it makes sense.', dont: 'Treat every setback like an admin problem.' },
  { do: 'Ask simple questions in character when possible.', dont: 'Drag every small thing out of character.' },
  { do: 'Use the website to catch up and plan.', dont: 'Forget that the fun is still in-game.' },
];

function slugFromTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const coreOnboardingIds = ['first_join', 'shop', 'properties'];
const roleGuideIds = ['police_officer', 'chief_of_police', 'mayor'];

function stepStatus(done: boolean, previousDone: boolean) {
  if (done) return 'done';
  return previousDone ? 'next' : 'todo';
}

export default async function GuidesPage() {
  if (!(await isSiteFeatureEnabled('guides'))) notFound();
  const featureSettings = await getSiteFeatureSettings();
  const enabledFeatures = enabledFeatureIds(featureSettings);
  const tweeterVisible = enabledFeatures.has('tweeter');
  const rulesVisible = enabledFeatures.has('rules');
  const playersVisible = enabledFeatures.has('players');
  const statusVisible = enabledFeatures.has('status');
  const supportVisible = enabledFeatures.has('support');

  const steamId = await getSessionSteamId();
  const progress = steamId ? await getGuideProgress(steamId) : null;
  const completed = progress?.completed ?? 0;
  const total = progress?.total ?? GUIDE_CATALOG.length;
  const percent = progress?.percent ?? 0;
  const seenIds = new Set(progress?.seen ?? []);
  const coreGuides = GUIDE_CATALOG.filter((guide) => coreOnboardingIds.includes(guide.id));
  const roleGuides = GUIDE_CATALOG.filter((guide) => roleGuideIds.includes(guide.id));
  const coreSeen = coreGuides.filter((guide) => seenIds.has(guide.id));
  const nextCoreGuide = coreGuides.find((guide) => !seenIds.has(guide.id));
  const nextMissingGuide = GUIDE_CATALOG.find((guide) => !seenIds.has(guide.id));
  const signedIn = Boolean(steamId);
  const hasFirstSteps = seenIds.has('first_join');
  const hasEconomy = seenIds.has('shop');
  const hasProperties = seenIds.has('properties');
  const hasAnyRoleGuide = roleGuides.some((guide) => seenIds.has(guide.id));
  const corePercent = coreGuides.length ? Math.round((coreSeen.length / coreGuides.length) * 100) : 0;
  const nextStep = !signedIn
    ? { title: 'Sign in with Steam', body: 'Connect your account so this page can show your own progress instead of the general guide.', href: '/api/auth/steam?returnTo=/guides', label: 'Sign in with Steam' }
    : nextCoreGuide
      ? { title: `Open “${nextCoreGuide.title}”`, body: 'This is the next basics card to check off. You can read the short version below, then look for it in-game when you hop on.', href: `#${slugFromTitle(nextCoreGuide.title)}`, label: 'Jump to the guide card' }
      : nextMissingGuide
        ? { title: 'You are through the basics', body: 'The remaining cards are extra or role-specific. Open them when they match what you are doing in-game.', href: `#${slugFromTitle(nextMissingGuide.title)}`, label: 'See the next extra card' }
        : { title: 'You are caught up', body: 'You have seen every guide card currently mirrored here. Go make a mess, open a shop, or see what people are doing.', href: tweeterVisible ? '/tweeter' : '/dashboard', label: tweeterVisible ? 'Check Tweeter' : 'Open dashboard' };
  const journeySteps = [
    {
      id: 'sign-in',
      title: 'Connect your account',
      body: signedIn ? 'You are signed in, so the guide can track your own progress.' : 'Sign in with Steam to see what you have already finished.',
      status: signedIn ? 'done' : 'next',
      href: signedIn ? '/dashboard' : '/api/auth/steam?returnTo=/guides',
      action: signedIn ? 'Open dashboard' : 'Sign in',
    },
    {
      id: 'first-steps',
      title: 'Get the first steps out of the way',
      body: hasFirstSteps ? 'You have seen the first steps card.' : 'Start here if you are new, returning, or just trying to remember what matters first.',
      status: stepStatus(hasFirstSteps, signedIn),
      href: '#first-steps',
      action: 'Read first steps',
    },
    {
      id: 'economy',
      title: 'Learn how money and shops work',
      body: hasEconomy ? 'You have seen the economy card.' : 'Good before you start buying, selling, running a shop, or chasing money.',
      status: stepStatus(hasEconomy, signedIn && hasFirstSteps),
      href: '#shops-and-economy',
      action: 'Read economy basics',
    },
    {
      id: 'properties',
      title: 'Figure out properties and saved layouts',
      body: hasProperties ? 'You have seen the property card.' : 'Useful before decorating, saving a layout, or turning a space into a hangout.',
      status: stepStatus(hasProperties, signedIn && hasFirstSteps && hasEconomy),
      href: '#properties-and-layouts',
      action: 'Read property basics',
    },
    {
      id: 'extra',
      title: 'Save role guides for when they matter',
      body: hasAnyRoleGuide ? 'You have opened at least one role-specific card.' : 'Police, mayor, and leadership cards are there when you actually need them.',
      status: corePercent === 100 ? (hasAnyRoleGuide ? 'done' : 'next') : 'todo',
      href: roleGuides[0] ? `#${slugFromTitle(roleGuides[0].title)}` : '#guide-catalog',
      action: 'Browse role cards',
    },
  ];

  return (
    <main className="page-shell guides-hub-page">
      <section className="guides-hero">
        <div className="guides-hero-copy">
          <span className="guides-kicker">Northline Player Guide</span>
          <h1>A simple guide for getting started.</h1>
          <p>
            Whether you are new or returning, this page covers the basics, useful links, and what to do first.
          </p>
          <div className="guides-hero-actions">
            <a className="button button-primary" href="#first-night">Start with your first night</a>
            {rulesVisible ? <Link className="button button-soft" href="/rules">Quick rules pass</Link> : null}
            {tweeterVisible ? <Link className="button button-ghost" href="/tweeter">Open Tweeter</Link> : null}
          </div>
        </div>
        <aside className="guides-progress-card">
          <span>Guide progress</span>
          <strong>{progress ? `${percent}%` : 'Sign in'}</strong>
          <p>{progress ? `${completed}/${total} in-game guide cards seen.` : 'Connect Steam to track which in-game guide cards you have already seen.'}</p>
          <div className="guides-progress-bar" aria-hidden="true"><i style={{ width: `${progress ? percent : 12}%` }} /></div>
        </aside>
      </section>

      <section className="guides-quickbar" aria-label="Useful links">
        <Link href="/dashboard"><strong>Dashboard</strong><span>Your character, settings, and profile.</span></Link>
        {playersVisible ? <Link href="/players"><strong>Players</strong><span>Public profiles from people who opted in.</span></Link> : null}
        {statusVisible ? <Link href="/status"><strong>Status</strong><span>Check the server before blaming your router.</span></Link> : null}
        {supportVisible ? <Link href="/support"><strong>Support</strong><span>When something actually needs a hand.</span></Link> : null}
      </section>

      <section className="guide-journey-panel" aria-label="Your onboarding progress">
        <div className="guide-journey-header">
          <div>
            <span className="guides-kicker">Your next step</span>
            <h2>{nextStep.title}</h2>
            <p>{nextStep.body}</p>
          </div>
          <a className="button button-primary" href={nextStep.href}>{nextStep.label}</a>
        </div>
        <div className="guide-journey-meter">
          <div>
            <strong>{signedIn ? `${corePercent}%` : 'Sign in'}</strong>
            <span>{signedIn ? `${coreSeen.length}/${coreGuides.length} starter cards seen` : 'Track your own starter progress'}</span>
          </div>
          <div className="guides-progress-bar" aria-hidden="true"><i style={{ width: `${signedIn ? Math.max(corePercent, 8) : 12}%` }} /></div>
        </div>
        <div className="guide-journey-steps">
          {journeySteps.map((step, index) => (
            <article className={`guide-journey-step ${step.status}`} key={step.id}>
              <span className="guide-step-number">{step.status === 'done' ? '✓' : index + 1}</span>
              <div>
                <small>{step.status === 'done' ? 'Done' : step.status === 'next' ? 'Next up' : 'Later'}</small>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                {step.status !== 'todo' ? <a href={step.href}>{step.action}</a> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="guides-section-heading">
        <span className="guides-kicker">Start here</span>
        <h2>What are you trying to do?</h2>
        <p>Choose the card that sounds closest to your night. No pressure, no homework, just a few pointers.</p>
      </section>

      <section className="guide-path-grid">
        {paths.map((path) => (
          <a className="guide-path-card" href={`#${path.id}`} key={path.id}>
            <span className="guide-path-icon">{path.icon}</span>
            <h3>{path.title}</h3>
            <p>{path.summary}</p>
            <ul>{path.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
          </a>
        ))}
      </section>

      <section className="guides-layout">
        <div className="guides-main-column">
          <section className="guides-section-heading compact">
            <span className="guides-kicker">Guidebook</span>
            <h2>A few things worth knowing</h2>
          </section>

          {guideSections.map((section, index) => (
            <details className="guide-accordion" id={section.id} key={section.id} open={index === 0}>
              <summary>
                <span>{section.tag}</span>
                <strong>{section.title}</strong>
              </summary>
              <p>{section.summary}</p>
              <ol>
                {section.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </details>
          ))}
        </div>

        <aside className="guides-side-column">
          <article className="guides-card">
            <span className="guides-kicker">Quick answers</span>
            <div className="guide-faq-list">
              {quickAnswers.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </article>

          <article className="guides-card guides-tip-card">
            <span className="guides-kicker">Community note</span>
            <h3>Make something people can join in on.</h3>
            <p>People remember the regulars, the shop owners, the odd jobs, the weird rumors, and the small moments that turn into a whole night of fun.</p>
          </article>
        </aside>
      </section>

      <section className="guides-section-heading">
        <span className="guides-kicker">Do / Don’t</span>
        <h2>Small choices that make the server better</h2>
      </section>

      <section className="guide-do-dont-grid">
        {doDont.map((item) => (
          <article className="guide-do-dont-card" key={item.do}>
            <div><span>Do</span><strong>{item.do}</strong></div>
            <div><span>Don’t</span><strong>{item.dont}</strong></div>
          </article>
        ))}
      </section>

      {GUIDE_CATALOG.length ? (
        <section className="guides-section-heading">
          <span className="guides-kicker">Server guide cards</span>
          <h2>Extra notes from the server</h2>
          <p>These are mirrored from the in-game guide catalog. Sign in to see which ones your account has already come across.</p>
        </section>
      ) : null}

      <section className="guide-catalog-grid" id="guide-catalog">
        {GUIDE_CATALOG.map((guide) => {
          const seen = progress?.seen.includes(guide.id) ?? false;
          const anchor = slugFromTitle(guide.title);
          return (
            <article className="guide-catalog-card" id={anchor} key={guide.id}>
              <span className={seen ? 'seen' : ''}>{seen ? 'Seen in-game' : guide.category}</span>
              <h3>{guide.title}</h3>
              <p>{guide.body}</p>
            </article>
          );
        })}
      </section>

      <section className="guides-final-card">
        <div>
          <span className="guides-kicker">Still lost?</span>
          <h2>That is normal. Ask around.</h2>
          <p>Check Tweeter, read the quick rules, ask someone in-game, or open support if something is actually broken. Most of the fun comes from figuring things out with other people.</p>
        </div>
        <div className="guides-hero-actions">
          {tweeterVisible ? <Link className="button button-primary" href="/tweeter">See what people are saying</Link> : null}
          {supportVisible ? <Link className="button button-soft" href="/support">Get support</Link> : null}
        </div>
      </section>
    </main>
  );
}
