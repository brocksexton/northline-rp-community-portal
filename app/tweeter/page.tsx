import { TweeterClient } from '@/components/TweeterClient';
import { getSessionSteamId } from '@/lib/session';
import { buildTweeterPayload } from '@/lib/tweeter-view';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tweeter' };

export default async function TweeterPage() {
  const sessionSteamId = await getSessionSteamId();
  const initialData = await buildTweeterPayload(sessionSteamId);
  return <TweeterClient initialData={initialData} />;
}
