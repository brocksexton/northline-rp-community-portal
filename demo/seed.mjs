#!/usr/bin/env node
// Generates a fictional Northline RP city for local demos and screenshots.
//
//   node demo/seed.mjs            -> writes demo/.runtime/aperp and demo/.runtime/northline-data
//
// Every timestamp is relative to "now", so re-run it before taking screenshots.
// All people are made up. SteamIDs use 7656119000000xxxx, which sits below the
// real Steam individual-account range, so none of them resolve to a real user.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEMO_DIR = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME = path.join(DEMO_DIR, '.runtime');
const APE = path.join(RUNTIME, 'aperp');
const WEB = path.join(RUNTIME, 'northline-data');

const NOW = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ZERO_GUID = '00000000-0000-0000-0000-000000000000';

// Small deterministic PRNG so the city looks the same on every run.
let seed = 0x5eed1234;
function rand() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (min, max) => Math.round(min + rand() * (max - min));
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();
const unix = (msAgo) => Math.floor((NOW - msAgo) / 1000);
const sid = (n) => `76561190000000${String(n).padStart(3, '0')}`;

function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Plain UTF-8 without a BOM: the site's JSON reader rejects BOM-prefixed files.
  fs.writeFileSync(file, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
const writeJsonl = (file, rows) => write(file, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');

// ---------------------------------------------------------------------------
// Citizens
// ---------------------------------------------------------------------------
const citizens = [
  { n: 1, name: 'Marcus Vale', handle: 'marcusv', role: 'Developer', online: true, joinedDaysAgo: 107, level: 27, cash: 2840, bank: 48250, hours: 114, title: 'title.city_founder', stats: { arrests_made: 41, parcels_delivered: 118, fish_caught: 23 }, bio: 'Keeps the portal running. Still cannot parallel park.', location: 'Harbor District', cover: 'northbound-city-lights', theme: 'clean', color: '#1194f0' },
  { n: 2, name: 'Riley Chen', handle: 'rileyc', role: 'Admin', online: true, joinedDaysAgo: 98, level: 24, cash: 1320, bank: 39100, hours: 96, title: 'title.night_shift', stats: { arrests_made: 12, parcels_delivered: 64, safes_cracked: 3 }, bio: 'Admin team. Ask me about the new property rules.', location: 'Uptown', cover: 'northbound-civic-core', theme: 'noir', color: '#8b5cf6' },
  { n: 3, name: 'Jonah Pike', handle: 'jpike', role: 'Moderator', online: false, joinedDaysAgo: 88, level: 19, cash: 640, bank: 21400, hours: 71, title: 'title.first_responder', stats: { arrests_made: 58, tickets_written: 93 }, bio: 'Moderator and part-time patrol officer.', location: 'Precinct 1', cover: 'northbound-street-shift', theme: 'clean', color: '#0ea5e9' },
  { n: 4, name: 'Ava Brooks', handle: 'avab', role: 'Mayor', online: true, joinedDaysAgo: 89, level: 22, cash: 910, bank: 72400, hours: 74, title: 'title.mayor_of_northline', stats: { speeches_given: 14, laws_passed: 5, parcels_delivered: 22 }, bio: 'Mayor of Northline. Office hours Tuesdays at city hall.', location: 'City Hall', cover: 'northbound-downtown', theme: 'sunset', color: '#f59e0b' },
  { n: 5, name: 'Dex Moreno', handle: 'dexm', role: 'User', online: true, joinedDaysAgo: 41, level: 14, cash: 3120, bank: 9600, hours: 38, title: 'title.courier_pro', stats: { parcels_delivered: 212, fish_caught: 7 }, bio: 'Fastest courier in the city. Tips appreciated.', location: 'Post Office', cover: 'northbound-alley-route', theme: 'arcade', color: '#22c55e' },
  { n: 6, name: 'Priya Nair', handle: 'priyan', role: 'User', online: true, joinedDaysAgo: 37, level: 16, cash: 1780, bank: 15250, hours: 45, title: 'title.night_shift', stats: { fish_caught: 64, parcels_delivered: 31 }, bio: 'Fisher by day, jazz bar regular by night.', location: 'The Docks', cover: 'northbound-shoreline', theme: 'sunset', color: '#ec4899' },
  { n: 7, name: 'Tommy Two-Tone', handle: 'tommy2t', role: 'User', online: false, joinedDaysAgo: 30, level: 8, cash: 150, bank: 820, hours: 19, title: '', stats: { vehicles_wrecked: 11 }, bio: '', location: '', cover: 'northbound-neon-night', theme: 'arcade', color: '#ef4444', privacy: 'private' },
  { n: 8, name: 'Greg Hollis', handle: 'ghollis', role: 'User', online: false, joinedDaysAgo: 60, level: 11, cash: 0, bank: 0, hours: 27, title: '', stats: {}, bio: '', location: '', cover: 'northbound-after-hours', theme: 'noir', color: '#64748b', privacy: 'private' },
  { n: 9, name: 'Sam Ortiz', handle: 'samo', role: 'User', online: true, joinedDaysAgo: 22, level: 9, cash: 460, bank: 5200, hours: 21, title: 'title.rookie', stats: { parcels_delivered: 18, fish_caught: 12 }, bio: 'New in town, learning the ropes.', location: 'Maple Street', cover: 'northbound-street-shift', theme: 'clean', color: '#14b8a6' },
  { n: 10, name: 'Lena Kowal', handle: 'lenak', role: 'User', online: false, joinedDaysAgo: 50, level: 13, cash: 900, bank: 7800, hours: 33, title: '', stats: { safes_cracked: 6 }, bio: '', location: '', cover: 'northbound-alley-route', theme: 'noir', color: '#a855f7', privacy: 'private' },
  { n: 11, name: 'Nina Park', handle: 'ninap', role: 'User', online: true, joinedDaysAgo: 64, level: 18, cash: 2210, bank: 26800, hours: 58, title: 'title.shop_owner', stats: { items_sold: 340, parcels_delivered: 9 }, bio: 'Owner of Park & Co. General Store on Main Street.', location: 'Main Street', cover: 'northbound-downtown', theme: 'clean', color: '#f97316' },
  { n: 15, name: 'Oscar Reyes', handle: 'oscarr', role: 'User', online: true, joinedDaysAgo: 29, level: 12, cash: 1340, bank: 11200, hours: 30, title: 'title.first_responder', stats: { patients_treated: 47 }, bio: 'Paramedic. Please stop jumping off the parking garage.', location: 'Northline General', cover: 'northbound-city-lights', theme: 'clean', color: '#06b6d4' },
  { n: 16, name: 'Harper Quinn', handle: 'harperq', role: 'User', online: true, joinedDaysAgo: 18, level: 10, cash: 2980, bank: 6400, hours: 24, title: 'title.rookie', stats: { fish_caught: 29, songs_played: 15 }, bio: 'Street musician. Requests welcome at the plaza.', location: 'Central Plaza', cover: 'northbound-neon-night', theme: 'arcade', color: '#eab308' },
  { n: 17, name: 'Theo Lambert', handle: 'theol', role: 'User', online: false, joinedDaysAgo: 45, level: 15, cash: 780, bank: 18300, hours: 41, title: 'title.courier_pro', stats: { parcels_delivered: 150 }, bio: 'Retired courier, full-time fisherman.', location: 'Shoreline', cover: 'northbound-shoreline', theme: 'sunset', color: '#3b82f6' },
  { n: 18, name: 'Maya Fields', handle: 'mayaf', role: 'User', online: false, joinedDaysAgo: 33, level: 11, cash: 1650, bank: 9900, hours: 26, title: '', stats: { arrests_made: 4, fish_caught: 18 }, bio: 'Journalist for the Northline Ledger.', location: 'Newsroom', cover: 'northbound-civic-core', theme: 'clean', color: '#10b981' },
  { n: 19, name: 'Kai Morgan', handle: 'kaim', role: 'User', online: false, joinedDaysAgo: 0.8, level: 2, cash: 520, bank: 2500, hours: 3, title: 'title.rookie', stats: { parcels_delivered: 4 }, bio: 'Just moved here!', location: 'Maple Street', cover: 'northbound-downtown', theme: 'clean', color: '#6366f1' },
  { n: 20, name: 'Jules Carter', handle: 'julesc', role: 'User', online: false, joinedDaysAgo: 0.4, level: 1, cash: 500, bank: 2500, hours: 1, title: 'title.rookie', stats: {}, bio: '', location: '', cover: 'northbound-street-shift', theme: 'clean', color: '#84cc16' },
];
const byN = Object.fromEntries(citizens.map((c) => [c.n, c]));

const itemPool = [
  'items/tools/flashlight.prefab', 'items/food/burger.prefab', 'items/drinks/water_bottle.prefab',
  'items/drinks/coffee.prefab', 'items/tools/repair_kit.prefab', 'items/phone/smartphone.prefab',
  'items/fishing/fishing_rod.prefab', 'items/fishing/salmon.prefab', 'items/valuables/gold_watch.prefab',
  'items/clothing/leather_jacket.prefab', 'items/food/sandwich.prefab', 'items/tools/lockpick.prefab',
];
const pick = () => itemPool[Math.floor(rand() * itemPool.length)];
const slots = (count, filled) => Array.from({ length: count }, (_, i) => (i < filled ? { PrefabResourcePath: pick(), StackCount: between(1, 4) } : null));

const saves = citizens.map((c) => ({
  SteamId: sid(c.n),
  LastKnownDisplayName: c.handle,
  RpDisplayName: c.name,
  FirstJoinedUtc: iso(c.joinedDaysAgo * DAY),
  TotalPlaytimeSeconds: Math.round(c.hours * 3600),
  CashBalance: c.cash,
  BankBalance: c.bank,
  Level: c.level,
  TotalExperience: c.level * c.level * 120 + between(0, 900),
  Health: between(70, 100),
  Hunger: between(40, 95),
  Thirst: between(40, 95),
  DisplayTitle: c.title,
  OwnedTitleIds: c.title ? [c.title] : [],
  TrackedStats: { deaths: between(0, 9), ...c.stats },
  HotbarSlots: slots(4, between(1, 3)),
  InventorySlots: [
    ...slots(4, between(1, 3)),
    ...(c.n === 4 ? [{ PrefabResourcePath: 'items/valuables/diamond_ring.prefab', StackCount: 1, HasShopData: true, ShopIsPaidFor: false, ShopIsStolen: true }] : []),
    ...(c.n === 1 || c.n === 4 ? [{ PrefabResourcePath: 'items/storage/duffel_bag.prefab', StackCount: 1, HasContainerData: true, ContainerCash: 450, ContainerSlots: [{ PrefabResourcePath: 'items/tools/repair_kit.prefab', StackCount: 2 }, null] }] : []),
  ],
  EquipmentSlots: [{ PrefabResourcePath: 'items/clothing/leather_jacket.prefab', StackCount: 1 }, null],
  MailboxStorageSlots: c.n % 3 === 0 ? [{ PrefabResourcePath: 'items/valuables/gold_watch.prefab', StackCount: 1, HasShopData: true, ShopIsPaidFor: true }, null] : [null, null],
}));

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------
const roles = [
  { Name: 'User', IsDefault: true, IsProtected: true, Permissions: [], MaxDurations: {} },
  { Name: 'Developer', IsDefault: false, IsProtected: true, Permissions: ['AdminTools', 'ViewLogs', 'ModifyServerSettings'], MaxDurations: {} },
  { Name: 'Admin', IsDefault: false, IsProtected: true, Permissions: ['AdminTools', 'ViewLogs'], MaxDurations: { Ban: 604800 } },
  { Name: 'Moderator', IsDefault: false, IsProtected: false, Permissions: ['ViewLogs'], MaxDurations: { Ban: 259200 } },
  { Name: 'Mayor', IsDefault: false, IsProtected: false, Permissions: [], MaxDurations: {} },
];
const playerRoles = citizens
  .filter((c) => c.role !== 'User')
  .map((c) => ({ SteamId: sid(c.n), RoleName: c.role, AssignedAt: iso((c.joinedDaysAgo - 1) * DAY) }));

// ---------------------------------------------------------------------------
// Connection history: ~70h of sessions with an evening peak, 9 players online now.
// ---------------------------------------------------------------------------
const connections = [];
for (const c of citizens) {
  const firstJoinAgo = c.joinedDaysAgo * DAY;
  let cursor = Math.min(70 * HOUR, firstJoinAgo);
  let first = firstJoinAgo <= 70 * HOUR;
  let lastEndAgo = Infinity;
  const sessionsWanted = c.n === 8 ? 1 : between(3, 6);
  for (let s = 0; s < sessionsWanted && cursor > 2 * HOUR; s += 1) {
    const start = first ? cursor : cursor - between(0, 6) * HOUR;
    const length = between(35, 180) * MIN;
    const end = start - length;
    if (end < 45 * MIN) break;
    const ev = { SteamId: sid(c.n), PlayerName: c.name, FirstJoinedUtc: iso(firstJoinAgo) };
    connections.push({ Timestamp: iso(start), ...ev, IsConnection: true, SessionDurationSeconds: null, IsFirstJoin: first });
    connections.push({ Timestamp: iso(end), ...ev, IsConnection: false, SessionDurationSeconds: Math.round(length / 1000), IsFirstJoin: false });
    first = false;
    lastEndAgo = end;
    cursor = end - between(4, 14) * HOUR;
  }
  if (c.online) {
    const latestMinutes = Math.max(5, Math.min(150, Math.floor(lastEndAgo / MIN) - 5));
    connections.push({ Timestamp: iso(between(4, latestMinutes) * MIN), SteamId: sid(c.n), PlayerName: c.name, IsConnection: true, SessionDurationSeconds: null, IsFirstJoin: false, FirstJoinedUtc: iso(firstJoinAgo) });
  }
}
connections.sort((a, b) => a.Timestamp.localeCompare(b.Timestamp));
const onlineCount = citizens.filter((c) => c.online).length;
const splitAt = NOW - DAY;
const olderConnections = connections.filter((e) => Date.parse(e.Timestamp) < splitAt);
const recentConnections = connections.filter((e) => Date.parse(e.Timestamp) >= splitAt);

// ---------------------------------------------------------------------------
// Tweeter
// ---------------------------------------------------------------------------
let tweetSerial = 0;
const tweetId = () => `demo-tweet-${String(++tweetSerial).padStart(4, '0')}`;
const tweets = [];
function tweet(n, minutesAgo, body, likeCount = 0, extra = {}) {
  const t = {
    Id: tweetId(), AuthorSteamId: sid(n), AuthorDisplayName: byN[n].name, Body: body,
    PostedAtTimeSeconds: unix(minutesAgo * MIN), ReplyToId: ZERO_GUID, RetweetOfId: ZERO_GUID,
    IsReply: false, IsRetweet: false, LikeCount: likeCount, VerifiedKind: 'None', ...extra,
  };
  tweets.push(t);
  return t;
}
const reply = (n, minutesAgo, parent, body, likes = 0) => tweet(n, minutesAgo, body, likes, { ReplyToId: parent.Id, IsReply: true });
const retweet = (n, minutesAgo, original, body = '') => tweet(n, minutesAgo, body, 0, {
  RetweetOfId: original.Id, IsRetweet: true, RetweetOfAuthorSteamId: original.AuthorSteamId,
  RetweetOfAuthorDisplayName: original.AuthorDisplayName, RetweetOfBody: original.Body,
});

const townHall = tweet(4, 42, 'Town hall is open tonight at 8. Bring your questions about the new parking rules downtown. #CityHall #Northline', 24);
reply(1, 38, townHall, 'I will be there. Someone save me a coffee. #CityHall', 6);
reply(11, 33, townHall, 'Can we talk about delivery trucks blocking Main Street? Asking for every shop owner.', 9);
retweet(2, 30, townHall);
const pier = tweet(6, 95, 'Pulled a 9 lb salmon off the east pier at sunrise. The docks are the place to be this week. #Fishing', 17);
reply(17, 88, pier, 'Rookie numbers. Try the rocks past the lighthouse.', 5);
tweet(5, 130, 'Twelve parcels, zero late deliveries, one very angry dog on Maple Street. Courier life. #CourierLife', 21);
tweet(15, 185, 'Friendly reminder from Northline General: the parking garage is not a shortcut. Please take the stairs. #StaySafe', 33);
tweet(16, 240, 'Playing at Central Plaza tonight from 9. Bring requests and good vibes. #LiveMusic', 14);
tweet(3, 300, 'Patrol update: speed checks on Harbor Road all evening. Slow down and nobody gets a ticket. #NorthlinePD', 11);
const election = tweet(4, 420, 'Candidate registration for the mayoral election is open at city hall until Friday. Every citizen can run. #Election #Northline', 29);
retweet(18, 410, election, 'Full candidate guide coming to the Ledger this weekend.');
tweet(11, 520, 'Park & Co. is restocking fishing gear and repair kits today. First ten customers get free coffee. #ShopLocal', 12);
tweet(9, 640, 'Finally passed my driving test after three tries. Watch out Northline. #NewInTown', 18);
tweet(1, 760, 'Portal update: Tweeter profiles now show citizen cards and leaderboards got a refresh. Tell us what you want next. #DevBlog', 26);
tweet(18, 900, 'The Ledger is looking for photographers for the election debate. DM me if you want a press pass. #Election', 8);
tweet(19, 1020, 'Day one in Northline. Already lost my car keys. Loving it. #NewInTown', 15);
tweet(2, 1300, 'Reminder: property layouts are saved per plot. Talk to staff before moving a storefront. #Housing', 7);
tweet(6, 1500, 'Jazz night at the Blue Anchor was unreal. Same time next week? #Nightlife', 10);
tweet(5, 2100, 'Shoutout to whoever left a burger in parcel 42. That is not how deliveries work. #CourierLife', 19);
tweet(15, 2500, 'Blood drive at Northline General this weekend. Free sandwich for every donor. #Community', 13);

const tweetLikes = [];
for (const t of tweets.filter((x) => !x.IsRetweet)) {
  const likers = citizens.filter((c) => c.n !== Number(t.AuthorSteamId.slice(-3)) && rand() < 0.35).slice(0, 6);
  for (const c of likers) tweetLikes.push({ TweetId: t.Id, SteamId: sid(c.n) });
}

// ---------------------------------------------------------------------------
// Chat, moderation and damage logs
// ---------------------------------------------------------------------------
const chat = [
  [4, 'Local', 'Anyone seen the mail truck? It was parked outside city hall a minute ago.', 26],
  [5, 'Local', 'That was me, grabbing parcels. Moving it now!', 25],
  [1, 'OOC', 'Server restart in about an hour for the patch, wrap up your scenes.', 22],
  [11, 'Local', 'Fresh coffee at Park & Co, come get it.', 18],
  [6, 'Local', 'Who wants to go fishing at the east pier?', 15],
  [16, 'Local', 'Playing requests at the plaza in ten minutes.', 12],
  [9, 'OOC', 'How do I apply for the courier job?', 9],
  [2, 'OOC', 'Open your phone, Job Finder app, then pick Courier. The guides page has pictures too.', 8],
  [15, 'Local', 'Ambulance coming through, clear the road please.', 5],
].map(([n, type, message, minutes]) => ({
  Timestamp: iso(minutes * MIN), SenderSteamId: sid(n), SenderName: byN[n].name, Type: type,
  Message: message, TargetSteamId: null, TargetName: null,
}));

const adminLog = (minutesAgo, admin, action, target, details) => ({
  Timestamp: iso(minutesAgo * MIN), AdminSteamId: sid(admin), AdminName: byN[admin].name, ActionType: action,
  Category: 'Moderation', TargetSteamId: sid(target), TargetName: byN[target].name, Details: details,
});
const adminLogs = [
  adminLog(21 * 60, 3, 'Ban', 7, 'Mass RDM at the docks (3d)'),
  adminLog(40, 2, 'Kick', 9, 'Fail RP during a police scene'),
  adminLog(6 * 60, 3, 'Warn', 16, 'Blocking the plaza entrance with a vehicle'),
  adminLog(5 * DAY / MIN, 2, 'Ban', 18, 'Metagaming from stream chat (7d)'),
  adminLog(3 * DAY / MIN, 1, 'Unban', 18, 'Appeal accepted after review'),
  adminLog(9 * DAY / MIN, 3, 'Ban', 17, 'Harassing new players (2d)'),
  adminLog(2 * DAY / MIN, 2, 'Mute', 7, 'Mic spam in the hospital lobby'),
];

const damage = [];
const hit = (minutesAgo, victim, attacker, dmg, before, cause, fatal) => damage.push({
  Timestamp: iso(minutesAgo * MIN), VictimSteamId: sid(victim), VictimName: byN[victim].name,
  AttackerSteamId: attacker ? sid(attacker) : null,
  AttackerName: attacker ? byN[attacker].name : cause === 'Thirst' ? 'Dehydration' : cause === 'Hunger' ? 'Starvation' : cause === 'Fall' ? 'Gravity' : 'World',
  Damage: dmg, HealthBefore: before, HealthAfter: Math.max(0, before - dmg), Cause: cause, IsFatal: fatal,
});
hit(14, 5, 6, 38, 30, 'Pistol', true);
hit(55, 9, null, 5, 5, 'Thirst', true);
hit(95, 16, null, 60, 45, 'Fall', true);
hit(160, 7, 3, 42, 42, 'Rifle', true);
hit(230, 17, 11, 25, 25, 'Fists', true);
hit(300, 19, null, 8, 8, 'Hunger', true);
hit(410, 18, 5, 30, 30, 'Knife', true);
hit(520, 6, 6, 100, 100, 'Fall', true);
hit(700, 10, 2, 35, 35, 'Shotgun', true);
for (let i = 0; i < 14; i += 1) {
  const victim = [1, 2, 4, 5, 6, 9, 11, 15, 16][i % 9];
  hit(between(10, 1400), victim, [3, 5, 6, 11][i % 4], between(5, 30), between(60, 100), ['Fists', 'Pistol', 'Bat'][i % 3], false);
}

const blacklist = [
  { SteamId: sid(8), PlayerName: byN[8].name, Reason: 'Exploiting the ATM duplication bug', AdminSteamId: sid(2), AdminName: byN[2].name, BannedAtUtc: iso(17 * DAY), ExpiresAtUtc: null, IsPermanent: true },
  { SteamId: sid(10), PlayerName: byN[10].name, Reason: 'Combat logging during an arrest', AdminSteamId: sid(3), AdminName: byN[3].name, BannedAtUtc: iso(2 * DAY), ExpiresAtUtc: new Date(NOW + 5 * DAY).toISOString(), IsPermanent: false },
];
const warnings = [
  { SteamId: sid(9), PlayerName: byN[9].name, Reason: 'Mic spam in the hospital lobby', AdminSteamId: sid(3), AdminName: byN[3].name, CreatedAt: iso(3 * DAY) },
  { SteamId: sid(7), PlayerName: byN[7].name, Reason: 'Vehicle ramming near spawn', AdminSteamId: sid(2), AdminName: byN[2].name, CreatedAt: iso(4 * DAY) },
  { SteamId: sid(10), PlayerName: byN[10].name, Reason: 'Ignoring police instructions', AdminSteamId: sid(3), AdminName: byN[3].name, CreatedAt: iso(6 * DAY) },
];
const mutes = [
  { SteamId: sid(7), PlayerName: byN[7].name, Reason: 'Mic spam in the hospital lobby', AdminSteamId: sid(2), AdminName: byN[2].name, CreatedAt: iso(2 * DAY) },
];

// ---------------------------------------------------------------------------
// Properties, phones, guides, server config
// ---------------------------------------------------------------------------
const props = (names) => names.map((name) => ({ PrefabResourcePath: `props/${name}.prefab` }));
const layouts = {
  1: [['Cozy loft', 'Harbor View Apartment 3B', ['furniture/sofa_leather', 'lighting/floor_lamp', 'decor/plant_large', 'furniture/desk', 'electronics/pc']],
      ['Coffee counter', 'Main Street Storefront 2', ['shop/counter_long', 'shop/espresso_machine', 'furniture/stool', 'furniture/stool']]],
  2: [['Penthouse', 'Uptown Tower 12', ['furniture/sofa_modern', 'furniture/bed_king', 'lighting/chandelier', 'decor/art_frame', 'electronics/tv']]],
  4: [['Mayor residence', 'Civic Row House 1', ['furniture/desk_executive', 'decor/flag_city', 'furniture/bookshelf', 'lighting/desk_lamp']],
      ['Campaign office', 'Main Street Storefront 5', ['furniture/table_long', 'decor/poster_campaign', 'furniture/chair_office', 'furniture/chair_office']]],
  5: [['Garage', 'Maple Street Garage 4', ['tools/workbench', 'tools/tool_rack', 'storage/crate']]],
  6: [['Bait shop', 'East Pier Shack', ['shop/counter_small', 'fishing/rod_rack', 'storage/cooler', 'decor/net']]],
  11: [['Park & Co. General Store', 'Main Street Storefront 1', ['shop/counter_long', 'shop/shelf', 'shop/shelf', 'shop/shelf', 'shop/register', 'lighting/neon_sign']],
       ['Studio apartment', 'Maple Street Apartment 2A', ['furniture/bed_single', 'furniture/sofa_small']]],
  15: [['Break room', 'Northline General Staff Room', ['furniture/sofa_small', 'electronics/coffee_machine']]],
  17: [['Lake cabin', 'Shoreline Cabin 7', ['furniture/bed_double', 'decor/fish_trophy', 'lighting/lantern']]],
};

const guideIds = ['first_join', 'shop', 'properties', 'police_officer', 'chief_of_police', 'mayor'];
const seenGuides = Object.fromEntries(citizens.map((c) => [sid(c.n), guideIds.slice(0, Math.max(1, Math.min(6, Math.round(c.level / 4))))]));

const serverConfig = {
  ServerName: 'Northline RP', ServerSubtitle: 'Northbound RP on s&box', StartingMap: 'northbound_city',
  MaxPlayers: 64, TaxRate: 0.08, StartingCash: 500, StartingBank: 2500, SalaryIntervalSeconds: 900,
  RentIntervalSeconds: 3600, MaxMessageLength: 280, PropertyTaxRate: 0.02, PublicMailboxStorageSlotCount: 12,
  ItemPriceOverrides: { 'items/valuables/gold_watch.prefab': 1200, burger: 25, 'Water Bottle': 8, duffel_bag: 150, diamond_ring: 2400 },
};

const consoleLines = [
  [95, 'Server started: Northline RP (northbound_city)'],
  [80, `Player connected: ${byN[1].name} (${sid(1)})`],
  [61, '[warn] Slow frame: 48ms in PropertyManager.Tick'],
  [44, `Player connected: ${byN[4].name} (${sid(4)})`],
  [40, `> kick ${sid(9)} "Fail RP during a police scene"`],
  [39, `Player disconnected: ${byN[9].name} (${sid(9)})`],
  [30, `Player connected: ${byN[9].name} (${sid(9)})`],
  [22, '> say Restart soon for the patch'],
  [12, 'Autosave complete: 20 players, 12 properties'],
  [3, `Player connected: ${byN[16].name} (${sid(16)})`],
].map(([minutes, text]) => {
  const d = new Date(NOW - minutes * MIN);
  return `[${d.toISOString().slice(0, 19).replace('T', ' ')}] ${text}`;
}).join('\n') + '\n';

// ---------------------------------------------------------------------------
// Website-owned data
// ---------------------------------------------------------------------------
const profiles = Object.fromEntries(citizens.filter((c) => c.n <= 18).map((c) => [sid(c.n), {
  steamId: sid(c.n), privacy: c.privacy || 'public', bio: c.bio, location: c.location, websiteUrl: '', customAvatarUrl: '',
  bannerColor: c.color, coverPreset: c.cover, customCoverUrl: '', profileTheme: c.theme,
  showcase: { economy: true, inventory: c.n !== 4, stats: true, properties: true, activity: true },
  tweeterTheme: 'modern', tweeterMode: 'dark', websiteStyle: 'civic', updatedAt: iso(between(1, 9) * DAY),
}]));

const metricSamples = Array.from({ length: 48 }, (_, i) => {
  const ago = (47 - i) * 30 * MIN;
  const wave = Math.sin((i / 48) * Math.PI * 2);
  const ramUsed = Math.round(11800 + wave * 900 + between(-150, 150));
  return {
    capturedAt: iso(ago), cpuPercent: Math.round(26 + wave * 12 + between(-4, 4)), ramUsedMb: ramUsed, ramTotalMb: 32768,
    ramPercent: Math.round((ramUsed / 32768) * 100), diskUsedGb: 412.4 + i * 0.01, diskTotalGb: 953.9, diskPercent: 43,
    latencyMs: between(14, 28), networkRxKbps: null, networkTxKbps: null, processRamMb: between(300, 340),
    webUptimeSeconds: 86_400 + i * 1800, hostUptimeSeconds: 604_800 + i * 1800, requestCount: 1400 + i * 9,
  };
});

const communityStore = {
  profiles,
  statusUpdates: [
    { id: 'status-demo-0001', title: 'Patch notes are live', body: 'Fishing payouts were rebalanced and the courier timer now pauses while you are in a menu.', tone: 'info', createdAt: iso(4 * HOUR), createdBySteamId: sid(1), createdByName: byN[1].name },
    { id: 'status-demo-0002', title: 'Election night Friday', body: 'Mayoral debate at city hall, 8 PM server time. Candidates, bring your posters.', tone: 'event', accentColor: '#f59e0b', createdAt: iso(26 * HOUR), createdBySteamId: sid(2), createdByName: byN[2].name },
    { id: 'status-demo-0003', title: 'Short restart tonight', body: 'Expect a five minute restart around midnight while we apply the patch.', tone: 'maintenance', createdAt: iso(2 * HOUR), createdBySteamId: sid(1), createdByName: byN[1].name },
  ],
  metricSamples,
  requestCount: 1400 + 48 * 9,
  tweeterLikes: { [townHall.Id]: [sid(5), sid(6), sid(9)] },
};

const socialStore = {
  version: 1,
  follows: [
    [4, 1], [1, 4], [5, 4], [6, 4], [9, 4], [11, 4], [15, 4], [16, 6], [6, 16], [2, 1], [3, 1], [17, 6], [18, 4], [4, 18],
  ].map(([from, to], i) => ({ fromSteamId: sid(from), toSteamId: sid(to), createdAt: iso((20 - i) * DAY / 2) })),
  messages: [
    { id: 'dm_demo_0001', fromSteamId: sid(4), toSteamId: sid(1), body: 'Can you pin the debate notice on the status page?', createdAt: iso(110 * MIN) },
    { id: 'dm_demo_0002', fromSteamId: sid(1), toSteamId: sid(4), body: 'Done. It is on the homepage noticeboard too.', createdAt: iso(104 * MIN) },
    { id: 'dm_demo_0003', fromSteamId: sid(4), toSteamId: sid(1), body: 'Perfect, thank you! See you at town hall.', createdAt: iso(100 * MIN) },
    { id: 'dm_demo_0004', fromSteamId: sid(11), toSteamId: sid(1), body: 'Any chance we get a shop directory page on the portal?', createdAt: iso(50 * MIN) },
  ],
  reads: { [sid(1)]: { [sid(4)]: iso(102 * MIN) } },
  bookmarks: [
    { steamId: sid(1), tweetId: townHall.Id, createdAt: iso(35 * MIN) },
    { steamId: sid(4), tweetId: pier.Id, createdAt: iso(80 * MIN) },
  ],
};

const author = (n) => ({ steamId: sid(n), displayName: byN[n].name, avatarUrl: null, badgeKind: byN[n].role === 'User' ? 'None' : byN[n].role });
const forumThreads = [
  ['thread_demo0001', 'Welcome to the Northline forum', 'announcements', 'announcement', true, 1, 5 * DAY, [
    [1, 'Introduce yourself, share your character, and tell us what brought you to the city. Staff read every thread here.', 5 * DAY],
    [4, 'Ava Brooks, running for re-election. Come to the debate Friday!', 3 * HOUR],
    [9, 'Sam here, three weeks in and already hooked. The courier guide on the portal saved me.', 2 * HOUR],
  ]],
  ['thread_demo0002', 'Best spots to fish near the docks?', 'general', 'discussion', false, 5, 9 * HOUR, [
    [5, 'The pier is always crowded. Where is everyone catching the big ones?', 9 * HOUR],
    [6, 'East pier at sunrise. Bring the good bait from Park & Co.', 8 * HOUR],
    [17, 'Rocks past the lighthouse. You did not hear it from me.', 7 * HOUR],
  ]],
  ['thread_demo0003', 'Suggestion: shop directory on the portal', 'general', 'discussion', false, 11, 28 * HOUR, [
    [11, 'It would help new players find stores. A simple list with owners and hours would be great.', 28 * HOUR],
    [2, 'Good idea. Adding it to the roadmap discussion for next week.', 20 * HOUR],
  ]],
  ['thread_demo0004', 'Cannot open my property panel after quitting a job', 'support', 'discussion', false, 16, 2 * DAY, [
    [16, 'After I quit my courier job the property panel shows a warning and will not open.', 2 * DAY],
    [3, 'That warning is expected. Rejoin a job or wait for the next paycheck cycle; the guides page covers it under Core basics.', 40 * HOUR],
  ]],
  ['thread_demo0005', 'Election debate schedule', 'announcements', 'announcement', false, 4, 30 * HOUR, [
    [4, 'Debate starts 8 PM Friday at city hall. Each candidate gets three minutes, then open questions.', 30 * HOUR],
  ]],
];
const forum = {
  threads: forumThreads.map(([id, title, categoryId, kind, pinned, n, createdAgo, posts]) => ({
    id, title, excerpt: posts[0][1].slice(0, 120), categoryId, kind, status: 'open', pinned, author: author(n), source: 'website',
    discordThreadId: null, discordStarterMessageId: null, postCount: posts.length,
    lastActivityAt: iso(posts[posts.length - 1][2]), createdAt: iso(createdAgo), updatedAt: iso(posts[posts.length - 1][2]),
  })),
  posts: forumThreads.flatMap(([threadId, , , , , , , posts]) => posts.map(([n, body, ago], i) => ({
    id: `${threadId.replace('thread', 'post')}_${i + 1}`, threadId, body, author: author(n), source: 'website',
    discordMessageId: null, createdAt: iso(ago), updatedAt: iso(ago), hidden: false,
  }))),
  discordLinks: [
    { steamId: sid(1), discordUserId: '100000000000000001', discordUsername: 'marcusvale', linkedAt: iso(8 * DAY) },
    { steamId: sid(4), discordUserId: '100000000000000004', discordUsername: 'mayor.ava', linkedAt: iso(7 * DAY) },
  ],
  linkCodes: [],
  reactions: [
    ['post_demo0001_1', 4, '🙌'], ['post_demo0001_1', 5, '🙌'], ['post_demo0001_2', 1, '🔥'], ['post_demo0001_2', 6, '🔥'],
    ['post_demo0002_2', 5, '👀'], ['post_demo0003_2', 11, '✅'], ['post_demo0001_3', 4, '😂'],
  ].map(([postId, n, emoji], i) => ({ id: `react_demo${String(i + 1).padStart(4, '0')}`, postId, steamId: sid(n), emoji, source: 'website', createdAt: iso((60 - i) * MIN) })),
  updatedAt: iso(60 * MIN),
};

const jobPortal = {
  postings: [
    { id: 'moderator-position', title: 'Moderator Position', department: 'Community Safety', summary: 'Help keep the server safe, fair, and fun while supporting healthy RP scenes.', description: 'Moderators help players resolve conflict, answer basic questions, and keep roleplay moving.', commitment: '4-8 hours per week preferred.', icon: 'fa-solid fa-shield-halved', accent: 'linear-gradient(135deg, #38bdf8, #2563eb)', status: 'active', expectations: ['Stay calm during heated reports.', 'Document decisions clearly.'], qualities: ['Patient communicator', 'Fair under pressure'], questions: [{ id: 'mod_priority', label: 'What should a moderator prioritize during a chaotic scene?', help: 'Explain what you secure first and why.', type: 'long', required: true }], createdAt: iso(28 * DAY), updatedAt: iso(28 * DAY), updatedBy: null },
    { id: 'event-host', title: 'Event Team Host', department: 'Community Events', summary: 'Plan and run weekend city events: races, elections, and markets.', description: 'Event hosts coordinate with staff to schedule, announce, and run community events.', commitment: 'One event per week.', icon: 'fa-solid fa-champagne-glasses', accent: 'linear-gradient(135deg, #f59e0b, #db2777)', status: 'active', expectations: ['Announce events at least two days ahead.'], qualities: ['Organized', 'Good on voice chat'], questions: [], createdAt: iso(19 * DAY), updatedAt: iso(19 * DAY), updatedBy: null },
    { id: 'guide-writer', title: 'Guide Writer', department: 'Player Onboarding', summary: 'Turn job knowledge into clear, screenshot-led guides for new citizens.', description: 'Guide writers keep the portal guides accurate after each game update.', commitment: 'Flexible, around game updates.', icon: 'fa-solid fa-book-open', accent: 'linear-gradient(135deg, #22c55e, #0ea5e9)', status: 'active', expectations: ['Test every step in game before publishing.'], qualities: ['Clear writer', 'Detail oriented'], questions: [], createdAt: iso(12 * DAY), updatedAt: iso(12 * DAY), updatedBy: null },
  ],
  applications: [
    { id: 'app_demo0001', steamId: sid(6), jobPostingId: 'moderator-position', jobTitle: 'Moderator Position', status: 'under_review', answers: [{ questionId: 'display_name', label: 'Preferred display name', value: 'Priya' }, { questionId: 'why_northline', label: 'Why do you want to help Northline RP?', value: 'I play most evenings and want new players to have a smoother first week.' }], notes: [{ id: 'note_demo0001', authorSteamId: sid(2), authorRole: 'Admin', visibility: 'staff', body: 'Strong answers on logs. Schedule a voice chat.', createdAt: iso(1 * DAY) }], createdAt: iso(2 * DAY), updatedAt: iso(1 * DAY), reviewedAt: iso(1 * DAY), reviewedBy: sid(2), applicantViewedAt: null },
    { id: 'app_demo0002', steamId: sid(4), jobPostingId: 'event-host', jobTitle: 'Event Team Host', status: 'approved', answers: [{ questionId: 'display_name', label: 'Preferred display name', value: 'Ava' }], notes: [{ id: 'note_demo0002', authorSteamId: sid(2), authorRole: 'Admin', visibility: 'applicant', body: 'Welcome aboard! Check the staff Discord for onboarding.', createdAt: iso(3 * DAY) }], createdAt: iso(5 * DAY), updatedAt: iso(3 * DAY), reviewedAt: iso(3 * DAY), reviewedBy: sid(2), applicantViewedAt: null },
    { id: 'app_demo0003', steamId: sid(18), jobPostingId: 'guide-writer', jobTitle: 'Guide Writer', status: 'submitted', answers: [{ questionId: 'display_name', label: 'Preferred display name', value: 'Maya' }], notes: [], createdAt: iso(6 * HOUR), updatedAt: iso(6 * HOUR), reviewedAt: null, reviewedBy: null, applicantViewedAt: null },
  ],
};

const dailyCases = {
  claimedCases: [
    { id: 'case_demo0001', steamId: sid(4), caseId: 'daily-city-supply', claimedAt: iso(30 * HOUR), openedAt: iso(30 * HOUR - 30_000), reward: { id: 'cash-750', label: '$750 city cash', description: 'A nicer payday for the next time you load in.', kind: 'cash', icon: 'fa-solid fa-money-bill-wave', rarity: 'uncommon', weight: 24, value: 750, rolledAt: iso(30 * HOUR - 30_000) } },
  ],
  lastDailyClaimBySteamId: { [sid(4)]: iso(30 * HOUR) },
};

const staffSignins = [
  { steamId: sid(1), signedInAt: iso(20 * MIN) },
  { steamId: sid(2), signedInAt: iso(6 * DAY) },
  { steamId: sid(3), signedInAt: iso(12 * DAY) },
];
const commandQueue = [
  { id: 'cmd_demo0001', createdAt: iso(22 * MIN), actorSteamId: sid(1), actorName: byN[1].name, command: 'say Restart soon for the patch', targetSteamId: null, targetName: null, reason: null, delivery: 'queue', status: 'sent', result: 'Delivered by the server bridge.' },
  { id: 'cmd_demo0002', createdAt: iso(40 * MIN), actorSteamId: sid(2), actorName: byN[2].name, command: `kick ${sid(9)} "Fail RP during a police scene"`, targetSteamId: sid(9), targetName: byN[9].name, reason: 'Fail RP during a police scene', delivery: 'queue', status: 'sent', result: 'Delivered by the server bridge.' },
];
const privacyRequests = {
  requests: [
    { id: 'privacy_demo0001', type: 'export', steamId: sid(5), displayName: byN[5].name, status: 'completed', requestedAt: iso(3 * DAY), updatedAt: iso(3 * DAY) },
    { id: 'privacy_demo0002', type: 'deletion', steamId: sid(20), displayName: byN[20].name, status: 'pending', requestedAt: iso(5 * HOUR), updatedAt: iso(5 * HOUR), userNote: 'Testing the portal, please remove my profile afterwards.' },
  ],
  audit: [],
};
const heroMessages = {
  messages: [{
    id: 'demo-evening', enabled: true, label: 'Evening in the city', icon: 'fa-solid fa-city', className: 'home-moment-day',
    greeting: 'Good evening', guestTitle: 'Northline is open.', signedTitle: 'Welcome back, {name}.',
    body: 'Check server status, catch up on Tweeter, and jump in when you are ready.',
    scene: 'The lights are on downtown and the boards are moving.', timeSlots: ['all'],
  }],
  updatedAt: null,
  updatedBy: null,
};

// ---------------------------------------------------------------------------
// Write everything (fresh each run, so clicks from the last demo do not pile up)
// ---------------------------------------------------------------------------
fs.rmSync(RUNTIME, { recursive: true, force: true });

write(path.join(APE, 'player_save_data.json'), saves);
write(path.join(APE, 'roles.json'), roles);
write(path.join(APE, 'player_roles.json'), playerRoles);
write(path.join(APE, 'tweeter.json'), { Tweets: tweets, Likes: tweetLikes });
write(path.join(APE, 'connection_logs', 'connections-earlier.json'), olderConnections);
write(path.join(APE, 'connection_logs', 'connections-today.json'), recentConnections);
write(path.join(APE, 'chat_logs', 'chat-today.json'), chat);
write(path.join(APE, 'admin_logs', 'admin-recent.json'), adminLogs);
write(path.join(APE, 'damage_logs', 'damage-today.json'), damage);
write(path.join(APE, 'blacklist.json'), blacklist);
write(path.join(APE, 'warnings.json'), warnings);
write(path.join(APE, 'mutes.json'), mutes);
write(path.join(APE, 'whitelist.json'), { Enabled: false, SteamIds: [] });
write(path.join(APE, 'scheduled_server_messages.json'), [
  { Message: 'Join the Discord for event announcements!', IntervalSeconds: 1800 },
  { Message: 'Value your life. Read the rules on the portal.', IntervalSeconds: 2700 },
]);
write(path.join(APE, 'server_config.json'), serverConfig);
write(path.join(APE, 'server_status.json'), { IsOnline: true, PlayerCount: onlineCount, MaxPlayers: 64 });
write(path.join(APE, 'guides_seen.json'), { SeenGuides: seenGuides });
write(path.join(APE, 'server_console.demo.txt'), consoleLines);
for (const [n, list] of Object.entries(layouts)) {
  write(path.join(APE, 'property_layouts', `${sid(Number(n))}.json`), {
    Layouts: list.map(([LayoutName, PropertyName, items]) => ({ LayoutName, PropertyName, OwnerSteamId: sid(Number(n)), Items: props(items) })),
  });
}
write(path.join(APE, 'phone_messages', `${sid(1)}.json`), {
  Messages: [
    { FromSteamId: sid(4), ToSteamId: sid(1), Message: 'Can you cover the town hall stream tonight?', SentAt: unix(3 * HOUR) },
    { FromSteamId: sid(1), ToSteamId: sid(4), Message: 'Yep, setting up at 7:45.', SentAt: unix(3 * HOUR - 5 * MIN) },
    { FromSteamId: sid(5), ToSteamId: sid(1), Message: 'Parcel for you at the post office.', SentAt: unix(50 * MIN) },
  ],
  ContactNames: { [sid(4)]: 'Mayor Ava', [sid(5)]: 'Dex (courier)' },
  ReadConversationIds: [sid(4)],
});
write(path.join(APE, 'phone_messages', `${sid(4)}.json`), {
  Messages: [
    { FromSteamId: sid(1), ToSteamId: sid(4), Message: 'Debate notice is pinned on the portal.', SentAt: unix(100 * MIN) },
    { FromSteamId: sid(18), ToSteamId: sid(4), Message: 'Interview for the Ledger on Thursday?', SentAt: unix(40 * MIN) },
  ],
  ContactNames: { [sid(1)]: 'Marcus', [sid(18)]: 'Maya (Ledger)' },
  ReadConversationIds: [sid(1)],
});

write(path.join(WEB, 'community-store.json'), communityStore);
write(path.join(WEB, 'tweeter-social-store.json'), socialStore);
write(path.join(WEB, 'forum.json'), forum);
write(path.join(WEB, 'job-portal.json'), jobPortal);
write(path.join(WEB, 'daily-cases-store.json'), dailyCases);
write(path.join(WEB, 'privacy-requests.json'), privacyRequests);
write(path.join(WEB, 'home-hero-messages.json'), heroMessages);
writeJsonl(path.join(WEB, 'staff-website-signins.jsonl'), staffSignins);
writeJsonl(path.join(WEB, 'server-command-queue.jsonl'), commandQueue);

console.log(`Demo city written to ${path.relative(process.cwd(), RUNTIME) || RUNTIME}`);
console.log(`  ${saves.length} citizens, ${onlineCount} online, ${tweets.length} tweets, ${forum.threads.length} forum threads, ${connections.length} connection events`);
