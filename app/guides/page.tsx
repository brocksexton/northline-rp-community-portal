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
    description: 'Interactive Northline RP player guides for first steps, phone apps, jobs, money, property, roleplay, and getting help.',
    path: '/guides',
  });
}

const paths = [
  {
    id: 'first-night',
    icon: '🌙',
    title: 'I just joined',
    summary: 'A quick route through your first session without needing to memorize the whole server.',
    bullets: ['Press P and look through your phone', 'Check the rules before messy RP', 'Say hi and follow the action'],
  },
  {
    id: 'phone',
    icon: '📱',
    title: 'How do I use my phone?',
    summary: 'Your phone is the main hub for jobs, laws, property, banking, 911, Tweeter, and more.',
    bullets: ['Press P', 'Use apps in-character', 'Check Government and Job Finder early'],
  },
  {
    id: 'jobs',
    icon: '💼',
    title: 'What jobs exist?',
    summary: 'Medic, police, mayor, courier, citizen, and store-owner roles all create different scenes.',
    bullets: ['Use Job Finder', 'Follow waypoints', 'Salary may not tell the whole story'],
  },
  {
    id: 'money',
    icon: '💸',
    title: 'I need money',
    summary: 'Start with simple work, recycling, deliveries, shop RP, or player-made opportunities.',
    bullets: ['Recycle garbage for cash', 'Check jobs and businesses', 'Use ATMs for deposits'],
  },
  {
    id: 'property',
    icon: '🏠',
    title: 'I want a place',
    summary: 'Properties and saved layouts let you build apartments, shops, offices, hangouts, and more.',
    bullets: ['Use the Properties app', 'Save layouts carefully', 'Build for scenes, not clutter'],
  },
  {
    id: 'trouble',
    icon: '🚨',
    title: 'Something went wrong',
    summary: 'Use 911 for in-character emergencies and support/staff reports for actual problems.',
    bullets: ['Keep details clear', 'Do not turn every issue OOC', 'Use staff when needed'],
  },
];

const phoneApps = [
  { name: 'Advertisement', use: 'Post business ads, events, and reasons for people to visit you.' },
  { name: 'Properties', use: 'Manage property, saved layouts, and spaces you build or use.' },
  { name: 'Government', use: 'Check the current tax rate, laws, and illegal items.' },
  { name: 'Elections', use: 'Follow and participate in mayor elections when available.' },
  { name: 'Job Finder', use: 'See jobs, salary, and a waypoint button. Some jobs can still pay through tasks even if salary shows $0.' },
  { name: 'Bank', use: 'View your bank balance. To deposit cash, visit an ATM around the map.' },
  { name: '911 Report', use: 'Report robbery, assault/fight, suspicious activity, property damage, or other urgent issues. Include details.' },
  { name: 'Tweeter', use: 'Use the in-game social app for posts, rumors, business chatter, jokes, and public RP.' },
  { name: 'Text Messages', use: 'Send in-character texts for plans, deals, warnings, and private conversations.' },
  { name: 'Games', use: 'Take a break with Tappy Bird or Snake when the city is quiet.' },
];

const jobGroups = [
  {
    label: 'Real jobs',
    jobs: ['Medic', 'Police Officer', 'Chief of Police', 'Mayor', 'Courier'],
    note: 'These tend to create direct public-facing scenes. Treat them like responsibilities, not just buttons.',
  },
  {
    label: 'Citizen jobs',
    jobs: ['Citizen', 'Grocery Store Owner', 'Gun Store Owner', 'Hardware Store Owner'],
    note: 'These are great for businesses, errands, social RP, and building a reputation around the map.',
  },
];

