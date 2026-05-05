import {
  countItems,
  getAllDamageLogs,
  getAllGuideProgress,
  getAllPropertyLayouts,
  getCitizenName,
  getLevel,
  getPlayers,
  getRoleAssignments,
  getRoleDefinitions,
  getTweeterData,
  getXp,
  type PlayerSave,
} from '@/lib/ape-data';
import { getCommunityProfiles, getTweeterWebLikeState, type CommunityProfile } from '@/lib/community-data';
import { money, duration, compactNumber, playerTitle } from '@/lib/format';
import { getProfileCoverPreset } from '@/lib/profile-customization';
import { getSteamProfiles } from '@/lib/steam-openid';

export type LeaderboardMetricKey =
  | 'netWorth'
  | 'cash'
  | 'bank'
  | 'playtime'
  | 'level'
  | 'xp'
  | 'items'
  | 'layouts'
  | 'props'
  | 'tweetPosts'
  | 'tweetLikes'
  | 'deaths'
  | 'combatTags'
  | 'guideProgress';

export type LeaderboardCategory = 'Economy' | 'Activity' | 'Stats' | 'Property' | 'Tweeter' | 'Learning';

export type LeaderboardRow = {
  steamId: string;
  rank: number;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  role: string;
  title: string;
  bio: string;
  coverImageUrl: string | null;
  coverGradient: string;
  value: number;
  valueLabel: string;
  detail: string;
  badges: string[];
  profileHref: string;
  isCurrentUser: boolean;
};

export type LeaderboardBoard = {
  id: LeaderboardMetricKey;
  label: string;
  category: LeaderboardCategory;
  icon: string;
  description: string;
  privacyNote: string;
  unit: string;
  rows: LeaderboardRow[];
};

export type LeaderboardSummary = {
  publicProfiles: number;
  totalSaves: number;
  boards: number;
  totalRankedRows: number;
  lastUpdated: string;
};

type BaseCitizen = {
  steamId: string;
  player: PlayerSave;
  profile: CommunityProfile;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  role: string;
  title: string;
  bio: string;
  coverImageUrl: string | null;
  coverGradient: string;
  showcase: CommunityProfile['showcase'];
  netWorth: number;
  cash: number;
  bank: number;
  playtime: number;
  level: number;
  xp: number;
  itemCount: number;
  layoutCount: number;
  propCount: number;
  tweetCount: number;
  tweetLikes: number;
  deaths: number;
  combatTags: number;
  guideCompleted: number;
  guideTotal: number;
};

type BoardDefinition = {
  id: LeaderboardMetricKey;
  label: string;
  category: LeaderboardCategory;
  icon: string;
  description: string;
  privacyNote: string;
  unit: string;
  metric: (citizen: BaseCitizen) => number;
  include: (citizen: BaseCitizen) => boolean;
  format: (value: number, citizen: BaseCitizen) => string;
  detail: (citizen: BaseCitizen) => string;
  badges?: (citizen: BaseCitizen) => string[];
};

function roleMap(assignments: Awaited<ReturnType<typeof getRoleAssignments>>, definitions: Awaited<ReturnType<typeof getRoleDefinitions>>) {
  const defaultRole = definitions.find((role) => role.IsDefault)?.Name ?? 'User';
  const map = new Map(assignments.map((assignment) => [String(assignment.SteamId), assignment.RoleName]));
  return (steamId: string) => map.get(steamId) ?? defaultRole;
}

function topRows(definition: BoardDefinition, citizens: BaseCitizen[], currentSteamId: string | null): LeaderboardRow[] {
  return citizens
    .filter(definition.include)
    .map((citizen) => ({ citizen, value: definition.metric(citizen) }))
    .filter((entry) => Number.isFinite(entry.value) && entry.value > 0)
    .sort((a, b) => b.value - a.value || a.citizen.displayName.localeCompare(b.citizen.displayName))
    .slice(0, 50)
    .map((entry, index) => ({
      steamId: entry.citizen.steamId,
      rank: index + 1,
      displayName: entry.citizen.displayName,
      handle: entry.citizen.handle,
      avatarUrl: entry.citizen.avatarUrl,
      role: entry.citizen.role,
      title: entry.citizen.title,
      bio: entry.citizen.bio,
      coverImageUrl: entry.citizen.coverImageUrl,
      coverGradient: entry.citizen.coverGradient,
      value: entry.value,
      valueLabel: definition.format(entry.value, entry.citizen),
      detail: definition.detail(entry.citizen),
      badges: definition.badges?.(entry.citizen) ?? [],
      profileHref: `/tweeter/profile/${entry.citizen.steamId}`,
      isCurrentUser: currentSteamId === entry.citizen.steamId,
    }));
}

