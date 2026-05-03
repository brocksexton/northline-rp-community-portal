import { NextRequest, NextResponse } from 'next/server';
import { getPlayers, getPlayersBySteamId, getTweeterData, getRoleForSteamId } from '@/lib/ape-data';
import { getSessionSteamIdFromRequest, noStoreHeaders } from '@/lib/session';
import { getSteamProfiles } from '@/lib/steam-openid';
import { getCommunityProfiles } from '@/lib/community-data';

export const dynamic = 'force-dynamic';

function makeHandle(name: string, steamId: string) {
  const clean = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return clean ? `@${clean}` : `@${steamId.slice(-8)}`;
}

function formatSuggestionBio(role: string, title?: string | null, playtimeSeconds?: number) {
  const parts = [];
  if (title) parts.push(title);
  if (role && role !== 'User') parts.push(role);
  if (playtimeSeconds && playtimeSeconds > 0) parts.push(`${Math.max(1, Math.round(playtimeSeconds / 3600))}h in city`);
  return parts.join(' · ') || 'Citizen of Northline';
}

export async function GET(request: NextRequest) {
  const sessionSteamId = getSessionSteamIdFromRequest(request);
  const [tweeter, playersById, players, communityProfiles] = await Promise.all([
    getTweeterData(),
    getPlayersBySteamId(),
    getPlayers(),
    getCommunityProfiles(),
  ]);

  const authorIds = [...new Set(tweeter.Tweets.map((tweet) => String(tweet.AuthorSteamId)))];
  const steamProfiles = await getSteamProfiles(authorIds.length ? authorIds : players.map((player) => String(player.SteamId)).slice(0, 10));
  const likedTweetIds = new Set(
    tweeter.Likes
      .filter((like) => String(like.SteamId) === sessionSteamId)
      .map((like) => like.TweetId),
  );

  const replyCounts = new Map<string, number>();
  const retweetCounts = new Map<string, number>();
  for (const tweet of tweeter.Tweets) {
    if (tweet.ReplyToId && tweet.ReplyToId !== '00000000-0000-0000-0000-000000000000') {
      replyCounts.set(tweet.ReplyToId, (replyCounts.get(tweet.ReplyToId) ?? 0) + 1);
    }
    if (tweet.RetweetOfId && tweet.RetweetOfId !== '00000000-0000-0000-0000-000000000000') {
      retweetCounts.set(tweet.RetweetOfId, (retweetCounts.get(tweet.RetweetOfId) ?? 0) + 1);
    }
  }

  const tweets = tweeter.Tweets.map((tweet) => {
    const steamId = String(tweet.AuthorSteamId);
    const player = playersById.get(steamId);
    const steamProfile = steamProfiles.get(steamId);
    const communityProfile = communityProfiles[steamId];
    const displayName = tweet.AuthorDisplayName || player?.RpDisplayName || player?.LastKnownDisplayName || steamProfile?.personaName || `Citizen ${steamId.slice(-8)}`;
    return {
      id: tweet.Id,
      authorSteamId: steamId,
      authorDisplayName: displayName,
      handle: makeHandle(displayName, steamId),
      avatarUrl: communityProfile?.customAvatarUrl || steamProfile?.avatarFull || steamProfile?.avatarMedium || null,
      body: tweet.Body,
      postedAtTimeSeconds: tweet.PostedAtTimeSeconds ?? 0,
      verifiedKind: tweet.VerifiedKind ?? 'None',
      likeCount: tweet.LikeCount ?? 0,
      likedByMe: likedTweetIds.has(tweet.Id),
      isReply: !!tweet.IsReply,
      isRetweet: !!tweet.IsRetweet,
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
  const currentDisplayName = currentPlayer?.RpDisplayName || currentPlayer?.LastKnownDisplayName || currentSteam?.personaName || (sessionSteamId ? `Citizen ${sessionSteamId.slice(-8)}` : 'Guest');

  const candidateSuggestions = players
    .filter((player) => String(player.SteamId) !== sessionSteamId)
    .sort((a, b) => Number(b.TotalPlaytimeSeconds ?? 0) - Number(a.TotalPlaytimeSeconds ?? 0))
    .slice(0, 6);

  const suggestions = await Promise.all(candidateSuggestions.map(async (player) => {
    const steamId = String(player.SteamId);
    const steamProfile = steamProfiles.get(steamId);
    const communityProfile = communityProfiles[steamId];
    const displayName = player.RpDisplayName || player.LastKnownDisplayName || steamProfile?.personaName || `Citizen ${steamId.slice(-8)}`;
    const role = await getRoleForSteamId(steamId);
    return {
      steamId,
      displayName,
      handle: makeHandle(displayName, steamId),
      avatarUrl: communityProfile?.customAvatarUrl || steamProfile?.avatarFull || steamProfile?.avatarMedium || null,
      verifiedKind: role !== 'User' ? role : 'None',
      bio: formatSuggestionBio(role, player.DisplayTitle ? String(player.DisplayTitle) : '', Number(player.TotalPlaytimeSeconds ?? 0)),
    };
  }));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    sessionSteamId,
    currentUser: sessionSteamId ? {
      steamId: sessionSteamId,
      displayName: currentDisplayName,
      handle: makeHandle(currentDisplayName, sessionSteamId),
      avatarUrl: currentCommunity?.customAvatarUrl || currentSteam?.avatarFull || currentSteam?.avatarMedium || null,
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
  }, { headers: noStoreHeaders() });
}
