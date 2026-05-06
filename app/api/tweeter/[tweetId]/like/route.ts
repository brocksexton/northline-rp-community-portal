import { NextRequest, NextResponse } from 'next/server';
import { getTweeterData } from '@/lib/ape-data';
import { getSessionSteamIdFromRequest, jsonWithSession, noStoreHeaders } from '@/lib/session';
import { getTweeterWebLikeState, toggleTweeterWebLike } from '@/lib/community-data';
import { getTweeterActorActionLock } from '@/lib/tweeter-access';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ tweetId: string }> };

async function getLikeSummary(tweetId: string, steamId: string | null) {
  const tweeter = await getTweeterData();
  const tweet = tweeter.Tweets.find((item) => item.Id === tweetId);
  if (!tweet) return null;

  const gameLikedByMe = steamId ? tweeter.Likes.some((like) => like.TweetId === tweetId && String(like.SteamId) === steamId) : false;
  const gameLikeCount = Math.max(
    Number(tweet.LikeCount ?? 0),
    tweeter.Likes.filter((like) => like.TweetId === tweetId).length,
  );
  const webState = await getTweeterWebLikeState([tweetId], steamId);
  return {
    liked: gameLikedByMe || webState.likedTweetIds.has(tweetId),
    count: gameLikeCount + (webState.counts[tweetId] ?? 0),
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  const { tweetId } = await params;
  const sessionSteamId = getSessionSteamIdFromRequest(request);
  const summary = await getLikeSummary(tweetId, sessionSteamId);
  if (!summary) return NextResponse.json({ error: 'Tweet not found' }, { status: 404, headers: noStoreHeaders() });
  return jsonWithSession(summary, undefined, sessionSteamId, request);
}

export async function POST(request: NextRequest, { params }: Params) {
  const sessionSteamId = getSessionSteamIdFromRequest(request);
  if (!sessionSteamId) {
    return NextResponse.json({ error: 'Sign in with Steam to like posts.' }, { status: 401, headers: noStoreHeaders() });
  }

  const actorLockReason = await getTweeterActorActionLock(sessionSteamId);
  if (actorLockReason) {
    return NextResponse.json({ error: actorLockReason }, { status: 403, headers: noStoreHeaders() });
  }

  const { tweetId } = await params;
  const tweeter = await getTweeterData();
  const tweet = tweeter.Tweets.find((item) => item.Id === tweetId);
  if (!tweet) return jsonWithSession({ error: 'Tweet not found' }, { status: 404 }, sessionSteamId, request);

  await toggleTweeterWebLike(tweetId, sessionSteamId);
  const summary = await getLikeSummary(tweetId, sessionSteamId);
  return jsonWithSession(summary, undefined, sessionSteamId, request);
}
