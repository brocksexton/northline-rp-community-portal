import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { MaintenancePage } from '@/components/MaintenancePage';
import { MaintenanceAccessGuard } from '@/components/MaintenanceAccessGuard';
import { TweeterMaintenancePage } from '@/components/TweeterMaintenancePage';
import { getCommunityProfile } from '@/lib/community-data';
import { getRoleForSteamId } from '@/lib/ape-data';
import { getMaintenanceSettings, isMaintenanceActive, isTweeterMaintenanceActive } from '@/lib/maintenance-data';
import { getSessionSteamId } from '@/lib/session';
import { headers } from 'next/headers';
import { getSiteConfig } from '@/lib/site-config';
import { isApeStaffSteamId } from '@/lib/ape-staff-data';
import { buildMetadataFromConfig } from '@/lib/embed-metadata';
import './globals.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const baseMetadata = buildMetadataFromConfig(config, {
    title: config.brand.name,
    description: config.brand.tagline,
    path: '/',
  });

  return {
    ...baseMetadata,
    title: {
      default: config.brand.name,
      template: `%s · ${config.brand.name}`,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [config, steamId, maintenance, headerList] = await Promise.all([getSiteConfig(), getSessionSteamId(), getMaintenanceSettings(), headers()]);
  const [profile, role, isBadgeOnlyApeStaff] = steamId ? await Promise.all([getCommunityProfile(steamId), getRoleForSteamId(steamId), isApeStaffSteamId(steamId)]) : [null, 'Guest', false] as const;
  const websiteStyle = profile?.websiteStyle ?? 'civic';
  const pathname = headerList.get('x-northline-pathname') ?? '';
  const isTweeterPath = pathname === '/tweeter' || pathname.startsWith('/tweeter/');
  const trustedStaffBypass = role.toLowerCase() === 'developer' && !isBadgeOnlyApeStaff;
  const maintenanceBlocked = isMaintenanceActive(maintenance) && !trustedStaffBypass && (!isTweeterPath || !maintenance.allowTweeterDuringMaintenance);
  const tweeterMaintenanceBlocked = isTweeterMaintenanceActive(maintenance) && isTweeterPath && !trustedStaffBypass;
  return (
    <html lang="en" style={{ ['--accent' as string]: config.brand.accentColor }}>
      <head>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
      </head>
      <body
        data-site-style={websiteStyle}
        data-app-section={isTweeterPath ? 'tweeter' : 'site'}
        data-tweeter-era={isTweeterPath ? (profile?.tweeterTheme ?? 'modern') : undefined}
        data-tweeter-color-mode={isTweeterPath ? (profile?.tweeterMode ?? 'dark') : undefined}
        data-maintenance-active={maintenanceBlocked ? 'true' : 'false'}
        data-tweeter-maintenance-active={tweeterMaintenanceBlocked ? 'true' : 'false'}
      >
        {maintenanceBlocked ? (
          <MaintenancePage settings={maintenance} />
        ) : tweeterMaintenanceBlocked ? (
          <TweeterMaintenancePage settings={maintenance} />
        ) : (
          <>
            <a className="skip-link" href="#main-content">Skip to content</a>
            <MaintenanceAccessGuard />
            <Header />
            <div id="main-content" tabIndex={-1}>
              {children}
            </div>
            <Footer />
          </>
        )}
      </body>
    </html>
  );
}
