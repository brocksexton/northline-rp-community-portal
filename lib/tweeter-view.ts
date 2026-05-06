import { getPlayers, getPlayersBySteamId, getRoleForSteamId, getTweeterData } from '@/lib/ape-data';
import { getCommunityProfiles, getTweeterWebLikeState } from '@/lib/community-data';
import { getSteamProfiles } from '@/lib/steam-openid';
import { playerTitle } from '@/lib/format';
import { canUseCustomProfileCover, DEFAULT_PROFILE_COVER_PRESET, DEFAULT_PROFILE_THEME, normalizeProfileCoverPreset, normalizeProfileTheme, type ProfileTheme } from '@/lib/profile-customization';
import { getTweeterRestriction, getTweeterRestrictionMap, type TweeterAccountRestriction, type TweeterModerationNotice } from '@/lib/tweeter-moderation-data';
import { listTweeterContentFilterRules } from '@/lib/tweeter-content-filter-data';
import type { TextFilterRule } from '@/lib/content-filter';

const ZERO_GUID = '00000000-0000-0000-0000-000000000000';

export type TweetView = {
  id: string;
  authorSteamId: string;
  authorDisplayName: string;
  handle: string;
  avatarUrl?: string | null;
  body: string;
  postedAtTimeSeconds: number;
  verifiedKind: string;
  likeCount: number;
  likedByMe: boolean;
  isReply: boolean;
  isRetweet: boolean;
  replyToId?: string | null;
  retweetOfId?: string | null;
  retweetOfBody?: string | null;
  retweetOfAuthorDisplayName?: string | null;
  replyCount: number;
  retweetCount: number;
};

export type TweeterUserView = {
  steamId: string;
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
  verifiedKind?: string;
  bio?: string;
  bannerColor?: string;
  coverPreset?: string;
  customCoverUrl?: string | null;
  profileTheme?: ProfileTheme;
  joinedAt?: string | null;
  hasPlayedInServer?: boolean;
  hasClaimedProfile?: boolean;
  isPublicProfile?: boolean;
  playtimeHours?: number;
  title?: string | null;
  tweetCount?: number;
  likeCount?: number;
  moderationStatus?: TweeterAccountRestriction['status'];
  moderationNotices?: TweeterModerationNotice[];
  hiddenFromTweeter?: boolean;
  canAppearInSuggestions?: boolean;
  canReceiveFollow?: boolean;
  canReceiveMessage?: boolean;
  actionLockReason?: string;
  targetFollowLockReason?: string;
  targetMessageLockReason?: string;
};

export type TweeterPayload = {
  generatedAt: string;
  sessionSteamId: string | null;
  currentUser: TweeterUserView | null;
  tweets: TweetView[];
  trends: Array<{ tag: string; count: number }>;
  suggestions: TweeterUserView[];
  contentFilterRules: TextFilterRule[];
  stats: {
    tweetCount: number;
    authorCount: number;
  };
};

export function makeTweeterHandle(name: string, steamId: string) {
  const clean = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return clean ? `@${clean}` : `@${steamId.slice(-8)}`;
}

function validRelationId(id?: string | null) {
  return id && id !== ZERO_GUID ? id : null;
}

function formatSuggestionBio(role: string, title?: string | null, playtimeSeconds?: number) {
  const parts = [];
  if (title) parts.push(title);
  if (role && role !== 'User') parts.push(role);
  if (playtimeSeconds && playtimeSeconds > 0) parts.push(`${Math.max(1, Math.round(playtimeSeconds / 3600))}h in city`);
  return parts.join(' · ') || 'Citizen of Northline';
}

