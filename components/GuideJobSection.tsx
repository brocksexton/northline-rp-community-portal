'use client';

import { useEffect, useMemo, useState } from 'react';

type GuideStep = {
  title: string;
  body: string;
  image?: string;
  alt?: string;
  bullets?: string[];
};

type JobGuide = {
  id: string;
  title: string;
  group: 'Real job' | 'Citizen job';
  summary: string;
  status: 'Visual guide' | 'Basic guide' | 'Planned';
  accent: string;
  steps: GuideStep[];
};

const policeSteps: GuideStep[] = [
  {
    title: 'Open the controls and your phone',
    body: 'The bottom-right HUD shows useful keys. Press P to open your phone. This same control reference will be reused in future tutorials too.',
    image: '/guides/police/controls.png',
    alt: 'Bottom-right Northline HUD controls showing keys for phone, inventory, progression, roleplay actions, and voice chat.',
    bullets: ['P opens your phone.', 'Q opens RP actions.', 'V is push-to-talk and Z changes voice range.'],
  },
  {
    title: 'Open Job Finder',
    body: 'From the phone home screen, select Job Finder. This is where you can browse jobs, see open slots, check salary, and set waypoints.',
    image: '/guides/police/phone-home.png',
    alt: 'Northline in-game phone home screen with the Job Finder app visible.',
    bullets: ['Job Finder is the blue briefcase app.', 'Government, Bank, 911, and Tweeter are also useful while on duty.'],
  },
  {
    title: 'Choose Police Officer or Chief of Police',
    body: 'Open the police section and choose the role you want. Chief of Police may have fewer slots and more responsibility.',
    image: '/guides/police/job-finder.png',
    alt: 'Job Finder screen listing Police Officer, Mayor, Courier, and Medic.',
    bullets: ['Police Officer is the normal police role.', 'Chief of Police is a leadership role and may not always be available.'],
  },
  {
    title: 'Review the job and add a waypoint',
    body: 'The job page shows description, salary, and open spots. Select Add Waypoint so the station appears on your HUD compass.',
    image: '/guides/police/police-officer-details.png',
    alt: 'Police Officer job details page showing description, salary, open slots, and an Add Waypoint button.',
    bullets: ['Salary can vary by role and server state.', 'Use the waypoint if you are new or lost.'],
  },
  {
    title: 'Follow the compass marker',
    body: 'The waypoint appears near the top compass. Follow the marker and distance number until you arrive at the police station.',
    image: '/guides/police/compass-waypoint.png',
    alt: 'Northline top compass HUD with a waypoint marker and distance shown.',
    bullets: ['The number shows roughly how far away you are.', 'If you lose it, reopen Job Finder and set the waypoint again.'],
  },
  {
    title: 'Enter the Police Department',
    body: 'Head to the front of the Police Department and enter the lobby. The hiring interaction happens at the front desk window.',
    image: '/guides/police/police-station-exterior.png',
    alt: 'Exterior of the Northline Police Department building.',
    bullets: ['Use the front entrance.', 'Look for the front desk window inside.'],
  },
  {
    title: 'Talk to Sergeant Harris',
    body: 'Speak with Sergeant Harris and ask about employment. If slots are available, he can offer Police Officer or Chief of Police.',
    image: '/guides/police/sergeant-harris.png',
    alt: 'Sergeant Harris behind the service window with employment dialogue options.',
    bullets: ['This turns the phone waypoint into an in-person roleplay step.', 'If you are not eligible, the server will show a notice.'],
  },
  {
    title: 'Watch for 911 reports and break-in alerts',
    body: 'Police can receive reports from players using the 911 app. Stores can also trigger theft sensor alerts. These are calls for you to respond to in-character.',
    image: '/guides/police/break-in-alert.png',
    alt: 'Break-in attempt alert showing a possible break-in report and a respond prompt.',
    bullets: ['911 reports may include robbery, assault, suspicious activity, property damage, or other details.', 'Store theft sensors can create break-in alerts.', 'Press the respond key when you are able to take the call.'],
  },
  {
    title: 'Know the common application blockers',
    body: 'If the application does not go through, it is usually because another condition is blocking it. Read the notice before asking staff.',
    image: '/guides/police/error-property.png',
    alt: 'Property warning saying to stop renting your commercial property before getting a job.',
    bullets: ['You may need to stop renting a commercial property.', 'You may already have another job vote in progress.', 'Wanted characters should not expect to be hired into police.'],
  },
  {
    title: 'Respect the vote flow',
    body: 'Some role changes may start a vote. Wait for the vote to finish before trying another role that needs the same process.',
    image: '/guides/police/notice-voting.png',
    alt: 'Voting notice saying a new vote has started.',
    bullets: ['Do not spam the application.', 'If you see an employment vote warning, wait until it ends.'],
  },
  {
    title: 'Use your tools carefully',
    body: 'Police Officers receive a taser, pistol, and handcuffs. These tools are there to support roleplay, not end every scene instantly.',
    image: '/guides/police/cuffed.png',
    alt: 'A player in police custody with an instruction to press E to escape cuffs.',
    bullets: ['Respond to calls, patrol, question people, and investigate.', 'Cuffed suspects can try to break out.', 'Leave room for the other player to roleplay.'],
  },
  {
    title: 'Cuffs are not always final',
    body: 'Players may be able to escape cuffs through a short minigame. Stay aware, communicate, and keep the scene moving if they get loose.',
    image: '/guides/police/cuff-minigame.png',
    alt: 'Cuff escape minigame UI with a timing bar and mouse prompts.',
    bullets: ['Do not assume a cuffed suspect is fully secure.', 'Use good judgment before escalating.', 'A chase or escape can be part of the fun.'],
  },
];

