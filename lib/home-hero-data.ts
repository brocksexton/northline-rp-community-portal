import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export type HomeHeroTimeSlot = 'all' | 'late_night' | 'morning' | 'afternoon' | 'evening' | 'winter' | 'halloween' | 'new_year';

export type HomeHeroMessage = {
  id: string;
  enabled: boolean;
  label: string;
  icon: string;
  className: string;
  greeting: string;
  guestTitle: string;
  signedTitle: string;
  body: string;
  scene: string;
  timeSlots: HomeHeroTimeSlot[];
  updatedAt?: string | null;
  updatedBy?: string | null;
};

export type HomeHeroSettings = {
  messages: HomeHeroMessage[];
  updatedAt: string | null;
  updatedBy: string | null;
};

export const HOME_HERO_TIME_SLOTS: Array<{ id: HomeHeroTimeSlot; label: string; description: string }> = [
  { id: 'all', label: 'Any time', description: 'Can appear during any normal homepage visit.' },
  { id: 'late_night', label: 'Late night', description: 'Midnight through early morning.' },
  { id: 'morning', label: 'Morning', description: 'Morning hours.' },
  { id: 'afternoon', label: 'Afternoon', description: 'Midday and afternoon hours.' },
  { id: 'evening', label: 'Evening', description: 'Evening and prime-time hours.' },
  { id: 'winter', label: 'Holiday / winter', description: 'Seasonal December holiday window.' },
  { id: 'halloween', label: 'Halloween', description: 'Late October seasonal window.' },
  { id: 'new_year', label: 'New year', description: 'New year seasonal window.' },
];