export async function buildTweeterPayload(sessionSteamId: string | null): Promise<TweeterPayload> {
  const [tweeter, playersById, players, communityProfiles] = await Promise.all([
    getTweeterData(),
    getPlayersBySteamId(),
    getPlayers(),
    getCommunityProfiles(),
  ]);
  const contentFilterRules = await listTweeterContentFilterRules();

  const tweetIds = tweeter.Tweets.map((tweet) => tweet.Id);
  const authorIds = [...new Set(tweeter.Tweets.map((tweet) => String(tweet.AuthorSteamId)))];
  const publicClaimedSteamIds = Object.entries(communityProfiles)
    .filter(([steamId, profile]) => steamId !== sessionSteamId && profile.privacy === 'public')
    .map(([steamId]) => steamId)
    .sort((a, b) => Number(playersById.get(b)?.TotalPlaytimeSeconds ?? 0) - Number(playersById.get(a)?.TotalPlaytimeSeconds ?? 0));
  const moderationIds = [...new Set([...authorIds, ...publicClaimedSteamIds, ...(sessionSteamId ? [sessionSteamId] : [])])];
  const restrictionMap = await getTweeterRestrictionMap(moderationIds);
  const visiblePublicClaimedSteamIds = publicClaimedSteamIds.filter((steamId) => restrictionMap[steamId]?.canAppearInSuggestions !== false);
  const suggestionSteamIds = visiblePublicClaimedSteamIds.slice(0, 10);
  const steamProfiles = await getSteamProfiles([...new Set([...authorIds, ...suggestionSteamIds, ...(sessionSteamId ? [sessionSteamId] : [])])]);

  const gameLikedTweetIds = new Set(
    tweeter.Likes
      .filter((like) => String(like.SteamId) === sessionSteamId)
      .map((like) => like.TweetId),
  );
  const gameLikeCounts = new Map<string, number>();
  for (const like of tweeter.Likes) {
    gameLikeCounts.set(like.TweetId, (gameLikeCounts.get(like.TweetId) ?? 0) + 1);
  }

  const webLikeState = await getTweeterWebLikeState(tweetIds, sessionSteamId);

  const replyCounts = new Map<string, number>();
  const retweetCounts = new Map<string, number>();
  for (const tweet of tweeter.Tweets) {
    const replyToId = validRelationId(tweet.ReplyToId);
    const retweetOfId = validRelationId(tweet.RetweetOfId);
    if (replyToId) replyCounts.set(replyToId, (replyCounts.get(replyToId) ?? 0) + 1);
    if (retweetOfId) retweetCounts.set(retweetOfId, (retweetCounts.get(retweetOfId) ?? 0) + 1);
  }

  const tweets = tweeter.Tweets
    .filter((tweet) => !restrictionMap[String(tweet.AuthorSteamId)]?.hiddenFromTweeter)
    .map((tweet) => {
    const steamId = String(tweet.AuthorSteamId);
    const player = playersById.get(steamId);
    const steamProfile = steamProfiles.get(steamId);
    const communityProfile = communityProfiles[steamId];
    const displayName = tweet.AuthorDisplayName || player?.RpDisplayName || player?.LastKnownDisplayName || steamProfile?.personaName || `Citizen ${steamId.slice(-8)}`;
    const nativeLikeCount = Math.max(Number(tweet.LikeCount ?? 0), gameLikeCounts.get(tweet.Id) ?? 0);
    const webLikeCount = webLikeState.counts[tweet.Id] ?? 0;
    return {
      id: tweet.Id,
      authorSteamId: steamId,
      authorDisplayName: displayName,
      handle: makeTweeterHandle(displayName, steamId),
      avatarUrl: communityProfile?.customAvatarUrl || steamProfile?.avatarFull || steamProfile?.avatarMedium || null,
      body: tweet.Body,
      postedAtTimeSeconds: tweet.PostedAtTimeSeconds ?? 0,
      verifiedKind: tweet.VerifiedKind ?? 'None',
      likeCount: nativeLikeCount + webLikeCount,
      likedByMe: gameLikedTweetIds.has(tweet.Id) || webLikeState.likedTweetIds.has(tweet.Id),
      isReply: !!tweet.IsReply,
      isRetweet: !!tweet.IsRetweet,
      replyToId: validRelationId(tweet.ReplyToId),
      retweetOfId: validRelationId(tweet.RetweetOfId),
      retweetOfBody: tweet.RetweetOfBody ?? null,
      retweetOfAuthorDisplayName: tweet.RetweetOfAuthorDisplayName ?? null,
      replyCount: replyCounts.get(tweet.Id) ?? 0,
      retweetCount: retweetCounts.get(tweet.Id) ?? 0,
    };
  });

  const tags = new Map<string, number>();
  for (const tweet of tweets) {
    const matches = tweet.body.match(/#[a-z0-9_]+/gi) ?? [];
    for (const tag of matches) tags.set(tag.toLowerCase(), (tags.get(tag.toLowerCase()) ?? 0) + 1);
  }

  const currentPlayer = sessionSteamId ? playersById.get(sessionSteamId) : null;
  const currentSteam = sessionSteamId ? steamProfiles.get(sessionSteamId) : null;
  const currentCommunity = sessionSteamId ? communityProfiles[sessionSteamId] : null;
  const currentRole = sessionSteamId ? await getRoleForSteamId(sessionSteamId) : 'Guest';
  const currentDisplayName = currentPlayer?.RpDisplayName || currentPlayer?.LastKnownDisplayName || currentSteam?.personaName || (sessionSteamId ? `Citizen ${sessionSteamId.slice(-8)}` : 'Guest');

  const candidateSuggestionIds = visiblePublicClaimedSteamIds.slice(0, 6);

  const suggestions = await Promise.all(candidateSuggestionIds.map(async (steamId) => buildTweeterUser(steamId, tweets)));

  return {
    generatedAt: new Date().toISOString(),
    sessionSteamId,
    currentUser: sessionSteamId ? {
      steamId: sessionSteamId,
      displayName: currentDisplayName,
      handle: makeTweeterHandle(currentDisplayName, sessionSteamId),
      avatarUrl: currentCommunity?.customAvatarUrl || currentSteam?.avatarFull || currentSteam?.avatarMedium || null,
      verifiedKind: currentRole !== 'User' ? currentRole : 'None',
      bio: formatSuggestionBio(currentRole, currentPlayer?.DisplayTitle ? playerTitle(currentPlayer.DisplayTitle) : '', Number(currentPlayer?.TotalPlaytimeSeconds ?? 0)),
      bannerColor: currentCommunity?.bannerColor || '#1d9bf0',
      coverPreset: normalizeProfileCoverPreset(currentCommunity?.coverPreset ?? DEFAULT_PROFILE_COVER_PRESET),
      customCoverUrl: canUseCustomProfileCover(currentRole) ? (currentCommunity?.customCoverUrl || null) : null,
      profileTheme: normalizeProfileTheme(currentCommunity?.profileTheme ?? DEFAULT_PROFILE_THEME),
      joinedAt: currentPlayer?.FirstJoinedUtc ?? null,
      hasPlayedInServer: Boolean(currentPlayer?.FirstJoinedUtc),
      hasClaimedProfile: Boolean(currentCommunity),
      isPublicProfile: currentCommunity?.privacy !== 'private',
      playtimeHours: Math.round(Number(currentPlayer?.TotalPlaytimeSeconds ?? 0) / 3600),
      title: currentPlayer?.DisplayTitle ? playerTitle(currentPlayer.DisplayTitle) : null,
      tweetCount: tweets.filter((tweet) => tweet.authorSteamId === sessionSteamId).length,
      likeCount: tweets.filter((tweet) => tweet.authorSteamId === sessionSteamId).reduce((sum, tweet) => sum + tweet.likeCount, 0),
      moderationStatus: restrictionMap[sessionSteamId]?.status ?? 'none',
      moderationNotices: restrictionMap[sessionSteamId]?.notices ?? [],
      hiddenFromTweeter: restrictionMap[sessionSteamId]?.hiddenFromTweeter ?? false,
      canAppearInSuggestions: restrictionMap[sessionSteamId]?.canAppearInSuggestions ?? true,
      canReceiveFollow: restrictionMap[sessionSteamId]?.canReceiveFollow ?? true,
      canReceiveMessage: restrictionMap[sessionSteamId]?.canReceiveMessage ?? true,
      actionLockReason: restrictionMap[sessionSteamId]?.actionLockReason ?? '',
      targetFollowLockReason: restrictionMap[sessionSteamId]?.targetFollowLockReason ?? '',
      targetMessageLockReason: restrictionMap[sessionSteamId]?.targetMessageLockReason ?? '',
    } : null,
    tweets,
    trends: [...tags.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count })),
    suggestions,
    contentFilterRules,
    stats: {
      tweetCount: tweets.length,
      authorCount: new Set(tweets.map((tweet) => tweet.authorSteamId)).size,
    },
  };
}

