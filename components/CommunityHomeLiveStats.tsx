'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

export type CommunityDeathCategory = {
  key: string;
  label: string;
  count: number;
  icon: string;
  body: string;
};

export type CommunityLiveSnapshot = {
  generatedAt: string;
  overview: {
    players: number;
    tweets: number;
    propertyLayouts: number;
    propertyProps: number;
    totalCash: number;
    totalBank: number;
  };
  deathSummary: {
    total: number;
    damageEvents: number;
    latestAt: string | null;
    categories: CommunityDeathCategory[];
    topVictims: Array<{ steamId: string; name: string; count: number }>;
    topCauses: Array<{ cause: string; count: number }>;
  };
  recentFatal: {
    id: string;
    victimName: string;
    cause: string;
    timestamp: string;
  } | null;
};

type LiveHighlight = {
  categoryKey?: string;
  totalDelta: number;
  damageDelta: number;
  recentFatal?: CommunityLiveSnapshot['recentFatal'];
} | null;

const deathQuipsByCategory: Record<string, string[]> = {
  dehydration: [
    'Water bottles remain a strong investment.',
    'A quick drink would have changed the whole arc.',
    'The city has fountains. Citizens have priorities.',
    'Hydration is still the cheapest insurance policy.',
    'Somebody ignored the thirst meter like it was optional.',
  ],
  hunger: [
    'The snack economy is begging for customers.',
    'A burger would have solved at least one problem here.',
    'Northline restaurants did not get enough foot traffic today.',
    'The fridge was apparently too far away.',
    'This is why pockets should have emergency fries.',
  ],
  firearm: [
    'That conversation escalated into paperwork.',
    'The city heard bangs and the logs took notes.',
    'Some disputes could have used indoor voices.',
    'Gun safety class remains an untapped market.',
    'The streets got dramatic again.',
  ],
  fists: [
    'Hands were thrown. Lessons were learned.',
    'A disagreement reached the windmill-arms phase.',
    'No fancy equipment, just commitment.',
    'The oldest combat system in the world is still getting use.',
    'Somebody chose the free melee option.',
  ],
  fall: [
    'Penthouse ledges continue to demand respect.',
    'Gravity filed the report before staff could.',
    'Railings are decorative until suddenly they are not.',
    'The sidewalk won that argument.',
    'Northline architecture remains technically walkable.',
  ],
  self: [
    'The logs say self-caused. We will leave it at that.',
    'Curiosity remains a dangerous mechanic.',
    'Some buttons probably deserved a second thought.',
    'The city did not need help with this one.',
    'A small accident became a full entry in the records.',
  ],
  world: [
    'The city itself has entered the chat.',
    'Northline infrastructure remains undefeated today.',
    'Sometimes the map simply has opinions.',
    'The environment caused problems, as environments do.',
    'No suspect. Just vibes and a damage log.',
  ],
  other: [
    'The logs shrugged, so we are shrugging too.',
    'Mystery damage keeps the spreadsheet interesting.',
    'Something happened. The city is being vague about it.',
    'The details are fuzzy, but the result was not.',
    'One for the “ask around later” pile.',
  ],
};

function topDeathHeadline(category: CommunityDeathCategory | undefined) {
  if (!category || category.count <= 0) return 'No fatal damage has been recorded yet.';
  switch (category.key) {
    case 'dehydration': return 'Thirst is causing the most trouble right now.';
    case 'hunger': return 'Hunger is doing more damage than it should.';
    case 'firearm': return 'Gunfights are moving the numbers today.';
    case 'fists': return 'Hands-only chaos is surprisingly active.';
    case 'fall': return 'Fall damage is leading the paperwork.';
    case 'self': return 'Accidents are taking the lead for now.';
    case 'world': return 'The city itself is causing the most trouble.';
    default: return 'Mystery damage is carrying the chaos chart.';
  }
}

function deathQuipFor(category: CommunityDeathCategory | undefined, seed: number) {
  const key = category?.key ?? 'other';
  const pool = deathQuipsByCategory[key] ?? deathQuipsByCategory.other;
  return pool[Math.abs(seed) % pool.length];
}

const moneyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat('en-US');

function compactMoney(value: number) {
  if (!Number.isFinite(value)) return '$0';
  return moneyFormatter.format(value);
}

function formatDateDistance(value: string | null) {
  if (!value) return 'No recent timestamp';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (!Number.isFinite(diff)) return 'Unknown time';
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m ago`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))}h ago`;
  return `${Math.max(1, Math.floor(diff / day))}d ago`;
}

function topDeathLabel(total: number) {
  if (total <= 0) return 'Nobody has died yet. Suspiciously peaceful.';
  if (total === 1) return 'Only one documented death so far. The city remembers.';
  return `${numberFormatter.format(total)} documented ways Northline citizens learned consequences.`;
}

