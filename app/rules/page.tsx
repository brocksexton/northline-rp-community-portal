import Link from 'next/link';

export const metadata = { title: 'Rules' };

const quickStart = [
  { label: 'Stay in character', body: 'Treat Northline like a shared story. OOC chat is for clarification, not winning arguments.' },
  { label: 'Create scenes, not victims', body: 'Conflict is welcome when it gives everyone something to play with. Random grief is not roleplay.' },
  { label: 'Escalate naturally', body: 'Threats, fights, chases, robbery, and shootouts need context. Let scenes breathe before they explode.' },
  { label: 'Keep it fair', body: 'No metagaming, powergaming, exploiting, combat logging, or forcing outcomes.' },
];

const rulebook = [
  {
    title: 'Roleplay first',
    mood: 'The city works when people commit.',
    points: [
      'Use your character’s knowledge, not your Discord/stream/web knowledge.',
      'Give other players time to react and respond.',
      'Do not break character to insult, argue, or pressure someone.',
      'Small scenes matter. Mechanics should support roleplay, not replace it.',
    ],
  },
  {
    title: 'Conflict needs a reason',
    mood: 'Drama is good. Random chaos is not.',
    points: [
      'Violence should have setup, motive, or an ongoing story behind it.',
      'Value your life and the lives around you. Fear, injury, and consequences should matter.',
      'Robbery, kidnapping, ambushes, and shootouts should be memorable scenes, not drive-by chores.',
      'Do not use “it is what my character would do” as a shield for low-effort griefing.',
    ],
  },
  {
    title: 'No unfair information',
    mood: 'Your character did not read the website logs.',
    points: [
      'No metagaming from Discord, streams, screenshots, staff info, or out-of-character conversations.',
      'No powergaming: do not force another player’s injuries, capture, fear, memory, or actions.',
      'Do not use alternate characters or friends to bypass consequences.',
      'If you are unsure whether your character knows something, play it safe.',
    ],
  },
  {
    title: 'Respect the people behind the characters',
    mood: 'Hard roleplay still needs basic respect.',
    points: [
      'No harassment, slurs, targeted toxicity, creepy behavior, or personal attacks.',
      'Do not turn in-character conflict into OOC drama.',
      'Respect scene boundaries and staff direction.',
      'If a scene is going badly OOC, pause, clarify, and get staff if needed.',
    ],
  },
  {
    title: 'Play clean',
    mood: 'Bugs are not secret features.',
    points: [
      'No exploiting, duplicating, abusing economy loopholes, or intentionally breaking systems.',
      'Report major bugs instead of farming them.',
      'Do not combat log, evade punishment, or dodge roleplay consequences by disconnecting.',
      'No pay-to-win expectations. Supporter perks, if added later, stay cosmetic/community-facing.',
    ],
  },
];

const scenarios = [
  {
    setup: 'You see a player get arrested, but you learned the reason from Discord.',
    bad: 'Run to the police station and confront officers with Discord details.',
    good: 'Only act on what your character saw, heard, or was told in-character.',
    lesson: 'That is metagaming. Keep outside information outside the city.',
  },
  {
    setup: 'A shopkeeper is rude to you during a scene.',
    bad: 'Immediately pull a gun and kill them because you felt disrespected.',
    good: 'Escalate through words, threats, business rivalry, robbery setup, or future consequences.',
    lesson: 'Conflict is better when it has steps. Let the story cook.',
  },
  {
    setup: 'You find an item duplication bug that makes you rich.',
    bad: 'Quietly use it and tell your friends before staff notice.',
    good: 'Stop using it, record what happened, and report it privately.',
    lesson: 'Exploits damage the whole economy and usually lead to rollbacks/punishment.',
  },
  {
    setup: 'Someone breaks a rule against you.',
    bad: 'Start yelling OOC in public chat and derail the scene.',
    good: 'Finish or pause the scene safely, gather evidence, and make a clear staff report.',
    lesson: 'A good report fixes problems faster than a public argument.',
  },
];

