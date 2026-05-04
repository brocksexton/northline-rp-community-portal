import Link from 'next/link';
import { GUIDE_CATALOG, getGuideProgress } from '@/lib/ape-data';
import { getSessionSteamId } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Guides | Northline RP' };

const paths = [
  {
    id: 'first-night',
    icon: '🌙',
    title: 'I just spawned in',
    summary: 'A calm route through your first session without accidentally becoming city folklore.',
    bullets: ['Read the five-minute rules pass', 'Learn where to get food and water', 'Talk before you swing'],
  },
  {
    id: 'money',
    icon: '💸',
    title: 'I need money',
    summary: 'Find a legal-ish path, a social path, or a “please do not rob everyone immediately” path.',
    bullets: ['Use jobs to meet people', 'Ask about player businesses', 'Spend like rent is real'],
  },
  {
    id: 'roleplay',
    icon: '🎭',
    title: 'I want better RP',
    summary: 'Small choices that make scenes more fun for everyone involved.',
    bullets: ['Leave room for replies', 'Lose gracefully sometimes', 'Build motives, not just wins'],
  },
  {
    id: 'property',
    icon: '🏠',
    title: 'I want a place',
    summary: 'Turn a blank room into a hangout, shop, office, hideout, or questionable garage.',
    bullets: ['Start small', 'Make it useful to others', 'Save layouts carefully'],
  },
  {
    id: 'trouble',
    icon: '🚨',
    title: 'I got into trouble',
    summary: 'What to do when a scene goes sideways, staff gets involved, or somebody is very loud.',
    bullets: ['Stay calm', 'Keep evidence', 'Use reports for real issues'],
  },
  {
    id: 'identity',
    icon: '🪪',
    title: 'I want to be known',
    summary: 'Use Tweeter, profiles, and in-game reputation to become a familiar citizen.',
    bullets: ['Claim your profile', 'Post from in-game Tweeter', 'Make your character memorable'],
  },
];

const quickAnswers = [
  { q: 'Where do I start?', a: 'Join the server, stay alive, introduce yourself, and avoid making your first sentence a felony.' },
  { q: 'Do I need a public profile?', a: 'No. Profiles are opt-in. If you want to appear in the citizen directory, make your profile public from the dashboard.' },
  { q: 'Can I post to Tweeter from the website?', a: 'Not yet. Post from inside the game for now so the website does not fight the live server data.' },
  { q: 'What should I do when RP feels bad?', a: 'Step back, gather context, and use reports only when something actually needs staff attention.' },
];

const guideSections = [
  {
    id: 'first-night',
    title: 'First 15 minutes in Northline',
    tag: 'Start here',
    summary: 'You do not need to master the whole city on day one. You need food, water, a reason to talk, and enough patience not to sprint into chaos.',
    steps: [
      'Check the rules page before your first serious scene.',
      'Find basic food and water so survival systems do not become your first antagonist.',
      'Introduce yourself to another player with a small goal: work, directions, gossip, or a favor.',
      'Avoid major crime until you understand how conflict, police, staff, and consequences work here.',
      'Open Tweeter in-game and see what the city is talking about.',
    ],
  },
  {
    id: 'roleplay',
    title: 'Better scenes, fewer headaches',
    tag: 'Roleplay',
    summary: 'Good RP is not about always winning. It is about giving the other person something worth responding to.',
    steps: [
      'Make your character want something specific before starting a scene.',
      'Use dialogue, threats, bargaining, mistakes, fear, and pride before jumping to violence.',
      'Let scenes breathe. A pause can be more interesting than a sprint to the next mechanic.',
      'Take losses when they make sense. People remember fair players more than unstoppable ones.',
      'Keep out-of-character frustration out of in-character choices.',
    ],
  },
  {
    id: 'money',
    title: 'Making money without becoming a spreadsheet goblin',
    tag: 'Economy',
    summary: 'Money is useful, but money that creates stories is better. The best income routes usually involve other citizens.',
    steps: [
      'Start with safe work until you understand the city rhythm.',
      'Ask around for player-run jobs, shops, delivery work, protection, repairs, or odd favors.',
      'Treat criminal money as a story choice, not just a faster wallet number.',
      'Do not dump every dollar into one plan unless you are prepared for that plan to become content.',
      'Use your profile showcase only if you actually want people seeing your public economy stats.',
    ],
  },
  {
    id: 'property',
    title: 'Properties, builds, and hangouts',
    tag: 'World building',
    summary: 'A useful space gives people a reason to visit. A perfect space nobody uses is just expensive wallpaper.',
    steps: [
      'Pick a simple purpose: store, apartment, club, clinic, office, workshop, or meeting spot.',
      'Make the entrance and interaction points obvious so people know how to use the space.',
      'Use props to support RP, not bury it under clutter.',
      'Save layouts when you are happy with them and avoid relying on unsaved changes.',
      'Invite people in. A business without customers is just a locked room with confidence.',
    ],
  },
  {
    id: 'trouble',
    title: 'Reports, staff, and when things get weird',
    tag: 'Safety',
    summary: 'Most problems are solved by slowing down. Real rule issues need clear context, not a dramatic novel in all caps.',
    steps: [
      'Separate “I lost” from “a rule was broken.” They are not always the same thing.',
      'Collect names, time, clips, screenshots, and a short explanation.',
      'Do not harass the other player while waiting for staff.',
      'Use appeals and tickets with calm details. Staff can work faster when the report is readable.',
      'If staff makes a call, move forward unless there is a real reason to escalate.',
    ],
  },
  {
    id: 'identity',
    title: 'Profiles, Tweeter, and being part of the city',
    tag: 'Community',
    summary: 'The website works best when it extends your in-game identity instead of replacing it.',
    steps: [
      'Claim your profile from the dashboard if you want to appear publicly.',
      'Choose what gameplay details, if any, you want to show publicly.',
      'Use Tweeter for rumors, jokes, business posts, beef, apologies, and terrible decisions.',
      'Keep private profiles private. Not every save file needs to become a billboard.',
      'Make a character people can describe in one sentence. That is when the city starts remembering you.',
    ],
  },
];

