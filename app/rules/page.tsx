import Link from 'next/link';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { notFound } from 'next/navigation';
import { enabledFeatureIds, getSiteFeatureSettings, isSiteFeatureEnabled } from '@/lib/site-features-data';
import inGameRules from '@/config/server-rules.json';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Rules',
    description: 'Northline RP rules and community expectations for semi-serious roleplay, jobs, conduct, reports, and server safety.',
    path: '/rules',
  });
}

const quickStart = [
  { label: 'Play the scene', body: 'Northline is semi-serious RP. Have fun, be a little messy, but give people a real scene to respond to.' },
  { label: 'Use character knowledge', body: 'Discord, streams, website pages, screenshots, and OOC chat are not things your character magically knows.' },
  { label: 'Escalate with a reason', body: 'Arguments, threats, arrests, warrants, robberies, ATM theft, and violence should come from something that actually happened in-character.' },
  { label: 'Keep it community-friendly', body: 'No harassment, slurs, targeted toxicity, exploit abuse, or turning every loss into an OOC fight.' },
];

const rulebook = [
  {
    title: 'Semi-serious roleplay',
    mood: 'We want believable scenes, not paperwork roleplay.',
    points: [
      'Stay in character when a scene is active. Quick OOC clarification is fine; using OOC to win the scene is not.',
      'Your character can be funny, weird, petty, nervous, proud, corrupt, broke, or unlucky. Just make it playable for the people around you.',
      'Do not force outcomes. Give the other player room to respond, run, bargain, panic, lie, or make a mistake.',
      'A small realistic loss is better than a big empty win. Play consequences when they make sense.',
    ],
  },
  {
    title: 'Conflict and crime',
    mood: 'Trouble is allowed. Random grief is not.',
    points: [
      'Violence needs a reason. “I was bored” is not enough reason to rob, kidnap, or kill someone.',
      'Build scenes before they explode. Words, threats, scams, bad deals, rivalries, and warnings make conflict better.',
      'Value your life. If someone has clear control of a situation, act like your character wants to survive it.',
      'Do not combat log, avoid consequences by disconnecting, or come back instantly for revenge after a scene ends badly.',
    ],
  },
  {
    title: 'Jobs and public roles',
    mood: 'Jobs are RP hooks first, money buttons second.',
    points: [
      'Available jobs currently include Medic, Police Officer, Chief of Police, Mayor, and Courier.',
      'Available citizen jobs currently include Citizen, Grocery Store Owner, Gun Store Owner, and Hardware Store Owner.',
      'Police, Chief of Police, Mayor, Medic, Courier, and store-owner roles should stay active. The game may remove AFK or inactive job holders.',
      'If a salary shows as $0 in the phone Job Finder, that does not always mean the job is useless. Some jobs make money through tasks, sales, or RP opportunities.',
    ],
  },
  {
    title: 'Police, government, and 911',
    mood: 'Public systems should create scenes, not shut them down.',
    points: [
      'Police should investigate, talk, warn, arrest, and use force in ways that fit the situation. The goal is good RP, not farming charges.',
      'Police need an active warrant to raid a property unless server mechanics clearly allow otherwise. Door breaches should not be used to bypass warrant rules.',
      'Criminals should give police something to work with when possible. Running, hiding, ATM robbery, and lockpicking are fine when they create a playable scene.',
      'Use the 911 Report app for real in-character reports like robberies, assaults, suspicious activity, property damage, or other urgent issues.',
      'Do not spam 911, make fake reports just to annoy people, or use emergency systems as an OOC complaint box.',
    ],
  },
  {
    title: 'Mayor, laws, and city policy',
    mood: 'Public office should make the city more interesting, not unplayable.',
    points: [
      'The Mayor may set custom laws, tax rate, contraband, and illegal buildables within server limits.',
      'Players are expected to check the Government app for active laws, taxes, and illegal items instead of guessing.',
      'Mayor rules should be playable. Using office to grief the server, protect only friends, or make every normal action illegal may be handled by staff.',
      'If the Mayor dies, the title and active policies can reset. Treat political conflict as RP, but do not use it as an excuse for random violence.',
    ],
  },
  {
    title: 'Businesses and property',
    mood: 'Shops and builds should make the city feel alive.',
    points: [
      'Business owners should use advertisements, signs, Tweeter, and actual interaction to bring players in.',
      'Gun Store, Grocery Store, and Hardware Store owners are expected to treat their shop like a roleplay space, not just a menu.',
      'Property layouts should support scenes. Do not intentionally build spaces meant to trap, lag, exploit, or block normal play.',
      'Illegal items, illegal buildables, and contraband can lead to police action. Red inventory outlines and mayor-marked illegal buildables are your risk.',
      'Use the phone Properties app to manage property and saved layouts. Save carefully before making major changes.',
    ],
  },
  {
    title: 'Economy, cleanup, and exploits',
    mood: 'Money should not come from breaking the server.',
    points: [
      'Picking up garbage and bringing it to recycling containers earns cash and helps clean up the map.',
      'Throwing trash into litter bins does not pay, but it still helps the city look better. Sometimes that is enough.',
      'Do not duplicate items, abuse loopholes, automate rewards, exploit jobs, ATM robbery payouts, shop systems, crates, or buildable mechanics.',
      'Report serious bugs privately. If a bug gives you money, items, or power, stop using it immediately.',
    ],
  },
  {
    title: 'Respect and community conduct',
    mood: 'The character can be rough. The player behind them still matters.',
    points: [
      'No slurs, hate speech, harassment, creepy behavior, doxxing, threats, or personal attacks.',
      'Do not drag IC conflict into Discord, DMs, tickets, or public OOC arguments.',
      'If a scene gets uncomfortable or confusing, pause and clarify. Getting staff is better than letting a bad scene get worse.',
      'Staff may step in, end scenes, remove props, issue warnings, or take action when something is hurting the server.',
    ],
  },
];