const FALLBACK_MESSAGES: HomeHeroMessage[] = [
  {
    id: 'afternoon-bright-boards',
    enabled: true,
    label: 'Afternoon around town',
    icon: 'fa-solid fa-sun',
    className: 'home-moment-day',
    greeting: 'Good afternoon',
    guestTitle: 'Northline is open.',
    signedTitle: 'Good afternoon, {name}.',
    body: 'Check server status, browse the boards, catch up with Tweeter, and jump in when you are ready.',
    scene: 'The city is bright, the boards are moving, and there is always something to do.',
    timeSlots: ['afternoon'],
  },
  {
    id: 'afternoon-shops-open',
    enabled: true,
    label: 'Afternoon traffic',
    icon: 'fa-solid fa-store',
    className: 'home-moment-day',
    greeting: 'Good afternoon',
    guestTitle: 'The shops should be waking up.',
    signedTitle: 'The afternoon shift is yours, {name}.',
    body: 'Check the live status, skim the latest posts, and see whether the city needs another business owner, courier, medic, or troublemaker.',
    scene: 'Storefronts are open, phones are buzzing, and someone is probably already late to a delivery.',
    timeSlots: ['afternoon'],
  },
  {
    id: 'afternoon-civic-pulse',
    enabled: true,
    label: 'City pulse',
    icon: 'fa-solid fa-signal',
    className: 'home-moment-day',
    greeting: 'Good afternoon',
    guestTitle: 'Check the pulse before you clock in.',
    signedTitle: 'Check the city pulse, {name}.',
    body: 'Server status, guides, boards, and Tweeter are all here before you decide what kind of scene you want to start.',
    scene: 'The city is settled enough to plan, but never settled enough to stay predictable.',
    timeSlots: ['afternoon'],
  },
  {
    id: 'morning-first-posts',
    enabled: true,
    label: 'Morning board',
    icon: 'fa-solid fa-mug-hot',
    className: 'home-moment-morning',
    greeting: 'Good morning',
    guestTitle: 'Morning in Northline.',
    signedTitle: 'Good morning, {name}.',
    body: 'Check the pulse of the city, see what changed overnight, and get ready for the day.',
    scene: 'Coffee is on, the city is waking up, and someone already posted something questionable.',
    timeSlots: ['morning'],
  },
  {
    id: 'morning-clean-start',
    enabled: true,
    label: 'Clean start',
    icon: 'fa-solid fa-cloud-sun',
    className: 'home-moment-morning',
    greeting: 'Morning check-in',
    guestTitle: 'A fresh day in the city.',
    signedTitle: 'Fresh start, {name}.',
    body: 'Peek at the server, read the latest notices, and line up your next trip into Northline.',
    scene: 'The sidewalks are quiet, the phones are charging, and today still has room to go sideways.',
    timeSlots: ['morning'],
  },
  {
    id: 'evening-night-shift',
    enabled: true,
    label: 'Evening in Northline',
    icon: 'fa-solid fa-city',
    className: 'home-moment-evening',
    greeting: 'Good evening',
    guestTitle: 'Settle in for the night.',
    signedTitle: 'Good evening, {name}.',
    body: 'See who is online, catch the latest chatter, and decide where tonight starts.',
    scene: 'The streetlights are on, the city is louder, and the night shift is clocking in.',
    timeSlots: ['evening'],
  },
  {
    id: 'evening-prime-time',
    enabled: true,
    label: 'Prime time',
    icon: 'fa-solid fa-tower-broadcast',
    className: 'home-moment-evening',
    greeting: 'Good evening',
    guestTitle: 'The city is getting loud.',
    signedTitle: 'Prime time, {name}.',
    body: 'This is a good time to check the feed, rally a group, start a business scene, or see who needs backup.',
    scene: 'Radios are busy, Tweeter is moving, and somebody is about to make a poor financial decision.',
    timeSlots: ['evening'],
  },
  {
    id: 'late-night-neon',
    enabled: true,
    label: 'Late night',
    icon: 'fa-solid fa-moon',
    className: 'home-moment-late-night',
    greeting: 'Late night check-in',
    guestTitle: 'Northline after dark.',
    signedTitle: 'Still awake, {name}?',
    body: 'See who is around, skim the latest posts, and decide whether tonight needs one more story.',
    scene: 'Neon signs, quiet roads, and the kind of decisions that happen after midnight.',
    timeSlots: ['late_night'],
  },
  {
    id: 'late-night-low-volume',
    enabled: true,
    label: 'After hours',
    icon: 'fa-solid fa-lightbulb',
    className: 'home-moment-late-night',
    greeting: 'After hours',
    guestTitle: 'The city is quieter, not empty.',
    signedTitle: 'After hours, {name}.',
    body: 'Check the status, see who is awake, and keep the next scene small, strange, or suspiciously calm.',
    scene: 'A few lights are still on, and that usually means somebody is planning something.',
    timeSlots: ['late_night'],
  },
  {
    id: 'winter-come-inside',
    enabled: true,
    label: 'Holiday season',
    icon: 'fa-solid fa-snowflake',
    className: 'home-moment-winter',
    greeting: 'Happy holidays',
    guestTitle: 'Come in from the cold.',
    signedTitle: 'Welcome home, {name}.',
    body: 'Check the server, catch up with the city, and see who is around before you head back into Northline.',
    scene: 'The lights are on, the streets are frosty, and the tavern is pretending it has heat.',
    timeSlots: ['winter'],
  },
  {
    id: 'halloween-weird-alley',
    enabled: true,
    label: 'Spooky season',
    icon: 'fa-solid fa-ghost',
    className: 'home-moment-halloween',
    greeting: 'Good evening',
    guestTitle: 'The city is up to something.',
    signedTitle: 'Good evening, {name}.',
    body: 'Drop in, check the chatter, and keep an eye on the weird stuff happening around town.',
    scene: 'Something is rattling in the alley. It is probably fine. Probably.',
    timeSlots: ['halloween'],
  },
  {
    id: 'new-year-fresh-excuse',
    enabled: true,
    label: 'New year in Northline',
    icon: 'fa-solid fa-champagne-glasses',
    className: 'home-moment-new-year',
    greeting: 'Happy new year',
    guestTitle: 'New year, same city energy.',
    signedTitle: 'Happy new year, {name}.',
    body: 'The board is open, the streets are waiting, and everyone gets a fresh excuse to make a story tonight.',
    scene: 'Lanterns are still up and the city feels a little louder than usual.',
    timeSlots: ['new_year'],
  },
  {
    id: 'all-purpose-get-settled',
    enabled: true,
    label: 'Welcome back',
    icon: 'fa-solid fa-house-chimney-user',
    className: 'home-moment-day',
    greeting: 'Welcome back',
    guestTitle: 'Get settled before you join.',
    signedTitle: 'Get settled, {name}.',
    body: 'Use the portal to check the server, open guides, browse Tweeter, and see what has been happening around the city.',
    scene: 'Everything you need before loading in is a click or two away.',
    timeSlots: ['all'],
  },
];

function dataDir() {
  return process.env.NORTHLINE_DATA_PATH?.trim() || path.join(process.cwd(), '.northline-data');
}

function settingsPath() {
  return path.join(dataDir(), 'home-hero-messages.json');
}

async function ensureDir() {
  await mkdir(dataDir(), { recursive: true });
}

