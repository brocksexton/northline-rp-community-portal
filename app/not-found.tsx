import { headers } from 'next/headers';
import { ErrorShell } from '@/components/ErrorShell';
import { MaintenancePage } from '@/components/MaintenancePage';
import { TweeterErrorShell } from '@/components/TweeterErrorShell';
import { TweeterMaintenancePage } from '@/components/TweeterMaintenancePage';
import { getRoleForSteamId } from '@/lib/ape-data';
import { getMaintenanceSettings, isMaintenanceActive, isTweeterMaintenanceActive } from '@/lib/maintenance-data';
import { getSessionSteamId } from '@/lib/session';

export default async function NotFound() {
  const [headerList, settings, steamId] = await Promise.all([headers(), getMaintenanceSettings(), getSessionSteamId()]);
  const pathname = headerList.get('x-northline-pathname') ?? '';
  const isTweeterPath = pathname === '/tweeter' || pathname.startsWith('/tweeter/');
  const role = steamId ? await getRoleForSteamId(steamId) : 'Guest';
  const developer = role.toLowerCase() === 'developer';

  if (isTweeterMaintenanceActive(settings) && isTweeterPath && !developer) {
    return <TweeterMaintenancePage settings={settings} />;
  }

  if (isMaintenanceActive(settings) && !developer && (!isTweeterPath || !settings.allowTweeterDuringMaintenance)) {
    return <MaintenancePage settings={settings} />;
  }

  if (isTweeterPath) {
    return (
      <TweeterErrorShell
        statusCode="404"
        title="This Tweeter page is missing."
        message="The post, profile, or route you opened is not available on Tweeter."
      />
    );
  }

  return <ErrorShell title="That page is off the map." message="The page does not exist, moved, or is not available on the public Northline site." />;
}