function useAnimatedNumber(value: number, durationMs = 760) {
  const [displayValue, setDisplayValue] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    const to = value;
    previous.current = value;
    if (from === to) {
      setDisplayValue(to);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(from + (to - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [durationMs, value]);

  return displayValue;
}

function CountUp({ value, className }: { value: number; className?: string }) {
  const animated = useAnimatedNumber(value);
  return <strong className={className}>{numberFormatter.format(animated)}</strong>;
}

function StatCard({
  icon,
  label,
  value,
  body,
  href,
  highlight,
}: {
  icon: string;
  label: string;
  value: number | string;
  body: string;
  href?: string;
  highlight?: boolean;
}) {
  const content = (
    <>
      <i className={icon} aria-hidden="true" />
      <span>{label}</span>
      {typeof value === 'number' ? <CountUp value={value} /> : <strong>{value}</strong>}
      <small>{body}</small>
    </>
  );

  return href ? (
    <Link className={`community-stat-card animated-stat-card ${highlight ? 'is-live' : ''}`} href={href}>{content}</Link>
  ) : (
    <article className={`community-stat-card animated-stat-card ${highlight ? 'is-live' : ''}`}>{content}</article>
  );
}

async function fetchSnapshot(signal?: AbortSignal) {
  const response = await fetch('/api/community/snapshot', {
    cache: 'no-store',
    credentials: 'same-origin',
    signal,
  });
  if (!response.ok) throw new Error('Could not fetch community snapshot');
  return response.json() as Promise<CommunityLiveSnapshot>;
}

function findChangedCategory(previous: CommunityLiveSnapshot, next: CommunityLiveSnapshot) {
  for (const category of next.deathSummary.categories) {
    const oldCount = previous.deathSummary.categories.find((item) => item.key === category.key)?.count ?? 0;
    if (category.count > oldCount) return category.key;
  }
  return undefined;
}

export function CommunityHomeLiveStats({
  initialSnapshot,
  signedIn,
  featureVisibility = {},
}: {
  initialSnapshot: CommunityLiveSnapshot;
  signedIn: boolean;
  featureVisibility?: { players?: boolean; guides?: boolean; status?: boolean; tweeter?: boolean };
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [highlight, setHighlight] = useState<LiveHighlight>(null);
  const [pollState, setPollState] = useState<'idle' | 'checking' | 'updated' | 'quiet' | 'error'>('idle');
  const [quipTick, setQuipTick] = useState(0);
  const previousSnapshot = useRef(initialSnapshot);

  useEffect(() => {
    let isMounted = true;
    const refresh = async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6500);
      setPollState('checking');
      try {
        const next = await fetchSnapshot(controller.signal);
        if (!isMounted) return;
        const previous = previousSnapshot.current;
        const totalDelta = next.deathSummary.total - previous.deathSummary.total;
        const damageDelta = next.deathSummary.damageEvents - previous.deathSummary.damageEvents;
        const categoryKey = totalDelta > 0 ? findChangedCategory(previous, next) : undefined;
        const recentFatalChanged = next.recentFatal?.id && next.recentFatal.id !== previous.recentFatal?.id;

        setSnapshot(next);
        previousSnapshot.current = next;

        if (totalDelta > 0 || damageDelta > 0 || recentFatalChanged) {
          setHighlight({ categoryKey, totalDelta: Math.max(0, totalDelta), damageDelta: Math.max(0, damageDelta), recentFatal: next.recentFatal });
          setPollState('updated');
          window.setTimeout(() => { if (isMounted) setHighlight(null); }, 9000);
        } else {
          setPollState('quiet');
          window.setTimeout(() => { if (isMounted) setPollState('idle'); }, 2000);
        }
      } catch {
        if (isMounted) setPollState('error');
      } finally {
        window.clearTimeout(timeout);
      }
    };

    const interval = window.setInterval(refresh, 20_000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setQuipTick((value) => value + 1), 11_000);
    return () => window.clearInterval(interval);
  }, []);

  const playersVisible = featureVisibility.players ?? true;
  const guidesVisible = featureVisibility.guides ?? true;
  const statusVisible = featureVisibility.status ?? true;
  const tweeterVisible = featureVisibility.tweeter ?? true;
  const topDeath = snapshot.deathSummary.categories.find((category) => category.count > 0) ?? snapshot.deathSummary.categories[0];
  const topVictim = snapshot.deathSummary.topVictims[0];
  const topCause = snapshot.deathSummary.topCauses[0];
  const cityFunds = snapshot.overview.totalCash + snapshot.overview.totalBank;

  const leadDeathLine = topDeathHeadline(topDeath);
  const rotatingQuip = useMemo(() => deathQuipFor(topDeath, snapshot.deathSummary.total + snapshot.deathSummary.damageEvents + quipTick), [quipTick, snapshot.deathSummary.damageEvents, snapshot.deathSummary.total, topDeath]);

  return (
    <>
      <section className="community-stat-strip live-stat-strip" aria-label="Northline city stats">
        <StatCard icon="fa-solid fa-users" label="Unique citizens" value={snapshot.overview.players} body="Saved characters known by the city." href={playersVisible ? '/players' : undefined} />
        <StatCard icon="fa-solid fa-skull-crossbones" label="Total deaths" value={snapshot.deathSummary.total} body={topDeathLabel(snapshot.deathSummary.total)} highlight={Boolean(highlight?.totalDelta)} />
        <StatCard icon="fa-solid fa-heart-crack" label="Damage events" value={snapshot.deathSummary.damageEvents} body="Every bonk, fall, shot, and bad life choice we could read." highlight={Boolean(highlight?.damageDelta)} />
        {tweeterVisible ? <StatCard icon="fa-brands fa-twitter" label="Tweeter posts" value={snapshot.overview.tweets} body="The in-city social feed, mirrored to the web." href="/tweeter" /> : null}
        <StatCard icon="fa-solid fa-couch" label="Saved layouts" value={snapshot.overview.propertyLayouts} body={`${numberFormatter.format(snapshot.overview.propertyProps)} props placed across saved homes and businesses.`} />
        <StatCard icon="fa-solid fa-wallet" label="City funds" value={compactMoney(cityFunds)} body="Aggregate cash and bank value from saved characters." />
      </section>

      <section className="community-main-grid">
        <article className={`community-card death-board live-death-board ${highlight?.totalDelta ? 'has-new-chaos' : ''}`}>
          <div className="community-section-heading death-heading-row">
            <div>
              <span className="community-kicker">City chaos report</span>
              <h2>How are people dying?</h2>
              <p>{leadDeathLine}</p>
            </div>
            <div className={`live-feed-pill ${pollState}`} aria-live="polite">
              <i className={pollState === 'checking' ? 'fa-solid fa-rotate spinning' : pollState === 'updated' ? 'fa-solid fa-bolt' : pollState === 'error' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-satellite-dish'} aria-hidden="true" />
              {pollState === 'checking' ? 'Checking city files' : pollState === 'updated' ? 'Fresh chaos' : pollState === 'error' ? 'Sync paused' : 'Live-ish'}
            </div>
          </div>

          {highlight?.totalDelta ? (
            <div className="new-chaos-banner">
              <i className="fa-solid fa-bell" aria-hidden="true" />
              <div>
                <strong>Fresh chaos detected</strong>
                <span>
                  +{highlight.totalDelta} death{highlight.totalDelta === 1 ? '' : 's'} since you opened the page
                  {highlight.recentFatal ? ` · ${highlight.recentFatal.victimName} met ${highlight.recentFatal.cause}` : ''}
                </span>
              </div>
            </div>
          ) : (
            <div className="community-quip-ticker"><i className="fa-solid fa-comment-dots" aria-hidden="true" /><div><strong>{leadDeathLine}</strong><span>{rotatingQuip}</span></div></div>
          )}

          <div className="death-grid">
            {snapshot.deathSummary.categories.slice(0, 6).map((category) => (
              <div className={`death-tile interactive-death-tile ${category.count > 0 ? 'has-count' : ''} ${highlight?.categoryKey === category.key ? 'just-changed' : ''}`} key={category.key}>
                <i className={category.icon} aria-hidden="true" />
                <CountUp value={category.count} />
                <span>{category.label}</span>
                <small>{category.body}</small>
              </div>
            ))}
          </div>

          <div className="community-mini-list death-notes live-death-notes">
            {topVictim ? <div><span>Most unlucky lately</span><strong>{topVictim.name}</strong><small>{topVictim.count} recorded death{topVictim.count === 1 ? '' : 's'}</small></div> : null}
            {snapshot.recentFatal ? <div className={highlight?.recentFatal ? 'note-highlight' : ''}><span>Latest fatal event</span><strong>{snapshot.recentFatal.cause || 'Unknown'}</strong><small>{snapshot.recentFatal.victimName || 'Someone'} · {formatDateDistance(snapshot.recentFatal.timestamp)}</small></div> : null}
            {topCause ? <div><span>Top raw cause</span><strong>{topCause.cause}</strong><small>{topCause.count} event{topCause.count === 1 ? '' : 's'}</small></div> : null}
          </div>
        </article>

        <aside className="community-card community-now-card animated-action-card">
          <div className="community-section-heading compact">
            <span className="community-kicker">What to do first</span>
            <h2>Pick your next stop</h2>
          </div>
          <div className="community-action-list playful-action-list">
            {signedIn ? (<Link href="/dashboard"><i className="fa-solid fa-id-card" aria-hidden="true" /><strong>Open dashboard</strong><span>Privacy, character, profile, and theme controls.</span></Link>) : (<a href="/api/auth/steam?returnTo=/dashboard"><i className="fa-solid fa-id-card" aria-hidden="true" /><strong>Link Steam</strong><span>Unlock your character dashboard and profile settings.</span></a>)}
            {guidesVisible ? <Link href="/guides"><i className="fa-solid fa-book-open-reader" aria-hidden="true" /><strong>Read the starter guides</strong><span>Rules, economy, properties, and the basics.</span></Link> : null}
            {statusVisible ? <Link href="/status"><i className="fa-solid fa-signal" aria-hidden="true" /><strong>Check city status</strong><span>Server availability without server-room nonsense.</span></Link> : null}
            {tweeterVisible ? <Link href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /><strong>Open Tweeter</strong><span>Posts, threads, profiles, and website-safe likes.</span></Link> : null}
          </div>
        </aside>
      </section>
    </>
  );
}