const walkthroughs = [
  {
    id: 'first-night',
    title: 'First night checklist',
    tag: '5 steps',
    steps: [
      'Join the server and take a minute to look around before rushing into crime or police scenes.',
      'Press P to open your phone. Check Government, Job Finder, Bank, and Tweeter first.',
      'Find a reason to speak to someone: ask directions, ask about work, buy something, or react to a Tweeter post.',
      'Try a small task like courier work, recycling garbage, or visiting a player business.',
      'Before logging off, remember what your character did so you can build on it next time.',
    ],
  },
  {
    id: 'phone',
    title: 'Using the phone without getting lost',
    tag: 'Press P',
    steps: [
      'Press P in-game to open your phone.',
      'Use Government to check laws, taxes, and illegal items before doing something risky.',
      'Use Job Finder to see available jobs, waypoint buttons, and listed salary.',
      'Use Bank to view your balance. Deposit cash at an ATM, not from the app.',
      'Use 911 Report only for real in-character emergencies and include useful details.',
    ],
  },
  {
    id: 'jobs',
    title: 'Picking a job',
    tag: 'Work',
    steps: [
      'Open Job Finder on your phone and look at what is available.',
      'Use the waypoint button if you are unsure where to go.',
      'Do not panic if salary says $0. Some jobs pay through tasks, sales, or roleplay opportunities.',
      'Choose a role that matches the kind of night you want: public service, business, courier work, or citizen RP.',
      'If the job gives you authority, use it to create scenes instead of shutting scenes down instantly.',
    ],
  },
  {
    id: 'money',
    title: 'Early money routes',
    tag: 'Cash',
    steps: [
      'Recycle garbage for cash if you want a simple, useful starting activity.',
      'Use litter bins when you just want to clean up the map. Bins do not pay, but the city looks better.',
      'Try courier work or ask businesses if they need help.',
      'Visit an ATM when you want to deposit cash into your bank account.',
      'Avoid bugged money, dupes, and exploit routes. Report anything that feels obviously broken.',
    ],
  },
  {
    id: 'property',
    title: 'Property and saved layouts',
    tag: 'Build',
    steps: [
      'Open the Properties app to manage owned or available property options.',
      'Pick a purpose before decorating: apartment, store, office, clinic, workshop, club, or hideout.',
      'Keep entrances and interaction spots readable so other players know how to use the space.',
      'Save layouts when you are happy with them. Do not rely on unsaved changes.',
      'Use your space publicly. A shop or hangout only works when people know it exists.',
    ],
  },
  {
    id: 'trouble',
    title: 'Getting help the right way',
    tag: 'Support',
    steps: [
      'For in-character emergencies, use 911 Report and include what happened, where, and who is involved.',
      'For bugs, rule issues, appeals, or website problems, use support or contact staff through the proper channel.',
      'Write reports in plain language. Names, time, screenshots, clips, and short summaries help the most.',
      'Do not spam OOC chat or harass the other player while waiting.',
      'Once staff makes a call, move on unless there is a real reason to follow up.',
    ],
  },
];

const quickAnswers = [
  { q: 'What kind of RP is Northline?', a: 'Semi-serious. The city should feel believable, but it is still a community game server. Good scenes matter more than perfect realism.' },
  { q: 'How do I open my phone?', a: 'Press P in-game. The phone has apps for jobs, laws, properties, banking, 911, Tweeter, text messages, and games.' },
  { q: 'Why does Job Finder show $0 salary?', a: 'Some jobs may display $0 but still have tasks, player interaction, sales, or other ways to earn money.' },
  { q: 'How do I deposit cash?', a: 'Use an ATM. The Bank app lets you view your balance, but cash deposits happen at ATMs around the map.' },
  { q: 'How do I make quick money without crime?', a: 'Pick up garbage and bring it to recycling containers for cash, try courier work, or ask player businesses if they need help.' },
  { q: 'Can I post to Tweeter from the website?', a: 'Website Tweeter exists for viewing and profile-style interaction, but the safest source of truth is still the in-game Tweeter app.' },
];

