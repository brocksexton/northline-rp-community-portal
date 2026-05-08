import { NextRequest, NextResponse } from 'next/server';
import { getExternalOrigin, getSteamProfile, verifySteamCallback } from '@/lib/steam-openid';
import { authReturnToCookieName, setSessionCookie, withNoStoreHeaders } from '@/lib/session';
import { claimCommunityProfile, getCommunityProfile } from '@/lib/community-data';
import { getPlayer } from '@/lib/ape-data';
import { notifyNewWebRegistration } from '@/lib/discord-webhooks';
import { recordStaffWebsiteSignIn } from '@/lib/staff-audit-data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = getExternalOrigin(request);
  const url = new URL(request.url);
  const steamId = await verifySteamCallback(url);
  const returnTo = request.cookies.get(authReturnToCookieName)?.value || '/dashboard';

  if (!steamId) {
    return withNoStoreHeaders(NextResponse.redirect(new URL('/?login=failed', origin)));
  }

  try {
    const existingProfile = await getCommunityProfile(steamId);
    await claimCommunityProfile(steamId);
    await recordStaffWebsiteSignIn(steamId);
    if (!existingProfile) {
      const [player, steamProfile] = await Promise.all([getPlayer(steamId), getSteamProfile(steamId)]);
      await notifyNewWebRegistration({
        steamId,
        displayName: player?.RpDisplayName || player?.LastKnownDisplayName || steamProfile?.personaName || `Steam ${steamId.slice(-8)}`,
        avatarUrl: steamProfile?.avatarFull || steamProfile?.avatarMedium || steamProfile?.avatar || null,
        hasJoinedServer: Boolean(player),
        firstJoinedAt: typeof player?.FirstJoinedUtc === 'string' ? player.FirstJoinedUtc : null,
      });
    }
  } catch {
    // Authentication should still succeed if the local profile store or Discord notifier is temporarily unavailable.
  }

  const response = withNoStoreHeaders(NextResponse.redirect(new URL(returnTo, origin)));
  setSessionCookie(response, steamId, request);
  response.cookies.set(authReturnToCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https://'),
    path: '/',
    maxAge: 0,
  });
  return response;
}