const doDont = [
  { do: 'Give people a clear hook.', dont: 'Walk up silently, demand a perfect scene, then leave.' },
  { do: 'Let consequences create new stories.', dont: 'Treat every setback like a support ticket.' },
  { do: 'Ask questions in character when possible.', dont: 'Turn every mystery into Discord detective work.' },
  { do: 'Use the website to plan your next move.', dont: 'Expect the website to replace playing the game.' },
];

function slugFromTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default async function GuidesPage() {
  const steamId = await getSessionSteamId();
  const progress = steamId ? await getGuideProgress(steamId) : null;
  const completed = progress?.completed ?? 0;
  const total = progress?.total ?? GUIDE_CATALOG.length;
  const percent = progress?.percent ?? 0;

  return (
    <main className="page-shell guides-hub-page">
      <section className="guides-hero">
        <div className="guides-hero-copy">
          <span className="guides-kicker">Northline Field Guide</span>
          <h1>Learn the city without reading a government pamphlet.</h1>
          <p>
            A practical handbook for surviving your first night, finding things to do, making better scenes,
            and becoming somebody people actually recognize around Northline.
          </p>
          <div className="guides-hero-actions">
            <a className="button button-primary" href="#first-night">Start with first night</a>
            <Link className="button button-soft" href="/rules">Five-minute rules pass</Link>
            <Link className="button button-ghost" href="/tweeter">Open Tweeter</Link>
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
        <Link href="/players"><strong>Citizens</strong><span>Public profiles from people who opted in.</span></Link>
        <Link href="/status"><strong>Status</strong><span>Check the city before blaming your router.</span></Link>
        <Link href="/support"><strong>Support</strong><span>When the weird thing is actually a problem.</span></Link>
      </section>

      <section className="guides-section-heading">
        <span className="guides-kicker">Pick your problem</span>
        <h2>What are you trying to do?</h2>
        <p>Choose the card that sounds closest to your current situation. No judgment, unless you clicked “I need money” after buying three cars.</p>
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
            <span className="guides-kicker">Handbook</span>
            <h2>City systems, explained like a human wrote them</h2>
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
            <span className="guides-kicker">Tiny wisdom</span>
            <h3>Be interesting before being dangerous.</h3>
            <p>People remember the messy regulars, the funny shop owners, the reliable doctors, and the suspicious guy with a plan. “Guy who shoots instantly” has a shorter shelf life.</p>
          </article>
        </aside>
      </section>

      <section className="guides-section-heading">
        <span className="guides-kicker">Do / Don’t</span>
        <h2>Small choices that make the whole city better</h2>
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
          <span className="guides-kicker">In-game guide cards</span>
          <h2>What the server can already teach you</h2>
          <p>These are mirrored from the game-side guide catalog. Sign in to see which ones your account has already encountered.</p>
        </section>
      ) : null}

      <section className="guide-catalog-grid">
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
          <h2>Good. That means the city has room for you.</h2>
          <p>Ask around in-character, check Tweeter, read the rules, or open support if something is actually broken. The best guide is usually another player with a questionable amount of free time.</p>
        </div>
        <div className="guides-hero-actions">
          <Link className="button button-primary" href="/tweeter">See city chatter</Link>
          <Link className="button button-soft" href="/support">Get support</Link>
        </div>
      </section>
    </main>
  );
}
