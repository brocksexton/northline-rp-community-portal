import { TweeterClient } from '@/components/TweeterClient';
import { getPlayersBySteamId, getTweeterData } from '@/lib/ape-data';
import { getCommunityProfiles } from '@/lib/community-data';
import { getSessionSteamId } from '@/lib/session';
import { getSteamProfiles } from '@/lib/steam-openid';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tweeter' };

function makeHandle(name: string, steamId: string) {
  const clean = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return clean ? `@${clean}` : `@${steamId.slice(-8)}`;
}

export default async function TweeterPage() {
  const [sessionSteamId, tweeter, players, communityProfiles] = await Promise.all([
    getSessionSteamId(),
    getTweeterData(),
    getPlayersBySteamId(),
    getCommunityProfiles(),
  ]);

  const authorIds = [...new Set(tweeter.Tweets.map((tweet) => String(tweet.AuthorSteamId)))];
  const steamProfiles = await getSteamProfiles(authorIds);
  const likedTweetIds = new Set(
    tweeter.Likes.filter((like) => String(like.SteamId) === sessionSteamId).map((like) => like.TweetId),
  );

  const tweets = tweeter.Tweets.map((tweet) => {
    const steamId = String(tweet.AuthorSteamId);
    const player = players.get(steamId);
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
    };
  });

  const tags = new Map<string, number>();
  for (const tweet of tweets) {
    const matches = tweet.body.match(/#[a-z0-9_]+/gi) ?? [];
    for (const tag of matches) tags.set(tag.toLowerCase(), (tags.get(tag.toLowerCase()) ?? 0) + 1);
  }

  return (
    <TweeterClient
      initialData={{
        generatedAt: new Date().toISOString(),
        sessionSteamId,
        tweets,
        trends: [...tags.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([tag, count]) => ({ tag, count })),
      }}
    />
  );
}
