import { redirect } from 'next/navigation';
import { TweeterMessagesClient } from '@/components/TweeterMessagesClient';
import { buildTweeterPayload, buildTweeterUser } from '@/lib/tweeter-view';
import { getConversationSummaries } from '@/lib/tweeter-social-data';
import { getSessionSteamId } from '@/lib/session';
import { getTweeterActorActionLock } from '@/lib/tweeter-access';

export const dynamic = 'force-dynamic';

type Params = {
  searchParams?: Promise<{ with?: string | string[] }>;
};

function cleanSteamId(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const clean = String(raw ?? '').trim();
  return /^\d{15,20}$/.test(clean) ? clean : null;
}

export default async function TweeterMessagesPage({ searchParams }: Params) {
  const steamId = await getSessionSteamId();
  if (!steamId) redirect('/api/auth/steam?returnTo=/tweeter/messages');

  const actorLockReason = await getTweeterActorActionLock(steamId);

  if (actorLockReason) {
    return <TweeterMessagesClient initialData={{
      currentSteamId: steamId,
      summaries: [],
      users: {},
      selectedSteamId: null,
      suggestions: [],
      serverLocked: true,
      lockReason: actorLockReason === 'Join the Northline game server once before using Tweeter social actions.'
        ? 'Your Steam account is signed in, but the website cannot find a Northline server join date yet. Join the game server once to unlock website DMs.'
        : actorLockReason,
    }} />;
  }

  const resolved = searchParams ? await searchParams : {};
  const selectedSteamId = cleanSteamId(resolved.with);
  const [summaries, payload] = await Promise.all([
    getConversationSummaries(steamId),
    buildTweeterPayload(steamId),
  ]);

  const suggestions = payload.suggestions.filter((suggestion) => suggestion.steamId !== steamId).slice(0, 8);
  const userIds = [...new Set([
    ...summaries.map((summary) => summary.otherSteamId),
    ...(selectedSteamId ? [selectedSteamId] : []),
    ...suggestions.map((suggestion) => suggestion.steamId),
  ])];
  const users = Object.fromEntries(await Promise.all(userIds.map(async (id) => [id, await buildTweeterUser(id)])));

  return <TweeterMessagesClient initialData={{ currentSteamId: steamId, summaries, users, selectedSteamId, suggestions }} />;
}
