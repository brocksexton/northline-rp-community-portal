import { notFound } from 'next/navigation';
import { getCommunityProfile } from '@/lib/community-data';
import { getSessionSteamId } from '@/lib/session';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

export const dynamic = 'force-dynamic';

export default async function TweeterLayout({ children }: { children: React.ReactNode }) {
  if (!(await isSiteFeatureEnabled('tweeter'))) notFound();

  const steamId = await getSessionSteamId();
  const profile = steamId ? await getCommunityProfile(steamId) : null;
  const era = profile?.tweeterTheme ?? 'modern';
  const mode = profile?.tweeterMode ?? 'dark';

  return (
    <div className="tweeter-mode" data-era={era} data-color-mode={mode}>
      {children}
    </div>
  );
}
