import { redirect } from 'next/navigation';
import { TweeterMessagesClient } from '@/components/TweeterMessagesClient';
import { buildTweeterUser } from '@/lib/tweeter-view';
import { getConversationSummaries } from '@/lib/tweeter-social-data';
import { getSessionSteamId } from '@/lib/session';

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

  const resolved = searchParams ? await searchParams : {};
  const selectedSteamId = cleanSteamId(resolved.with);
  const summaries = await getConversationSummaries(steamId);
  const userIds = [...new Set([...summaries.map((summary) => summary.otherSteamId), ...(selectedSteamId ? [selectedSteamId] : [])])];
  const users = Object.fromEntries(await Promise.all(userIds.map(async (id) => [id, await buildTweeterUser(id)])));

  return <TweeterMessagesClient initialData={{ currentSteamId: steamId, summaries, users, selectedSteamId }} />;
}
