'use client';

import { useEffect, useMemo, useState } from 'react';

type GuideMediaLayout = 'grid' | 'wide-top' | 'stacked';

type GuideStep = {
  title: string;
  body: string;
  image?: string;
  alt?: string;
  images?: { src: string; alt: string }[];
  mediaLayout?: GuideMediaLayout;
  bullets?: string[];
};

type JobGuide = {
  id: string;
  title: string;
  group: 'Job' | 'Citizen job' | 'Core guide';
  summary: string;
  status: 'Visual guide' | 'Basic guide' | 'Planned';
  accent: string;
  steps: GuideStep[];
};

const jobAfkStep: GuideStep = {
  title: 'Stay active while you are working',
  body: 'Many jobs will warn you if you are inactive too long. If the warning runs out, you can be kicked out of that job and may need to pick the role again later.',
  image: '/guides/common/afk-warning.png',
  alt: 'Employment warning saying the player will be kicked in 60 seconds for inactivity.',
  bullets: ['Do not go AFK while holding an active job role.', 'If you need to step away, finish what you are doing first or expect the job to remove you.', 'This helps keep limited job slots open for people actively playing.'],
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

const systemGuides: JobGuide[] = [
  {
    id: 'core-basics',
    title: 'Cash, Bank, Inventory & Property Basics',
    group: 'Core guide',
    summary: 'Learn where money lives, how item storage works, how to rent property, and what to do with safes, stash storage, and Town Hall storage.',
    status: 'Visual guide',
    accent: '💰',
    steps: [
      {
        title: 'Understand what you are carrying',
        body: 'There are three core things to keep in mind: cash on your character, items in your inventory, and money stored in the bank. You can also drop cash from your wallet and drop items from your inventory when roleplay calls for it. If an item is outlined in red in your inventory, it is currently illegal contraband and police can seize it if they catch you with it.',
        image: '/guides/basics/inventory-illegal.png',
        alt: 'Northline inventory screen showing a red outlined illegal item and body armor equipment.',
        bullets: ['Cash on hand is what you are physically carrying.', 'Items stay in your inventory until you drop, store, or use them.', 'Red-outlined items are illegal and can get you searched, seized, or arrested.', 'Bank money is safer than walking around with a pocket full of cash.'],
      },
      {
        title: 'Use an ATM for your bank account',
        body: 'ATMs let you withdraw cash, deposit cash, and check your bank balance. The phone Bank app is useful for checking balance, but when you want to move cash into the bank, you need an ATM around the map.',
        image: '/guides/basics/atm.png',
        alt: 'Northline ATM screen showing options to withdraw cash, deposit, and perform a balance inquiry.',
        bullets: ['Deposit cash at ATMs to keep it safe.', 'Withdraw cash when you need spending money on you.', 'If you plan on renting property, make sure the rent money is in your bank.'],
      },
      {
        title: 'Renting starts at a property sign',
        body: 'If you want your own place, walk up to a property with a rent sign and interact with it. This is the first step for getting a residential or commercial space.',
        image: '/guides/basics/rent-sign.png',
        alt: 'A for-rent sign on a property with an E interact prompt to rent it.',
        bullets: ['Residential places are good for personal living space and storage.', 'Commercial places are used for businesses like grocery, gun, or hardware stores.', 'Think about why you want the space before you rent it.'],
      },
      {
        title: 'Jobs and commercial property can conflict',
        body: 'Some roles and commercial property do not mix. If you try to rent a business property while you still have a conflicting job, the game may tell you to quit your job first. The reverse can also happen when you try to take a job while already renting a commercial unit.',
        image: '/guides/basics/property-warning-quit-job.png',
        alt: 'Property warning saying to quit your job to rent a commercial property.',
        bullets: ['Read red warning notices carefully before assuming something is broken.', 'If needed, open Careers and use the Quit Job button first.', 'Commercial property ownership can block certain public jobs, and certain jobs can block commercial rentals.'],
      },
      {
        title: 'You can quit your current job from Careers',
        body: 'If you need to free yourself up for a commercial property, open the Careers app and use the Quit Job button beside your current role. After that, try renting again.',
        image: '/guides/basics/quit-job-phone.png',
        alt: 'Careers phone screen showing Courier as the current job and a Quit Job button.',
        bullets: ['Do this before trying to rent a shop if the warning tells you to.', 'You can always pick a different job again later if the server allows it.'],
      },
      {
        title: 'Set up the property before you rent it',
        body: 'When the rent window opens, choose the correct business type for commercial space, look at the rent cost, review building limits, and pick a saved layout if you have one. The rent comes from your bank account.',
        image: '/guides/basics/property-panel.png',
        alt: 'Property rental menu showing business type, commercial type, rent cost from bank, building limits, and layout options.',
        bullets: ['Commercial property rent is paid from bank, not from the cash in your pocket.', 'Use the dropdowns to choose the right business type.', 'Saved layouts can speed up setup if you already made one.'],
      },
      {
        title: 'Business type and layout choices matter',
        body: 'Commercial properties let you choose what kind of shop it is and whether to apply a layout. Pick the option that matches what you actually plan to run.',
        image: '/guides/basics/property-dropdowns.png',
        alt: 'Commercial property menu showing business type choices such as Grocery Store, Gun Store, Hardware Store, and layout selection.',
        bullets: ['Choose the business type that matches your intended store.', 'Layouts can give you a quick starting point, but you can still customize later.'],
      },
      {
        title: 'Store items in a personal safe or stash',
        body: 'One of the best reasons to own property is secure item storage. You can buy a Personal Safe item and place it in your property to hold valuables and gear.',
        image: '/guides/basics/safe-shop-card.png',
        alt: 'Shop card for a Personal Safe item with a tooltip saying it stores items safely.',
        bullets: ['Safes are for items and valuables you do not want to carry everywhere.', 'A placed safe acts like your personal stash inside the property.'],
      },
      {
        title: 'Place the safe and manage its storage',
        body: 'After placing the safe in your property, interact with it to open the storage window. You can move items between the safe, your inventory, and your hotbar from there.',
        image: '/guides/basics/safe-ui.png',
        alt: 'Safe storage UI with safe slots, player inventory slots, and hotbar slots.',
        bullets: ['Use Store All, Quick Stack, and Sort to tidy things up.', 'This is much safer than carrying everything around in person.'],
      },
      {
        title: 'Remember that safes can still be attacked',
        body: 'A safe is storage, not magic. In some situations players may attempt to crack safes. That means expensive or illegal-looking storage can create its own risks and RP.',
        image: '/guides/basics/crack-safe.png',
        alt: 'Prompt showing a player cracking a safe with a stealing progress bar.',
        bullets: ['A private property does not make your storage untouchable.', 'Store smartly and understand that crime-related RP may involve break-ins or theft attempts.'],
      },
      {
        title: 'Town Hall / Spawn storage is a good backup option',
        body: 'If you do not own a property yet, use the Town Hall storage at spawn for simple item storage. It is a practical option when you are still getting started or between places.',
        image: '/guides/basics/townhall-storage.png',
        alt: 'Town Hall storage interface with inventory slots and hotbar slots.',
        bullets: ['This is helpful early on before renting your own place.', 'Use it when you need somewhere predictable to leave items.'],
      },
    ],
  },
];

const mayorSteps: GuideStep[] = [
  {
    title: 'Start the election with Michael at the Police Department',
    body: 'All mayoral elections begin at the Police Department with Michael. Talk to him to open a new election cycle for the city. Starting the election does not automatically put you on the ballot.',
    image: '/guides/mayor/michael-dialogue.png',
    alt: 'Michael dialogue screen offering to start a new mayoral election.',
    bullets: ['Michael is the first stop for every election.', 'Starting the election only opens registration.', 'You still need to enter yourself as a candidate afterward.'],
  },
  {
    title: 'Watch for registration opening',
    body: 'Once the election is started, the city gets a notice that registration is open. Players also get a phone notification, giving other people time to decide whether they want to run against you.',
    images: [
      { src: '/guides/mayor/registration-open.png', alt: 'Voting notice and phone message announcing that mayoral election registration is open.' },
    ],
    bullets: ['Registration opens before voting starts.', 'Use this window to prepare your campaign.', 'Other players can join the race during this time.'],
  },
  {
    title: 'Open the Elections app and enter the race',
    body: 'Press P, open your phone, and launch the Elections app. Set a slogan, then use Enter race to register yourself as a candidate. If you never do this step, you are not running even if you started the election.',
    images: [
      { src: '/guides/mayor/phone-home.png', alt: 'Phone home screen showing the Elections app.' },
      { src: '/guides/mayor/elections-register.png', alt: 'Elections app screen with fields for running for mayor and entering a campaign slogan.' },
      { src: '/guides/mayor/elections-candidates.png', alt: 'Elections app showing a registered candidate and slogan.' },
    ],
    mediaLayout: 'wide-top',
    bullets: ['Set a slogan people will actually remember.', 'Registration stays open for a bit so rivals can join too.', 'Check the candidate list to make sure you appear there.'],
  },
  {
    title: 'Campaign before voting starts',
    body: 'Use the time before voting begins to get your name out there. Tweeter is one of the best tools for this. Tell people what kind of mayor you plan to be and what you will change if elected.',
    images: [
      { src: '/guides/mayor/tweeter-campaign.png', alt: 'Tweeter compose screen with a campaign message for mayor.' },
    ],
    bullets: ['Use Tweeter for promises, events, and reminders.', 'Talk to business owners, police, and regular citizens in-character.', 'Good campaigns give people a reason to care about the result.'],
  },
  {
    title: 'Voting opens city-wide',
    body: 'When registration closes, the city gets another alert that voting is open. Players can then open the Elections app, look at the candidates, and cast a vote. A recorded vote confirmation appears after they choose someone.',
    images: [
      { src: '/guides/mayor/voting-open.png', alt: 'Voting notice and phone message announcing that mayoral voting is open.' },
      { src: '/guides/mayor/elections-vote.png', alt: 'Elections app screen showing a candidate card with a Vote button.' },
      { src: '/guides/mayor/vote-recorded.png', alt: 'Confirmation in the Elections app that a vote has been recorded.' },
    ],
    mediaLayout: 'wide-top',
    bullets: ['Registration and voting are separate phases.', 'People vote through the Elections app on their phone.', 'You still need to campaign if you want turnout in your favour.'],
  },
  {
    title: 'Run the city from the Mayor computer',
    body: 'If you win, head to the Mayor computer on the top floor of the Police Department. This is where you manage custom laws, contraband policy, and the sales tax rate within the server limits. Players can then view your current policies in the Government app on their phone.',
    images: [
      { src: '/guides/mayor/mayor-computer.png', alt: 'Mayor computer interface showing city administration controls such as tax rate and illegal items.' },
    ],
    bullets: ['Tax, laws, and contraband are all handled there.', 'Changes show up in the Government app for everyone.', 'Your tax rate can affect how strong your mayor paycheck becomes over time.'],
  },
  {
    title: 'Stay alive and expect pushback',
    body: 'Being mayor paints a target on your back. Unhappy people in the city may come after you, so do not wander around carelessly. When you become mayor, you receive body armor that reduces damage by 25%, but it will not save you from every bad situation.',
    images: [
      { src: '/guides/mayor/dead-screen.png', alt: 'Northline death screen showing the player has died.' },
      { src: '/guides/mayor/body-armor-inventory.png', alt: 'Inventory screen showing mayor body armor and its 25 percent damage reduction.' },
    ],
    mediaLayout: 'stacked',
    bullets: ['If you die, you lose the mayor title immediately.', 'When that happens, laws, tax rate, and policy all return to the default settings.', 'The body armor cuts damage by 25%, but it is not a free pass to ignore danger.', 'The best mayors keep the city active without making half the server want them gone.'],
  },
];

const basicSteps = {
  medic: [
    { title: 'Open Job Finder', body: 'Press P, open Job Finder, and check whether Medic has an open slot.', bullets: ['Use the waypoint if available.', 'Medic RP is about helping scenes continue.'] },
    { title: 'Find the job location', body: 'Follow the waypoint or ask around in-character if you are not sure where to go.', bullets: ['Keep your character believable.', 'Respond to injuries and calls for help.'] },
    { title: 'Play the role', body: 'Treat medical work as a public-facing job. Talk to patients, respond to scenes, and avoid turning every injury into a joke.', bullets: ['Keep it semi-serious.', 'Give people a reason to interact.'] },
  ],
  courier: [
    {
      title: 'Open Job Finder and choose Courier',
      body: 'Press P, open Job Finder, and choose Courier under the Other section. Courier is a great first job if you want to learn the city while earning money.',
      image: '/guides/courier/job-finder.png',
      alt: 'Careers screen showing Courier listed under Other jobs.',
      bullets: ['Courier appears under the Other category.', 'This job often has open slots for newer players.', 'Open the Courier page to review the job first.'],
    },
    {
      title: 'Check the job details and add a waypoint',
      body: 'The job page shows a short description, open spots, and an Add Waypoint button. Courier may show a $0 salary because you are paid per completed package, not by a fixed paycheck.',
      image: '/guides/courier/job-details.png',
      alt: 'Courier job details page showing the Add Waypoint button and a $0 listed salary.',
      bullets: ['Do not let the $0 salary confuse you.', 'Use Add Waypoint if you need help finding the post office.', 'You earn money from successful deliveries.'],
    },
    {
      title: 'Head to the post office',
      body: 'Follow your waypoint to the post office. This is where you start the job and pick up parcels for delivery.',
      image: '/guides/courier/post-office-exterior.png',
      alt: 'Exterior view of the post office building in Northline RP.',
      bullets: ['The post office is your home base for Courier work.', 'If you get lost, re-open Job Finder and set the waypoint again.'],
    },
    {
      title: 'Talk to Postman Patrick',
      body: 'Inside, speak with Postman Patrick and ask about employment. He is the NPC that handles courier work.',
      image: '/guides/courier/postman-patrick.png',
      alt: 'Postman Patrick standing behind the post office counter.',
      bullets: ['Use the employment dialogue option.', 'This is where you begin the in-person part of the job.'],
    },
    {
      title: 'Browse jobs and apply',
      body: 'Open the job list and apply for Courier if there is an open slot. Once accepted, you can start taking deliveries right away.',
      image: '/guides/courier/browse-jobs.png',
      alt: 'Browse Jobs panel showing the Courier role with an Apply button.',
      bullets: ['If the job is full, come back later.', 'Once hired, you can start collecting parcels from the shelves.'],
    },
    {
      title: 'Pick up a parcel from the shelves',
      body: 'Walk up to a parcel and interact with it. Taking a parcel starts the delivery and begins the timed run.',
      image: '/guides/courier/pick-parcel.png',
      alt: 'A parcel on a shelf with the pick-up prompt visible.',
      bullets: ['Only grab a parcel when you are ready to leave.', 'After pickup, the HUD shows the destination and the timer.', 'Quicker runs pay more.'],
    },
    {
      title: 'Deliver the parcel to the right mailbox',
      body: 'Carry the package to the marked destination and interact with the correct mailbox to complete the delivery.',
      image: '/guides/courier/deliver-parcel.png',
      alt: 'Parcel being delivered to a mailbox with the Deliver Parcel prompt visible.',
      bullets: ['Follow the destination marker and keep an eye on the time.', 'You are paid when the delivery is completed successfully.', 'The faster you finish, the better your payout can be.'],
    },
    {
      title: 'If time runs out, get a new package',
      body: 'If you run out of time, the delivery is cancelled and the package disappears. Head back to the post office and pick up a new parcel.',
      image: '/guides/courier/timeout-notice.png',
      alt: 'Red employment notice saying the delivery was cancelled because time ran out.',
      bullets: ['A timed-out package does not count as a delivery.', 'You need to return and start a new run.', 'Try to move quicker on the next attempt for a better payout.'],
    },
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
    group: 'Job',
    summary: 'Apply through Job Finder, visit the station, talk to Sergeant Harris, and respond to 911 or break-in alerts once hired.',
    status: 'Visual guide',
    accent: '🚓',
    steps: [...policeSteps, jobAfkStep],
  },
  {
    id: 'medic',
    title: 'Medic',
    group: 'Job',
    summary: 'Help injured players, respond to scenes, and keep RP moving instead of treating medical work like a menu button.',
    status: 'Basic guide',
    accent: '⚕️',
    steps: [...basicSteps.medic, jobAfkStep],
  },
  {
    id: 'mayor',
    title: 'Elections & Mayor',
    group: 'Job',
    summary: 'Start an election, enter the race, campaign, win votes, and run city laws and tax policy as mayor.',
    status: 'Visual guide',
    accent: '🏛️',
    steps: [...mayorSteps, jobAfkStep],
  },
  {
    id: 'courier',
    title: 'Courier',
    group: 'Job',
    summary: 'Deliver timed parcels around the city. Salary shows $0 because Courier pays per completed package.',
    status: 'Visual guide',
    accent: '📦',
    steps: [...basicSteps.courier, jobAfkStep],
  },
  {
    id: 'business',
    title: 'Store Owner Jobs',
    group: 'Citizen job',
    summary: 'Grocery, Gun Store, and Hardware Store roles are for players who want to run a public-facing business.',
    status: 'Basic guide',
    accent: '🏪',
    steps: [...basicSteps.business, jobAfkStep],
  },
  {
    id: 'citizen',
    title: 'Citizen',
    group: 'Citizen job',
    summary: 'The flexible default role for learning the city, cleaning up, using properties, meeting people, and building a character.',
    status: 'Basic guide',
    accent: '👤',
    steps: [...basicSteps.citizen, jobAfkStep],
  },
];

function guideLabel(guide: JobGuide) {
  if (guide.group === 'Core guide') return 'Core guide';
  if (guide.group === 'Citizen job') return 'Citizen job guide';
  return 'Job guide';
}

export default function GuideJobSection() {
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const allGuides = useMemo(() => [...systemGuides, ...jobGuides], []);
  const activeGuide = useMemo(() => allGuides.find((guide) => guide.id === activeGuideId) ?? null, [activeGuideId, allGuides]);
  const activeStep = activeGuide?.steps[stepIndex] ?? null;
  const progress = activeGuide ? Math.round(((stepIndex + 1) / activeGuide.steps.length) * 100) : 0;

  function openGuide(id: string) {
    setActiveGuideId(id);
    setStepIndex(0);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('guide', id);
      url.hash = 'job-guides';
      window.history.replaceState(null, '', url.toString());
    }
  }

  function closeGuide() {
    setActiveGuideId(null);
    setStepIndex(0);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('guide');
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }

  function previousStep() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function nextStep() {
    if (!activeGuide) return;
    setStepIndex((current) => Math.min(activeGuide.steps.length - 1, current + 1));
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const requestedGuide = url.searchParams.get('guide');
    if (!requestedGuide) return;
    if (allGuides.some((guide) => guide.id === requestedGuide)) {
      setActiveGuideId(requestedGuide);
      setStepIndex(0);
      document.getElementById('job-guides')?.scrollIntoView({ block: 'start' });
    }
  }, [allGuides]);

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
        <span className="guides-kicker">Core basics</span>
        <h2>Learn the systems that power everyday play.</h2>
        <p>These guides cover the basics that almost everyone uses sooner or later, like money, banking, inventory, property, and starter storage.</p>
      </div>

      <div className="guide-job-card-grid">
        {systemGuides.map((guide) => (
          <button className="guide-job-card" type="button" key={guide.id} onClick={() => openGuide(guide.id)}>
            <span className="guide-job-icon" aria-hidden="true">{guide.accent}</span>
            <span className="guide-job-meta">{guide.group} · {guide.status}</span>
            <strong>{guide.title}</strong>
            <p>{guide.summary}</p>
            <small>Open step-by-step guide</small>
          </button>
        ))}
      </div>

      <div className="guides-section-heading compact guide-jobs-subheading">
        <span className="guides-kicker">Jobs available</span>
        <h2>Pick a job guide.</h2>
        <p>Choose a role below to learn how it works, what tools you will use, and what to expect once you are in the job.</p>
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
                <span>{guideLabel(activeGuide)}</span>
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
              {activeStep.images?.length ? (
                <figure className={`guide-modal-media guide-modal-media-grid${activeStep.mediaLayout ? ` guide-modal-media-${activeStep.mediaLayout}` : ''}`}>
                  {activeStep.images.map((item) => (
                    <div className="guide-modal-media-tile" key={`${activeStep.title}-${item.src}`}>
                      <img src={item.src} alt={item.alt} />
                    </div>
                  ))}
                </figure>
              ) : activeStep.image ? (
                <figure className="guide-modal-media">
                  <img src={activeStep.image} alt={activeStep.alt ?? activeStep.title} />
                </figure>
              ) : (
                <div className="guide-modal-placeholder">
                  <strong>Guide note</strong>
                  <span>Use the step details on the left, then continue when you are ready.</span>
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
