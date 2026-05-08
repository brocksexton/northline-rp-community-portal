import { NextRequest, NextResponse } from "next/server";
import { getTweeterData } from "@/lib/ape-data";
import {
  getSessionSteamIdFromRequest,
  jsonWithSession,
  noStoreHeaders,
} from "@/lib/session";
import { getTweeterActorActionLock } from "@/lib/tweeter-access";
import {
  getBookmarkState,
  toggleBookmarkState,
} from "@/lib/tweeter-social-data";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ tweetId: string }> };

async function tweetExists(tweetId: string) {
  const tweeter = await getTweeterData();
  return tweeter.Tweets.some((item) => item.Id === tweetId);
}

export async function GET(request: NextRequest, { params }: Params) {
  const { tweetId } = await params;
  const sessionSteamId = getSessionSteamIdFromRequest(request);
  if (!(await tweetExists(tweetId)))
    return NextResponse.json(
      { error: "Tweet not found" },
      { status: 404, headers: noStoreHeaders() },
    );
  return jsonWithSession(
    await getBookmarkState(sessionSteamId, tweetId),
    { headers: noStoreHeaders() },
    sessionSteamId,
    request,
  );
}

export async function POST(request: NextRequest, { params }: Params) {
  const sessionSteamId = getSessionSteamIdFromRequest(request);
  if (!sessionSteamId)
    return NextResponse.json(
      { error: "Sign in with Steam to bookmark posts." },
      { status: 401, headers: noStoreHeaders() },
    );
  const actorLockReason = await getTweeterActorActionLock(sessionSteamId);
  if (actorLockReason)
    return NextResponse.json(
      { error: actorLockReason },
      { status: 403, headers: noStoreHeaders() },
    );

  const { tweetId } = await params;
  if (!(await tweetExists(tweetId)))
    return jsonWithSession(
      { error: "Tweet not found" },
      { status: 404, headers: noStoreHeaders() },
      sessionSteamId,
      request,
    );

  return jsonWithSession(
    await toggleBookmarkState(sessionSteamId, tweetId),
    { headers: noStoreHeaders() },
    sessionSteamId,
    request,
  );
}