const basicSteps = {
  medic: [
    { title: 'Open Job Finder', body: 'Press P, open Job Finder, and check whether Medic has an open slot.', bullets: ['Use the waypoint if available.', 'Medic RP is about helping scenes continue.'] },
    { title: 'Find the job location', body: 'Follow the waypoint or ask around in-character if you are not sure where to go.', bullets: ['Keep your character believable.', 'Respond to injuries and calls for help.'] },
    { title: 'Play the role', body: 'Treat medical work as a public-facing job. Talk to patients, respond to scenes, and avoid turning every injury into a joke.', bullets: ['Keep it semi-serious.', 'Give people a reason to interact.'] },
  ],
  mayor: [
    { title: 'Check Elections and Government', body: 'Use the phone to check elections, laws, taxes, and current city direction.', bullets: ['Mayor work is public and political.', 'Expect other players to have opinions.'] },
    { title: 'Campaign in-character', body: 'Use Tweeter, public speeches, businesses, and conversations to campaign.', bullets: ['Make promises you can roleplay around.', 'Keep it fun, not personal.'] },
    { title: 'Lead the city', body: 'If elected, use the role to create scenes rather than only changing numbers.', bullets: ['Talk to police and business owners.', 'Give citizens something to react to.'] },
  ],
  courier: [
    { title: 'Open Job Finder', body: 'Use Job Finder to locate Courier work and set a waypoint if one is available.', bullets: ['Courier is a good low-pressure starting job.', 'It can help you learn the map.'] },
    { title: 'Follow the route', body: 'Move between pickup and drop-off points while staying aware of city activity around you.', bullets: ['Use it as a reason to meet people.', 'Do not block roads or doors while working.'] },
    { title: 'Make it RP', body: 'Deliveries can become scenes if you talk to businesses and citizens along the way.', bullets: ['Ask if shops need deliveries.', 'Use Tweeter or ads if appropriate.'] },
  ],
  business: [
    { title: 'Pick a business role', body: 'Grocery, Gun Store, and Hardware Store Owners are citizen jobs focused on player interaction.', bullets: ['Choose a business you actually want to run.', 'A quiet shop still needs advertising and presence.'] },
    { title: 'Use Ads and Properties', body: 'Use the Advertisement app to tell players you are open. Use Properties for your space and layouts.', bullets: ['Keep your storefront readable.', 'Do not rely on staff to bring customers.'] },
    { title: 'Create a reason to visit', body: 'Sales, events, gossip, repair work, and deals can all bring people to your shop.', bullets: ['Make it social.', 'Stay within the rules and current laws.'] },
  ],
  citizen: [
    { title: 'Start simple', body: 'Citizen is not a dead-end role. It lets you explore, talk, recycle garbage, visit shops, and build a character.', bullets: ['Great for your first session.', 'No pressure to be in charge.'] },
    { title: 'Use the city systems', body: 'Phone apps, Tweeter, 911, properties, recycling, and businesses all work fine as a citizen.', bullets: ['Find people and react to what they are doing.', 'Make small scenes first.'] },
    { title: 'Build toward something', body: 'Once you know what kind of RP you enjoy, move into jobs, business, crime, politics, or service roles.', bullets: ['Let your character develop naturally.', 'Do not rush into big conflict immediately.'] },
  ],
};

