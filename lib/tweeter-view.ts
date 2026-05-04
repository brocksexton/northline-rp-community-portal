import { getPlayers, getPlayersBySteamId, getRoleForSteamId, getTweeterData } from '@/lib/ape-data';
import { getCommunityProfiles, getTweeterWebLikeState } from '@/lib/community-data';
import { getSteamProfiles } from '@/lib/steam-openid';
import { playerTitle } from '@/lib/format';

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
  joinedAt?: string | null;
  playtimeHours?: number;
  title?: string | null;
  tweetCount?: number;
  likeCount?: number;
};

export type TweeterPayload = {
  generatedAt: string;
  sessionSteamId: string | null;
  currentUser: TweeterUserView | null;
  tweets: TweetView[];
  trends: Array<{ tag: string; count: number }>;
  suggestions: TweeterUserView[];
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

  const tweetIds = tweeter.Tweets.map((tweet) => tweet.Id);
  const authorIds = [...new Set(tweeter.Tweets.map((tweet) => String(tweet.AuthorSteamId)))];
  const suggestionSteamIds = players.map((player) => String(player.SteamId)).slice(0, 10);
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

  const tweets = tweeter.Tweets.map((tweet) => {
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

  const candidateSuggestions = players
    .filter((player) => String(player.SteamId) !== sessionSteamId)
    .sort((a, b) => Number(b.TotalPlaytimeSeconds ?? 0) - Number(a.TotalPlaytimeSeconds ?? 0))
    .slice(0, 6);

  const suggestions = await Promise.all(candidateSuggestions.map(async (player) => buildTweeterUser(String(player.SteamId), tweets)));

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
      joinedAt: currentPlayer?.FirstJoinedUtc ?? null,
      playtimeHours: Math.round(Number(currentPlayer?.TotalPlaytimeSeconds ?? 0) / 3600),
      title: currentPlayer?.DisplayTitle ? playerTitle(currentPlayer.DisplayTitle) : null,
      tweetCount: tweets.filter((tweet) => tweet.authorSteamId === sessionSteamId).length,
      likeCount: tweets.filter((tweet) => tweet.authorSteamId === sessionSteamId).reduce((sum, tweet) => sum + tweet.likeCount, 0),
    } : null,
    tweets,
    trends: [...tags.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count })),
    suggestions,
    stats: {
      tweetCount: tweets.length,
      authorCount: new Set(tweets.map((tweet) => tweet.authorSteamId)).size,
    },
  };
}

export async function buildTweeterUser(steamId: string, tweets?: TweetView[]): Promise<TweeterUserView> {
  const [playersById, communityProfiles] = await Promise.all([getPlayersBySteamId(), getCommunityProfiles()]);
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
    joinedAt: player?.FirstJoinedUtc ?? null,
    playtimeHours: Math.round(Number(player?.TotalPlaytimeSeconds ?? 0) / 3600),
    title: player?.DisplayTitle ? playerTitle(player.DisplayTitle) : null,
    tweetCount: authoredTweets.length,
    likeCount: authoredTweets.reduce((sum, tweet) => sum + tweet.likeCount, 0),
  };
}