function profileCover(profile: CommunityProfile) {
  if (profile.customCoverUrl) {
    const preset = getProfileCoverPreset(profile.coverPreset);
    return { imageUrl: profile.customCoverUrl, gradient: preset.gradient };
  }
  const preset = getProfileCoverPreset(profile.coverPreset);
  return { imageUrl: preset.imageUrl ?? null, gradient: preset.gradient };
}

function boardDefinitions(): BoardDefinition[] {
  return [
    {
      id: 'netWorth', label: 'Net worth', category: 'Economy', icon: 'fa-solid fa-sack-dollar', unit: 'money',
      description: 'Wallet plus bank balance for citizens sharing economy details.',
      privacyNote: 'Only includes public profiles with Economy enabled.',
      metric: (c) => c.netWorth,
      include: (c) => Boolean(c.showcase?.economy),
      format: (value) => money(value),
      detail: (c) => `${money(c.cash)} wallet · ${money(c.bank)} bank`,
      badges: (c) => [`Level ${c.level}`, c.title],
    },
    {
      id: 'cash', label: 'Wallet cash', category: 'Economy', icon: 'fa-solid fa-money-bill-wave', unit: 'money',
      description: 'Who is walking around with the most cash on hand.',
      privacyNote: 'Only includes public profiles with Economy enabled.',
      metric: (c) => c.cash,
      include: (c) => Boolean(c.showcase?.economy),
      format: (value) => money(value),
      detail: (c) => `${money(c.bank)} sitting in the bank`,
    },
    {
      id: 'bank', label: 'Bank balance', category: 'Economy', icon: 'fa-solid fa-building-columns', unit: 'money',
      description: 'Long-term savings, rainy-day funds, and suspiciously responsible citizens.',
      privacyNote: 'Only includes public profiles with Economy enabled.',
      metric: (c) => c.bank,
      include: (c) => Boolean(c.showcase?.economy),
      format: (value) => money(value),
      detail: (c) => `${money(c.cash)} wallet cash`,
    },
    {
      id: 'playtime', label: 'Time in city', category: 'Activity', icon: 'fa-solid fa-clock', unit: 'time',
      description: 'The locals who have spent the most time around town.',
      privacyNote: 'Only includes public profiles with Activity enabled.',
      metric: (c) => c.playtime,
      include: (c) => Boolean(c.showcase?.activity),
      format: (value) => duration(value),
      detail: (c) => `${c.layoutCount.toLocaleString()} saved layout${c.layoutCount === 1 ? '' : 's'} · ${c.tweetCount.toLocaleString()} Tweeter post${c.tweetCount === 1 ? '' : 's'}`,
      badges: (c) => [`Level ${c.level}`, c.role],
    },
    {
      id: 'level', label: 'Highest level', category: 'Stats', icon: 'fa-solid fa-arrow-up-right-dots', unit: 'level',
      description: 'Highest visible character level.',
      privacyNote: 'Only includes public profiles with Stats enabled.',
      metric: (c) => c.level,
      include: (c) => Boolean(c.showcase?.stats),
      format: (value) => `Level ${Math.round(value).toLocaleString()}`,
      detail: (c) => `${compactNumber(c.xp)} XP earned`,
      badges: (c) => [c.title],
    },
    {
      id: 'xp', label: 'Total XP', category: 'Stats', icon: 'fa-solid fa-star', unit: 'xp',
      description: 'Experience earned by citizens sharing stat details.',
      privacyNote: 'Only includes public profiles with Stats enabled.',
      metric: (c) => c.xp,
      include: (c) => Boolean(c.showcase?.stats),
      format: (value) => `${Math.round(value).toLocaleString()} XP`,
      detail: (c) => `Currently level ${c.level.toLocaleString()}`,
    },
    {
      id: 'items', label: 'Items held', category: 'Stats', icon: 'fa-solid fa-box-open', unit: 'items',
      description: 'A light inventory brag board for profiles that share inventory counts.',
      privacyNote: 'Only includes public profiles with Inventory enabled.',
      metric: (c) => c.itemCount,
      include: (c) => Boolean(c.showcase?.inventory),
      format: (value) => `${Math.round(value).toLocaleString()} item${value === 1 ? '' : 's'}`,
      detail: (c) => `${c.netWorth > 0 ? `${money(c.netWorth)} visible net worth` : 'Inventory count only'}`,
    },
    {
      id: 'layouts', label: 'Saved layouts', category: 'Property', icon: 'fa-solid fa-house-chimney-window', unit: 'layouts',
      description: 'Builders, decorators, storefront enjoyers, and interior design criminals.',
      privacyNote: 'Only includes public profiles with Properties enabled.',
      metric: (c) => c.layoutCount,
      include: (c) => Boolean(c.showcase?.properties),
      format: (value) => `${Math.round(value).toLocaleString()} layout${value === 1 ? '' : 's'}`,
      detail: (c) => `${c.propCount.toLocaleString()} saved prop${c.propCount === 1 ? '' : 's'}`,
    },
    {
      id: 'props', label: 'Saved props', category: 'Property', icon: 'fa-solid fa-cubes-stacked', unit: 'props',
      description: 'Most saved property objects across public builders.',
      privacyNote: 'Only includes public profiles with Properties enabled.',
      metric: (c) => c.propCount,
      include: (c) => Boolean(c.showcase?.properties),
      format: (value) => `${Math.round(value).toLocaleString()} prop${value === 1 ? '' : 's'}`,
      detail: (c) => `${c.layoutCount.toLocaleString()} saved layout${c.layoutCount === 1 ? '' : 's'}`,
    },
    {
      id: 'tweetPosts', label: 'Tweeter posts', category: 'Tweeter', icon: 'fa-brands fa-twitter', unit: 'posts',
      description: 'Who has been keeping the in-city timeline alive.',
      privacyNote: 'Includes public profiles with Tweeter activity.',
      metric: (c) => c.tweetCount,
      include: () => true,
      format: (value) => `${Math.round(value).toLocaleString()} post${value === 1 ? '' : 's'}`,
      detail: (c) => `${c.tweetLikes.toLocaleString()} like${c.tweetLikes === 1 ? '' : 's'} earned`,
    },
    {
      id: 'tweetLikes', label: 'Tweeter likes earned', category: 'Tweeter', icon: 'fa-solid fa-heart', unit: 'likes',
      description: 'Posts that people actually reacted to.',
      privacyNote: 'Includes public profiles with liked Tweeter posts.',
      metric: (c) => c.tweetLikes,
      include: () => true,
      format: (value) => `${Math.round(value).toLocaleString()} like${value === 1 ? '' : 's'}`,
      detail: (c) => `${c.tweetCount.toLocaleString()} post${c.tweetCount === 1 ? '' : 's'} on Tweeter`,
    },
    {
      id: 'deaths', label: 'Fatal accidents', category: 'Stats', icon: 'fa-solid fa-skull', unit: 'deaths',
      description: 'A silly “please be careful out there” board based on visible death counts.',
      privacyNote: 'Only includes public profiles with Stats enabled.',
      metric: (c) => c.deaths,
      include: (c) => Boolean(c.showcase?.stats),
      format: (value) => `${Math.round(value).toLocaleString()} time${value === 1 ? '' : 's'}`,
      detail: () => 'The city is not OSHA certified.',
    },
    {
      id: 'combatTags', label: 'Combat tags', category: 'Stats', icon: 'fa-solid fa-burst', unit: 'tags',
      description: 'Player-caused fatal damage events. Mostly for staff/community context, not bragging rights.',
      privacyNote: 'Only includes public profiles with Stats enabled.',
      metric: (c) => c.combatTags,
      include: (c) => Boolean(c.showcase?.stats),
      format: (value) => `${Math.round(value).toLocaleString()} tag${value === 1 ? '' : 's'}`,
      detail: () => 'Keep it fun, not sweaty.',
    },
    {
      id: 'guideProgress', label: 'Guide progress', category: 'Learning', icon: 'fa-solid fa-map-signs', unit: 'guides',
      description: 'Who has checked off the starter guide path.',
      privacyNote: 'Includes public profiles with guide progress recorded.',
      metric: (c) => c.guideCompleted,
      include: () => true,
      format: (value, c) => `${Math.round(value).toLocaleString()} / ${c.guideTotal.toLocaleString()}`,
      detail: (c) => `${c.guideTotal ? Math.round((c.guideCompleted / c.guideTotal) * 100) : 0}% of the starter path`,
    },
  ];
}