const doDont = [
  { do: 'Use the phone apps to create scenes.', dont: 'Treat every app like an OOC admin menu.' },
  { do: 'Ask questions in-character when possible.', dont: 'Stop every scene to ask OOC unless you need to.' },
  { do: 'Recycle garbage for cash and cleanup.', dont: 'Use trash to block doors or annoy people.' },
  { do: 'Use 911 for actual in-character reports.', dont: 'Spam fake emergency reports for attention.' },
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
    ? { title: 'Sign in with Steam', body: 'Connect your account so this page can show your guide progress instead of only general help.', href: '/api/auth/steam?returnTo=/guides', label: 'Sign in with Steam' }
    : nextCoreGuide
      ? { title: `Open “${nextCoreGuide.title}”`, body: 'This is the next basics card to check off. Read the short version here, then look for it in-game.', href: `#${slugFromTitle(nextCoreGuide.title)}`, label: 'Jump to the guide card' }
      : nextMissingGuide
        ? { title: 'You are through the basics', body: 'The remaining cards are role-specific or extra. Open them when they match what you are doing in-game.', href: `#${slugFromTitle(nextMissingGuide.title)}`, label: 'See next extra card' }
        : { title: 'You are caught up', body: 'You have seen every mirrored guide card. Go make a shop, clean the streets, run for mayor, or see what people are doing.', href: tweeterVisible ? '/tweeter' : '/dashboard', label: tweeterVisible ? 'Check Tweeter' : 'Open dashboard' };

  const journeySteps = [
    { id: 'sign-in', title: 'Connect your account', body: signedIn ? 'You are signed in, so progress tracking is active.' : 'Sign in with Steam to track which guide cards you have seen.', status: signedIn ? 'done' : 'next', href: signedIn ? '/dashboard' : '/api/auth/steam?returnTo=/guides', action: signedIn ? 'Open dashboard' : 'Sign in' },
    { id: 'first-steps', title: 'Learn the first-night loop', body: hasFirstSteps ? 'You have seen the first steps card.' : 'Start here if you are new or returning.', status: stepStatus(hasFirstSteps, signedIn), href: '#first-night', action: 'Read first steps' },
    { id: 'phone', title: 'Understand the phone', body: hasEconomy ? 'You have seen the economy/shop basics.' : 'The phone is where jobs, laws, banking, 911, and property start.', status: stepStatus(hasEconomy, signedIn && hasFirstSteps), href: '#phone', action: 'Open phone guide' },
    { id: 'properties', title: 'Use property carefully', body: hasProperties ? 'You have seen the property card.' : 'Useful before buying, decorating, or saving layouts.', status: stepStatus(hasProperties, signedIn && hasFirstSteps && hasEconomy), href: '#property', action: 'Read property basics' },
    { id: 'role-guides', title: 'Use role cards when needed', body: hasAnyRoleGuide ? 'You have opened at least one role-specific guide.' : 'Police, mayor, and leadership info matters most when you take those roles.', status: corePercent === 100 ? (hasAnyRoleGuide ? 'done' : 'next') : 'todo', href: '#jobs', action: 'Browse role help' },
  ];

  return (
    <main className="page-shell guides-hub-page guides-overhaul-page">
      <section className="guides-hero guides-field-hero">
        <div className="guides-hero-copy">
          <span className="guides-kicker">Northline field guide</span>
          <h1>Get settled without reading a manual.</h1>
          <p>
            Press <strong>P</strong> for your phone, pick a job, make some money, clean up the map, start a business, call 911 when something is happening, or just find people and make a scene worth remembering.
          </p>
          <div className="guides-hero-actions">
            <a className="button button-primary" href="#first-night">First night checklist</a>
            <a className="button button-soft" href="#phone-apps">Phone apps</a>
            {rulesVisible ? <Link className="button button-ghost" href="/rules">Rules quick pass</Link> : null}
          </div>
        </div>
        <aside className="guides-progress-card">
          <span>Guide progress</span>
          <strong>{progress ? `${percent}%` : 'Start'}</strong>
          <p>{progress ? `${completed}/${total} in-game guide cards seen.` : 'Sign in with Steam to track which in-game guide cards you have already seen.'}</p>
          <div className="guides-progress-bar" aria-hidden="true"><i style={{ width: `${progress ? percent : 12}%` }} /></div>
        </aside>
      </section>

      <section className="guides-quickbar" aria-label="Useful links">
        <Link href="/dashboard"><strong>Dashboard</strong><span>Profile, character, privacy, and account tools.</span></Link>
        {statusVisible ? <Link href="/status"><strong>Status</strong><span>Check live server status before joining.</span></Link> : null}
        {playersVisible ? <Link href="/players"><strong>Players</strong><span>Public profiles from people who opted in.</span></Link> : null}
        {supportVisible ? <Link href="/support"><strong>Support</strong><span>Bugs, account help, and staff contact.</span></Link> : null}
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
            <span>{signedIn ? `${coreSeen.length}/${coreGuides.length} starter cards seen` : 'Track starter progress'}</span>
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
        <span className="guides-kicker">Choose your route</span>
        <h2>What are you trying to do tonight?</h2>
        <p>Pick the card that sounds closest. Each one jumps to a focused mini-guide.</p>
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

      <section className="guides-section-heading" id="phone-apps">
        <span className="guides-kicker">Phone apps</span>
        <h2>Your phone is the city menu.</h2>
        <p>Press <strong>P</strong> in-game. Most useful systems start there.</p>
      </section>

      <section className="phone-app-grid">
        {phoneApps.map((app) => (
          <article key={app.name}>
            <span>{app.name}</span>
            <p>{app.use}</p>
          </article>
        ))}
      </section>

      <section className="guides-section-heading" id="jobs-overview">
        <span className="guides-kicker">Jobs</span>
        <h2>Current available jobs.</h2>
        <p>Use the Job Finder phone app for jobs, waypoints, and salary info. A $0 salary can still mean there are tasks, shop sales, or RP ways to earn.</p>
      </section>

      <section className="job-board-grid">
        {jobGroups.map((group) => (
          <article key={group.label}>
            <span>{group.label}</span>
            <div>{group.jobs.map((job) => <strong key={job}>{job}</strong>)}</div>
            <p>{group.note}</p>
          </article>
        ))}
      </section>

      <section className="guides-section-heading">
        <span className="guides-kicker">Step-by-step</span>
        <h2>Interactive walkthroughs.</h2>
        <p>These are built as simple steps now, and the layout is ready for images or slide-by-slide screenshots later.</p>
      </section>

      <section className="guide-walkthrough-grid">
        {walkthroughs.map((walkthrough, index) => (
          <details className="guide-walkthrough" id={walkthrough.id} key={walkthrough.id} open={index === 0}>
            <summary>
              <span>{walkthrough.tag}</span>
              <strong>{walkthrough.title}</strong>
              <small>Open guide</small>
            </summary>
            <div className="guide-step-slide-list">
              {walkthrough.steps.map((step, stepIndex) => (
                <article key={step}>
                  <span>{stepIndex + 1}</span>
                  <p>{step}</p>
                </article>
              ))}
            </div>
            <div className="guide-image-placeholder" aria-label="Future image or slide placeholder">
              <strong>Future visual guide slot</strong>
              <span>Add screenshots or step-by-step slides here later.</span>
            </div>
          </details>
        ))}
      </section>

      <section className="guides-layout">
        <div className="guides-main-column">
          <section className="guides-section-heading compact">
            <span className="guides-kicker">Quick answers</span>
            <h2>Things players ask early.</h2>
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
            <span className="guides-kicker">Community note</span>
            <h3>Make something people can join in on.</h3>
            <p>A shop, cleanup run, police report, courier job, election campaign, Tweeter argument, or weird conversation can turn into a whole night if you leave room for other people.</p>
          </article>
        </aside>
      </section>

      <section className="guides-section-heading">
        <span className="guides-kicker">Do / Don’t</span>
        <h2>Small choices that make the server better.</h2>
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
          <h2>Extra notes from the server.</h2>
          <p>These are mirrored from the in-game guide catalog. Sign in to see which cards your account has already come across.</p>
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