const jobGuides: JobGuide[] = [
  {
    id: 'police',
    title: 'Police Officer / Chief of Police',
    group: 'Real job',
    summary: 'Apply through Job Finder, visit the station, talk to Sergeant Harris, and respond to 911 or break-in alerts once hired.',
    status: 'Visual guide',
    accent: '🚓',
    steps: policeSteps,
  },
  {
    id: 'medic',
    title: 'Medic',
    group: 'Real job',
    summary: 'Help injured players, respond to scenes, and keep RP moving instead of treating medical work like a menu button.',
    status: 'Basic guide',
    accent: '⚕️',
    steps: basicSteps.medic,
  },
  {
    id: 'mayor',
    title: 'Mayor',
    group: 'Real job',
    summary: 'Use elections, Government, and public RP to campaign and lead the city when elected.',
    status: 'Basic guide',
    accent: '🏛️',
    steps: basicSteps.mayor,
  },
  {
    id: 'courier',
    title: 'Courier',
    group: 'Real job',
    summary: 'A straightforward way to learn the map, move between locations, and meet people while working.',
    status: 'Basic guide',
    accent: '📦',
    steps: basicSteps.courier,
  },
  {
    id: 'business',
    title: 'Store Owner Jobs',
    group: 'Citizen job',
    summary: 'Grocery, Gun Store, and Hardware Store roles are for players who want to run a public-facing business.',
    status: 'Basic guide',
    accent: '🏪',
    steps: basicSteps.business,
  },
  {
    id: 'citizen',
    title: 'Citizen',
    group: 'Citizen job',
    summary: 'The flexible default role for learning the city, cleaning up, using properties, meeting people, and building a character.',
    status: 'Basic guide',
    accent: '👤',
    steps: basicSteps.citizen,
  },
];

export default function GuideJobSection() {
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const activeGuide = useMemo(() => jobGuides.find((guide) => guide.id === activeGuideId) ?? null, [activeGuideId]);
  const activeStep = activeGuide?.steps[stepIndex] ?? null;
  const progress = activeGuide ? Math.round(((stepIndex + 1) / activeGuide.steps.length) * 100) : 0;

  function openGuide(id: string) {
    setActiveGuideId(id);
    setStepIndex(0);
  }

  function closeGuide() {
    setActiveGuideId(null);
    setStepIndex(0);
  }

  function previousStep() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function nextStep() {
    if (!activeGuide) return;
    setStepIndex((current) => Math.min(activeGuide.steps.length - 1, current + 1));
  }

  useEffect(() => {
    if (!activeGuide) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeGuide();
      if (event.key === 'ArrowLeft') previousStep();
      if (event.key === 'ArrowRight') nextStep();
    };
    document.body.classList.add('guide-modal-open');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('guide-modal-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeGuide, stepIndex]);

  return (
    <section className="guide-jobs-hub" id="job-guides">
      <div className="guides-section-heading compact">
        <span className="guides-kicker">Jobs available</span>
        <h2>Pick a job guide.</h2>
        <p>Choose a role below to open a step-by-step guide. The guide appears in a pop-up window, tracks progress, and can be closed at any time.</p>
      </div>

      <div className="guide-job-card-grid">
        {jobGuides.map((guide) => (
          <button className="guide-job-card" type="button" key={guide.id} onClick={() => openGuide(guide.id)}>
            <span className="guide-job-icon" aria-hidden="true">{guide.accent}</span>
            <span className="guide-job-meta">{guide.group} · {guide.status}</span>
            <strong>{guide.title}</strong>
            <p>{guide.summary}</p>
            <small>Open step-by-step guide</small>
          </button>
        ))}
      </div>

      {activeGuide && activeStep ? (
        <div className="guide-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeGuide();
        }}>
          <section className="guide-modal-window" role="dialog" aria-modal="true" aria-labelledby="guide-modal-title">
            <header className="guide-modal-header">
              <div>
                <span>{activeGuide.group} guide</span>
                <h2 id="guide-modal-title">{activeGuide.title}</h2>
              </div>
              <button className="guide-modal-close" type="button" onClick={closeGuide} aria-label="Close guide">×</button>
            </header>

            <div className="guide-modal-progress" aria-label={`Guide progress ${progress}%`}>
              <div><span style={{ width: `${progress}%` }} /></div>
              <strong>{stepIndex + 1}/{activeGuide.steps.length}</strong>
            </div>

            <article className="guide-modal-slide" key={`${activeGuide.id}-${stepIndex}`}>
              <div className="guide-modal-copy">
                <span>Step {stepIndex + 1}</span>
                <h3>{activeStep.title}</h3>
                <p>{activeStep.body}</p>
                {activeStep.bullets?.length ? (
                  <ul>
                    {activeStep.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                ) : null}
              </div>
              {activeStep.image ? (
                <figure className="guide-modal-media">
                  <img src={activeStep.image} alt={activeStep.alt ?? activeStep.title} />
                </figure>
              ) : (
                <div className="guide-modal-placeholder">
                  <strong>Visual guide slot</strong>
                  <span>A screenshot or short clip can be added here later.</span>
                </div>
              )}
            </article>

            <footer className="guide-modal-footer">
              <button className="button button-soft" type="button" onClick={previousStep} disabled={stepIndex === 0}>Back</button>
              <div className="guide-modal-dots" aria-hidden="true">
                {activeGuide.steps.map((_, index) => (
                  <button key={index} type="button" className={index === stepIndex ? 'active' : ''} onClick={() => setStepIndex(index)} tabIndex={-1} />
                ))}
              </div>
              {stepIndex === activeGuide.steps.length - 1 ? (
                <button className="button button-primary" type="button" onClick={closeGuide}>Finish</button>
              ) : (
                <button className="button button-primary" type="button" onClick={nextStep}>Next</button>
              )}
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