export async function buildLeaderboardData(currentSteamId: string | null = null): Promise<{ summary: LeaderboardSummary; boards: LeaderboardBoard[] }> {
  const [players, profiles, roleAssignments, roleDefinitions, layouts, damageLogs, tweeter, guideProgress] = await Promise.all([
    getPlayers(),
    getCommunityProfiles(),
    getRoleAssignments(),
    getRoleDefinitions(),
    getAllPropertyLayouts(),
    getAllDamageLogs(),
    getTweeterData(),
    getAllGuideProgress(),
  ]);

  const publicPlayers = players.filter((player) => {
    const profile = profiles[String(player.SteamId)];
    return profile?.privacy === 'public';
  });
  const steamProfiles = await getSteamProfiles(publicPlayers.map((player) => player.SteamId));
  const roleFor = roleMap(roleAssignments, roleDefinitions);

  const layoutsByOwner = new Map<string, { layouts: number; props: number }>();
  for (const layout of layouts) {
    const steamId = String(layout.OwnerSteamId ?? '');
    const existing = layoutsByOwner.get(steamId) ?? { layouts: 0, props: 0 };
    existing.layouts += 1;
    existing.props += layout.Items?.length ?? 0;
    layoutsByOwner.set(steamId, existing);
  }

  const fatalDeaths = new Map<string, number>();
  const combatTags = new Map<string, number>();
  for (const log of damageLogs.filter((entry) => Boolean(entry.IsFatal))) {
    const victim = String(log.VictimSteamId ?? '');
    if (/^\d{15,20}$/.test(victim)) fatalDeaths.set(victim, (fatalDeaths.get(victim) ?? 0) + 1);
    const attacker = log.AttackerSteamId == null ? '' : String(log.AttackerSteamId);
    if (/^\d{15,20}$/.test(attacker) && attacker !== victim && attacker !== '0') {
      combatTags.set(attacker, (combatTags.get(attacker) ?? 0) + 1);
    }
  }

  const tweetIds = tweeter.Tweets.map((tweet) => tweet.Id);
  const webLikeState = await getTweeterWebLikeState(tweetIds, null);
  const tweetsByAuthor = new Map<string, { posts: number; likes: number }>();
  for (const tweet of tweeter.Tweets) {
    const steamId = String(tweet.AuthorSteamId ?? '');
    const existing = tweetsByAuthor.get(steamId) ?? { posts: 0, likes: 0 };
    existing.posts += 1;
    existing.likes += Number(tweet.LikeCount ?? 0) + Number(webLikeState.counts[tweet.Id] ?? 0);
    tweetsByAuthor.set(steamId, existing);
  }

  const citizens: BaseCitizen[] = publicPlayers.map((player) => {
    const steamId = String(player.SteamId);
    const profile = profiles[steamId] as CommunityProfile;
    const steam = steamProfiles.get(steamId);
    const cover = profileCover(profile);
    const property = layoutsByOwner.get(steamId) ?? { layouts: 0, props: 0 };
    const twitter = tweetsByAuthor.get(steamId) ?? { posts: 0, likes: 0 };
    const progress = guideProgress.get(steamId);
    const role = roleFor(steamId);
    return {
      steamId,
      player,
      profile,
      displayName: getCitizenName(player, steamId),
      handle: `@${(getCitizenName(player, steamId) || `citizen${steamId.slice(-4)}`).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || `citizen${steamId.slice(-4)}`}`,
      avatarUrl: profile.customAvatarUrl || steam?.avatarMedium || steam?.avatarFull || null,
      role,
      title: playerTitle(player.DisplayTitle, 'Northline citizen'),
      bio: profile.bio?.trim() || '',
      coverImageUrl: cover.imageUrl,
      coverGradient: cover.gradient,
      showcase: profile.showcase,
      netWorth: Number(player.CashBalance ?? 0) + Number(player.BankBalance ?? 0),
      cash: Number(player.CashBalance ?? 0),
      bank: Number(player.BankBalance ?? 0),
      playtime: Number(player.TotalPlaytimeSeconds ?? 0),
      level: getLevel(player),
      xp: getXp(player),
      itemCount: countItems(player),
      layoutCount: property.layouts,
      propCount: property.props,
      tweetCount: twitter.posts,
      tweetLikes: twitter.likes,
      deaths: Math.max(Number(player.TrackedStats?.deaths ?? player.TrackedStats?.Deaths ?? 0), fatalDeaths.get(steamId) ?? 0),
      combatTags: combatTags.get(steamId) ?? 0,
      guideCompleted: progress?.completed ?? 0,
      guideTotal: progress?.total ?? 0,
    } satisfies BaseCitizen;
  });

  const boards = boardDefinitions().map((definition) => ({
    id: definition.id,
    label: definition.label,
    category: definition.category,
    icon: definition.icon,
    description: definition.description,
    privacyNote: definition.privacyNote,
    unit: definition.unit,
    rows: topRows(definition, citizens, currentSteamId),
  }));

  return {
    summary: {
      publicProfiles: citizens.length,
      totalSaves: players.length,
      boards: boards.length,
      totalRankedRows: boards.reduce((sum, board) => sum + board.rows.length, 0),
      lastUpdated: new Date().toISOString(),
    },
    boards,
  };
}