function makeId() {
  return `hero_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isSlot(value: unknown): value is HomeHeroTimeSlot {
  return HOME_HERO_TIME_SLOTS.some((slot) => slot.id === value);
}

function cleanText(value: unknown, fallback: string, max = 500) {
  const text = typeof value === 'string' ? value.trim() : '';
  return (text || fallback).slice(0, max);
}

function defaultSettings(): HomeHeroSettings {
  return {
    messages: FALLBACK_MESSAGES.map((message) => ({ ...message })),
    updatedAt: null,
    updatedBy: null,
  };
}

export function getCurrentHomeHeroSlots(now: Date): HomeHeroTimeSlot[] {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const slots: HomeHeroTimeSlot[] = ['all'];

  if ((month === 12 && day >= 30) || (month === 1 && day <= 2)) slots.push('new_year');
  if (month === 12 && day >= 15) slots.push('winter');
  if (month === 10 && day >= 20) slots.push('halloween');

  if (hour < 5) slots.push('late_night');
  else if (hour < 12) slots.push('morning');
  else if (hour < 18) slots.push('afternoon');
  else slots.push('evening');

  return slots;
}

export function normalizeHomeHeroSettings(input: unknown): HomeHeroSettings {
  const raw = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const messagesRaw = Array.isArray(raw.messages) ? raw.messages : [];
  const fallbackById = new Map(FALLBACK_MESSAGES.map((message) => [message.id, message]));
  const normalized: HomeHeroMessage[] = [];

  for (const item of messagesRaw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const fallback = fallbackById.get(String(record.id)) ?? FALLBACK_MESSAGES[0];
    const slots = Array.isArray(record.timeSlots) ? record.timeSlots.filter(isSlot) : [];
    normalized.push({
      id: cleanText(record.id, makeId(), 80),
      enabled: record.enabled !== false,
      label: cleanText(record.label, fallback.label, 80),
      icon: cleanText(record.icon, fallback.icon, 80),
      className: cleanText(record.className, fallback.className, 80),
      greeting: cleanText(record.greeting, fallback.greeting, 100),
      guestTitle: cleanText(record.guestTitle, fallback.guestTitle, 140),
      signedTitle: cleanText(record.signedTitle, fallback.signedTitle, 140),
      body: cleanText(record.body, fallback.body, 360),
      scene: cleanText(record.scene, fallback.scene, 280),
      timeSlots: slots.length ? slots : ['all'],
      updatedAt: record.updatedAt ? String(record.updatedAt) : null,
      updatedBy: record.updatedBy ? String(record.updatedBy) : null,
    });
  }

  return {
    messages: normalized.length ? normalized : defaultSettings().messages,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : null,
    updatedBy: raw.updatedBy ? String(raw.updatedBy) : null,
  };
}

export async function getHomeHeroSettings(): Promise<HomeHeroSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return normalizeHomeHeroSettings(JSON.parse(raw));
  } catch {
    return defaultSettings();
  }
}

export async function saveHomeHeroSettings(input: unknown, updatedBy: string): Promise<HomeHeroSettings> {
  const now = new Date().toISOString();
  const normalized = normalizeHomeHeroSettings(input);
  const settings: HomeHeroSettings = {
    messages: normalized.messages.map((message) => ({ ...message, updatedAt: now, updatedBy })),
    updatedAt: now,
    updatedBy,
  };
  await ensureDir();
  await writeFile(settingsPath(), JSON.stringify(settings, null, 2), 'utf8');
  return settings;
}

export function getEligibleHomeHeroMessages(settings: HomeHeroSettings, now: Date): HomeHeroMessage[] {
  const slots = new Set(getCurrentHomeHeroSlots(now));
  return settings.messages.filter((message) => message.enabled && message.timeSlots.some((slot) => slots.has(slot)));
}

export function selectHomeHeroMessage(settings: HomeHeroSettings, now: Date): HomeHeroMessage {
  const eligible = getEligibleHomeHeroMessages(settings, now);
  const pool = eligible.length ? eligible : FALLBACK_MESSAGES.filter((message) => message.enabled && message.timeSlots.some((slot) => getCurrentHomeHeroSlots(now).includes(slot))) || FALLBACK_MESSAGES;
  const safePool = pool.length ? pool : FALLBACK_MESSAGES;
  return safePool[Math.floor(Math.random() * safePool.length)] ?? FALLBACK_MESSAGES[0];
}

export function renderSignedHeroTitle(template: string, name: string) {
  return template.replace(/\{name\}/gi, name);
}