const scenarios = [
  {
    setup: 'You see a police chase because someone posted about it in Discord.',
    bad: 'Use the Discord message to set up an ambush in-game.',
    good: 'Only react if your character actually sees, hears, or is told about it in-character.',
    lesson: 'Outside information stays outside. That keeps scenes fair.',
  },
  {
    setup: 'A shop owner refuses to sell to you after an argument.',
    bad: 'Shoot them immediately because you were annoyed.',
    good: 'Start a rivalry, threaten a boycott, spread rumors, plan a robbery, or come back with friends later.',
    lesson: 'Escalation gives everyone more to play than instant violence.',
  },
  {
    setup: 'You use Job Finder and a job salary says $0.',
    bad: 'Assume the job is broken and complain in OOC chat.',
    good: 'Try the waypoint, check what the job actually does, or ask someone in-character.',
    lesson: 'Some work pays through tasks, sales, or RP instead of a simple salary number.',
  },
  {
    setup: 'You find garbage around the map.',
    bad: 'Drag it into doorways or use it to annoy people.',
    good: 'Recycle it for cash, toss it in a litter bin, or use it as a small RP excuse to talk to someone.',
    lesson: 'Even small systems can create scenes if you treat them like part of the world.',
  },
  {
    setup: 'Someone breaks a rule during your scene.',
    bad: 'Stop roleplaying and start yelling at them in public chat.',
    good: 'Pause if needed, gather names/time/clips, and make a clear report afterward.',
    lesson: 'Reports work better when they are readable and calm.',
  },
];

const phoneExpectations = [
  { app: 'Government', body: 'Use it to check taxes, laws, illegal items, and illegal buildables. Do not claim you did not know after ignoring the app.' },
  { app: '911 Report', body: 'Use it for in-character emergencies. Include details so police/medics have something useful.' },
  { app: 'Advertisement', body: 'Good for real business posts and events. Do not spam the city with junk ads.' },
  { app: 'Tweeter', body: 'Rumors, jokes, business posts, beef, apologies, and events are welcome. Keep OOC fights off it.' },
  { app: 'Text Messages', body: 'Use messages for in-character plans. Do not use them to harass players.' },
  { app: 'Properties', body: 'Manage property and saved layouts responsibly. Avoid exploit builds or intentionally disruptive layouts.' },
];

