import { NextRequest } from 'next/server';
import { getMaintenanceSettings, isMaintenanceActive, isTweeterMaintenanceActive } from '@/lib/maintenance-data';
import { getRoleForSteamId } from '@/lib/ape-data';
import { getSessionSteamIdFromRequest, jsonWithSession } from '@/lib/session';
import { isApeStaffSteamId } from '@/lib/ape-staff-data';

export const dynamic = 'force-dynamic';

function cleanPath(value: string | null): string {
  const raw = String(value || '/').trim() || '/';
  if (!raw.startsWith('/')) return '/';
  if (raw.startsWith('//')) return '/';
  return raw.split('#')[0] || '/';
}

function isTweeterPath(pathname: string): boolean {
  return pathname === '/tweeter' || pathname.startsWith('/tweeter/');
}

export async function GET(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request);
  const [settings, role, isBadgeOnlyApeStaff] = await Promise.all([
    getMaintenanceSettings(),
    steamId ? getRoleForSteamId(steamId) : Promise.resolve('Guest'),
    steamId ? isApeStaffSteamId(steamId) : Promise.resolve(false),
  ]);

  const trustedStaffBypass = role.toLowerCase() === 'developer' && !isBadgeOnlyApeStaff;
  const pathname = cleanPath(request.nextUrl.searchParams.get('path'));
  const tweeterPath = isTweeterPath(pathname);
  const siteMaintenance = isMaintenanceActive(settings);
  const tweeterMaintenance = isTweeterMaintenanceActive(settings);
  const blockedBySiteMaintenance = siteMaintenance && !trustedStaffBypass && (!tweeterPath || !settings.allowTweeterDuringMaintenance);
  const blockedByTweeterMaintenance = tweeterMaintenance && tweeterPath && !trustedStaffBypass;
  const allowed = !blockedBySiteMaintenance && !blockedByTweeterMaintenance;

  return jsonWithSession({
    allowed,
    pathname,
    siteMaintenance,
    tweeterMaintenance,
    allowTweeterDuringMaintenance: settings.allowTweeterDuringMaintenance,
    reason: blockedByTweeterMaintenance ? 'tweeter-maintenance' : blockedBySiteMaintenance ? 'site-maintenance' : 'allowed',
  }, { status: 200 }, steamId, request);
}