export async function buildTweeterUser(steamId: string, tweets?: TweetView[]): Promise<TweeterUserView> {
  const [playersById, communityProfiles, restriction] = await Promise.all([getPlayersBySteamId(), getCommunityProfiles(), getTweeterRestriction(steamId)]);
  const player = playersById.get(steamId);
  const steamProfiles = await getSteamProfiles([steamId]);
  const steamProfile = steamProfiles.get(steamId);
  const communityProfile = communityProfiles[steamId];
  const displayName = player?.RpDisplayName || player?.LastKnownDisplayName || steamProfile?.personaName || `Citizen ${steamId.slice(-8)}`;
  const role = await getRoleForSteamId(steamId);
  const authoredTweets = tweets?.filter((tweet) => tweet.authorSteamId === steamId) ?? [];
  return {
    steamId,
    displayName,
    handle: makeTweeterHandle(displayName, steamId),
    avatarUrl: communityProfile?.customAvatarUrl || steamProfile?.avatarFull || steamProfile?.avatarMedium || null,
    verifiedKind: role !== 'User' ? role : 'None',
    bio: communityProfile?.privacy === 'private' ? 'This citizen keeps their profile private.' : (communityProfile?.bio || formatSuggestionBio(role, player?.DisplayTitle ? playerTitle(player.DisplayTitle) : '', Number(player?.TotalPlaytimeSeconds ?? 0))),
    bannerColor: communityProfile?.bannerColor || '#1d9bf0',
    coverPreset: normalizeProfileCoverPreset(communityProfile?.coverPreset ?? DEFAULT_PROFILE_COVER_PRESET),
    customCoverUrl: canUseCustomProfileCover(role) ? (communityProfile?.customCoverUrl || null) : null,
    profileTheme: normalizeProfileTheme(communityProfile?.profileTheme ?? DEFAULT_PROFILE_THEME),
    joinedAt: player?.FirstJoinedUtc ?? null,
    hasPlayedInServer: Boolean(player?.FirstJoinedUtc),
    hasClaimedProfile: Boolean(communityProfile),
    isPublicProfile: communityProfile?.privacy !== 'private',
    playtimeHours: Math.round(Number(player?.TotalPlaytimeSeconds ?? 0) / 3600),
    title: player?.DisplayTitle ? playerTitle(player.DisplayTitle) : null,
    tweetCount: authoredTweets.length,
    likeCount: authoredTweets.reduce((sum, tweet) => sum + tweet.likeCount, 0),
    moderationStatus: restriction?.status ?? 'none',
    moderationNotices: restriction?.notices ?? [],
    hiddenFromTweeter: restriction?.hiddenFromTweeter ?? false,
    canAppearInSuggestions: restriction?.canAppearInSuggestions ?? true,
    canReceiveFollow: restriction?.canReceiveFollow ?? true,
    canReceiveMessage: restriction?.canReceiveMessage ?? true,
    actionLockReason: restriction?.actionLockReason ?? '',
    targetFollowLockReason: restriction?.targetFollowLockReason ?? '',
    targetMessageLockReason: restriction?.targetMessageLockReason ?? '',
  };
}