const severity = [
  { tier: 'Reminder', tone: 'Small confusion', body: 'A quick nudge when someone is new, confused, or made a harmless mistake.' },
  { tier: 'Warning', tone: 'Needs to stop', body: 'A clear record when behavior is becoming a pattern or affecting other players.' },
  { tier: 'Temporary action', tone: 'Disruptive or repeated', body: 'Mutes, kicks, jails, job removals, or temporary bans when a warning is not enough.' },
  { tier: 'Permanent removal', tone: 'Server safety', body: 'Used for serious exploitation, evasion, harassment, or behavior that makes the community worse.' },
];

const reportChecklist = [
  'Your Steam name / character name',
  'Who was involved',
  'Approximate time and timezone',
  'What happened in plain language',
  'Screenshots, clips, or logs if available',
  'Whether this is a rule issue, bug, appeal, or support request',
];

export default async function RulesPage() {
  if (!(await isSiteFeatureEnabled('rules'))) notFound();
  const featureSettings = await getSiteFeatureSettings();
  const enabledFeatures = enabledFeatureIds(featureSettings);
  const bansVisible = enabledFeatures.has('bans');
  const supportVisible = enabledFeatures.has('support');
  const guidesVisible = enabledFeatures.has('guides');

  return (
    <main className="page-shell rules-page rules-handbook-page">
      <section className="rules-hero-card rules-overhaul-hero">
        <div className="rules-hero-copy">
          <span className="eyebrow">Northline RP rulebook</span>
          <h1>Semi-serious RP, without making it weird.</h1>
          <p>
            Northline works best when people play characters, give each other room, and let the city feel alive. Be funny, be dramatic, be shady — just do it in a way other players can actually respond to.
          </p>
          <div className="rules-hero-actions">
            <a className="button button-primary" href="#quick-start">Read the basics</a>
            <a className="button button-soft" href="#jobs-and-systems">Jobs and phone apps</a>
            <a className="button button-ghost" href="#scenario-lab">Scenario check</a>
          </div>
        </div>
        <aside className="rules-pass-card" aria-label="Rulebook quick pass">
          <div className="rules-pass-stamp">RP</div>
          <span>Rule of thumb</span>
          <strong>Would this make a better scene for everyone involved?</strong>
          <small>If not, slow down and give the other side something to play with.</small>
        </aside>
      </section>

      <section className="rules-vibe-strip" aria-label="Community expectations">
        <article><strong>Serious enough to matter</strong><span>Characters should act like the world is real.</span></article>
        <article><strong>Relaxed enough to enjoy</strong><span>Not every mistake needs a courtroom.</span></article>
        <article><strong>Community first</strong><span>The goal is a city people want to come back to.</span></article>
      </section>

      <section id="quick-start" className="rules-section-block">
        <div className="section-heading">
          <span className="kicker">Quick start</span>
          <h2>The four rules that cover most situations.</h2>
          <p>New or returning? Start here. Most staff calls come down to one of these.</p>
        </div>
        <div className="rules-sign-grid">
          {quickStart.map((item, index) => (
            <article className="rules-sign-card" key={item.label}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{item.label}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rules-section-block" id="in-game-rules">
        <div className="section-heading">
          <span className="kicker">In-game rule list</span>
          <h2>These are the same rules shown in-game.</h2>
          <p>The pause-menu rule list and spawn rule display should match this short version. The sections below explain the same expectations in more detail.</p>
        </div>
        <div className="rules-ingame-list">
          {inGameRules.map((rule, index) => (
            <article key={rule.Id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{rule.Text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rules-section-block">
        <div className="section-heading">
          <span className="kicker">Rulebook</span>
          <h2>Open the section that matches what happened.</h2>
          <p>These are practical community expectations. Staff still use context and common sense.</p>
        </div>
        <div className="rules-accordion-list">
          {rulebook.map((section, index) => (
            <details className="rules-accordion" key={section.title} open={index === 0}>
              <summary>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{section.title}</strong>
                  <small>{section.mood}</small>
                </div>
              </summary>
              <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>
            </details>
          ))}
        </div>
      </section>

      <section id="jobs-and-systems" className="rules-section-block rules-jobs-system-block">
        <div className="section-heading">
          <span className="kicker">Jobs and systems</span>
          <h2>The phone and job systems are part of roleplay.</h2>
          <p>Press <strong>P</strong> in-game to open your phone. These systems are there to create scenes, not just menus.</p>
        </div>
        <div className="rules-job-grid">
          <article>
            <span>Jobs</span>
            <h3>Public-service and task jobs</h3>
            <p>Medic, Police Officer, Chief of Police, Mayor, and Courier. Stay active while holding these jobs.</p>
          </article>
          <article>
            <span>Citizen jobs</span>
            <h3>Everyday and business roles</h3>
            <p>Citizen, Grocery Store Owner, Gun Store Owner, and Hardware Store Owner. Shops should create scenes, not just menus.</p>
          </article>
          <article>
            <span>Cleanup</span>
            <h3>Garbage and recycling</h3>
            <p>Recycle garbage for cash, or use litter bins for no reward except leaving the map better than you found it.</p>
          </article>
        </div>
        <div className="rules-phone-grid">
          {phoneExpectations.map((item) => (
            <article key={item.app}>
              <strong>{item.app}</strong>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="scenario-lab" className="rules-section-block scenario-lab-block">
        <div className="section-heading">
          <span className="kicker">Scenario check</span>
          <h2>Would this work in Northline?</h2>
          <p>Open each card to compare the messy choice with the better play.</p>
        </div>
        <div className="scenario-grid">
          {scenarios.map((scenario, index) => (
            <details className="scenario-card" key={scenario.setup}>
              <summary>
                <span>Case {index + 1}</span>
                <strong>{scenario.setup}</strong>
                <small>Open the better play →</small>
              </summary>
              <div className="scenario-answer-grid">
                <div className="bad-answer"><span>Bad play</span><p>{scenario.bad}</p></div>
                <div className="good-answer"><span>Better play</span><p>{scenario.good}</p></div>
              </div>
              <p className="scenario-lesson">{scenario.lesson}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rules-two-column-section">
        <div className="rules-section-block severity-block">
          <div className="section-heading compact-heading">
            <span className="kicker">Consequences</span>
            <h2>How staff usually judge consequences.</h2>
            <p>Context matters. One confused moment and repeated disruption are not treated the same.</p>
          </div>
          <div className="severity-roadmap">
            {severity.map((item) => (
              <article key={item.tier}>
                <span>{item.tier}</span>
                <strong>{item.tone}</strong>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="rules-section-block report-card-block">
          <div className="section-heading compact-heading">
            <span className="kicker">Need staff?</span>
            <h2>Make reports easy to review.</h2>
            <p>Clear reports help staff act faster and keep OOC drama out of the city.</p>
          </div>
          <ul className="report-checklist">{reportChecklist.map((item) => <li key={item}>{item}</li>)}</ul>
          {(bansVisible || supportVisible) ? (
            <div className="rules-report-actions">
              {bansVisible ? <Link className="button button-primary" href="/bans">View bans</Link> : null}
              {supportVisible ? <Link className="button button-soft" href="/support">Community support</Link> : null}
            </div>
          ) : null}
        </aside>
      </section>

      <section className="rules-final-callout">
        <div>
          <span className="kicker">Northline rule of thumb</span>
          <h2>Make scenes people want to talk about later.</h2>
          <p>If your plan only works by making the other person miserable, it probably needs a better setup. Play hard, play fair, and leave room for the next scene.</p>
        </div>
        {guidesVisible ? <Link className="button button-primary" href="/guides">Read the guides</Link> : null}
      </section>
    </main>
  );
}