const severity = [
  { tier: 'Reminder', tone: 'Small mistake', body: 'A nudge for minor confusion, first-time mistakes, or unclear roleplay moments.' },
  { tier: 'Warning', tone: 'Pattern forming', body: 'Used when behavior needs to stop and staff want a visible record.' },
  { tier: 'Temporary action', tone: 'Serious disruption', body: 'Mutes, kicks, jails, or temporary bans for repeated or harmful behavior.' },
  { tier: 'Permanent removal', tone: 'Community safety', body: 'Used for exploitation, evasion, severe harassment, or behavior that makes the city worse for everyone.' },
];

const reportChecklist = [
  'Your Steam name / character name',
  'Who was involved',
  'Approximate time and timezone',
  'What happened in plain language',
  'Screenshots, clips, or logs if available',
  'What you need staff to review',
];

export default function RulesPage() {
  return (
    <main className="page-shell rules-page rules-handbook-page">
      <section className="rules-hero-card">
        <div className="rules-hero-copy">
          <span className="eyebrow">Northline citizen handbook</span>
          <h1>Rules that keep the city fun.</h1>
          <p>
            Northline works best when players treat every interaction like a chance to make someone else’s night better. This guide is built to be skimmable, practical, and useful before you jump in.
          </p>
          <div className="rules-hero-actions">
            <a className="button button-primary" href="#quick-start">Start with the basics</a>
            <a className="button button-soft" href="#scenario-lab">Try the scenario lab</a>
          </div>
        </div>
        <aside className="rules-pass-card" aria-label="Rulebook quick pass">
          <div className="rules-pass-stamp">NL</div>
          <span>Five-minute pass</span>
          <strong>Read the basics, try a scenario, know how to report.</strong>
          <small>Good citizens make better stories.</small>
        </aside>
      </section>

      <section className="rules-vibe-strip" aria-label="Community expectations">
        <article>
          <strong>Be memorable</strong>
          <span>Scenes beat scoreboards.</span>
        </article>
        <article>
          <strong>Be fair</strong>
          <span>Give people room to react.</span>
        </article>
        <article>
          <strong>Be human</strong>
          <span>There is a real person behind every character.</span>
        </article>
      </section>

      <section id="quick-start" className="rules-section-block">
        <div className="section-heading">
          <span className="kicker">Quick start</span>
          <h2>The rules in four street signs.</h2>
          <p>New here? Read these first. Most staff calls come down to one of these four ideas.</p>
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

      <section className="rules-section-block">
        <div className="section-heading">
          <span className="kicker">Rulebook</span>
          <h2>Open the sections you care about.</h2>
          <p>These are written as practical expectations rather than legal paperwork.</p>
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
              <ul>
                {section.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <section id="scenario-lab" className="rules-section-block scenario-lab-block">
        <div className="section-heading">
          <span className="kicker">Scenario lab</span>
          <h2>Would this fly in Northline?</h2>
          <p>Click each card to reveal the better play. This is the fast way to learn the server’s roleplay culture.</p>
        </div>
        <div className="scenario-grid">
          {scenarios.map((scenario, index) => (
            <details className="scenario-card" key={scenario.setup}>
              <summary>
                <span>Case {index + 1}</span>
                <strong>{scenario.setup}</strong>
                <small>Pick the better response →</small>
              </summary>
              <div className="scenario-answer-grid">
                <div className="bad-answer">
                  <span>Bad play</span>
                  <p>{scenario.bad}</p>
                </div>
                <div className="good-answer">
                  <span>Better play</span>
                  <p>{scenario.good}</p>
                </div>
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
            <h2>How staff usually think about punishment.</h2>
            <p>Context matters. Honest mistakes and repeated disruption are not treated the same.</p>
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
            <h2>Make reports easy to solve.</h2>
            <p>Clear reports protect everyone and keep OOC drama out of the city.</p>
          </div>
          <ul className="report-checklist">
            {reportChecklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <div className="rules-report-actions">
            <Link className="button button-primary" href="/bans">View bans</Link>
            <Link className="button button-soft" href="/support">Community support</Link>
          </div>
        </aside>
      </section>

      <section className="rules-final-callout">
        <div>
          <span className="kicker">The northline rule of thumb</span>
          <h2>Would this make a good story for everyone involved?</h2>
          <p>If the answer is no, slow down, give the other side something to work with, or ask staff before the scene turns into a mess.</p>
        </div>
        <Link className="button button-primary" href="/guides">Read the guides</Link>
      </section>
    </main>
  );
}
