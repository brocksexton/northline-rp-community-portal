import { getCommunityProfile } from '@/lib/community-data';
import { getSessionSteamId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function TweeterLayout({ children }: { children: React.ReactNode }) {
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
