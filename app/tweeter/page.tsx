import { TweeterClient } from '@/components/TweeterClient';
import { getSessionSteamId } from '@/lib/session';
import { buildTweeterPayload } from '@/lib/tweeter-view';
import { buildPageMetadata } from '@/lib/embed-metadata';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Tweeter',
    description: 'Live city chatter from Northline RP: posts, profiles, replies, and public social activity from the server.',
    path: '/tweeter',
  });
}

export default async function TweeterPage() {
  const sessionSteamId = await getSessionSteamId();
  const initialData = await buildTweeterPayload(sessionSteamId);
  return <TweeterClient initialData={initialData} />;
}
