import { NextRequest } from 'next/server';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
const STEAM_OPENID_NAMESPACE = 'http://specs.openid.net/auth/2.0';
const STEAM_OPENID_IDENTITY_SELECT = `${STEAM_OPENID_NAMESPACE}/identifier_select`;

export type SteamProfile = {
  steamId: string;
  personaName: string;
  profileUrl: string;
  avatar: string;
  avatarMedium: string;
  avatarFull: string;
  personaState: number;
};

function configuredSiteUrl(): string | null {
  const value = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (!value) return null;
  return value.replace(/\/$/, '');
}

function forwardedOrigin(request: NextRequest): string | null {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!host) return null;
  const proto = request.headers.get('x-forwarded-proto') || (request.nextUrl.protocol === 'https:' ? 'https' : 'http');
  return `${proto}://${host}`.replace(/\/$/, '');
}

export function getExternalOrigin(request?: NextRequest): string {
  const configured = configuredSiteUrl();
  if (configured) return configured;
  if (request) return forwardedOrigin(request) || request.nextUrl.origin.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export function isSecureOrigin(origin: string): boolean {
  return origin.startsWith('https://');
}

function sameOriginUrl(value: string | null, fallback: string): string {
  if (!value) return fallback;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const parsed = new URL(value);
    const site = new URL(getExternalOrigin());
    if (parsed.origin === site.origin) return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    // ignore malformed return URL
  }
  return fallback;
}

export function normalizeReturnTo(value: string | null): string {
  return sameOriginUrl(value, '/dashboard');
}

export function buildSteamLoginUrl(origin: string): string {
  const base = origin.replace(/\/$/, '');
  const returnTo = `${base}/api/auth/steam/callback`;
  const params = new URLSearchParams({
    'openid.ns': STEAM_OPENID_NAMESPACE,
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': base,
    'openid.identity': STEAM_OPENID_IDENTITY_SELECT,
    'openid.claimed_id': STEAM_OPENID_IDENTITY_SELECT,
  });
  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

function extractSteamIdFromClaimedId(claimedId: string): string | null {
  const match = claimedId.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{15,20})$/);
  return match?.[1] ?? null;
}

export async function verifySteamCallback(callbackUrl: URL): Promise<string | null> {
  const claimedId = callbackUrl.searchParams.get('openid.claimed_id') || '';
  const identity = callbackUrl.searchParams.get('openid.identity') || '';
  const opEndpoint = callbackUrl.searchParams.get('openid.op_endpoint') || '';
  const ns = callbackUrl.searchParams.get('openid.ns') || '';
  if (ns !== STEAM_OPENID_NAMESPACE) return null;
  if (opEndpoint !== STEAM_OPENID_URL) return null;
  if (claimedId !== identity) return null;
  const steamId = extractSteamIdFromClaimedId(claimedId);
  if (!steamId) return null;

  const params = new URLSearchParams(callbackUrl.searchParams);
  params.set('openid.mode', 'check_authentication');
  const response = await fetch(STEAM_OPENID_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const body = await response.text();
  const valid = body.split('\n').map((line) => line.trim()).includes('is_valid:true');
  return valid ? steamId : null;
}

export async function getSteamProfiles(steamIds: Array<string | number | null | undefined>): Promise<Map<string, SteamProfile>> {
  const key = process.env.STEAM_API_KEY?.trim();
  const uniqueIds = [...new Set(steamIds.map((id) => String(id ?? '')).filter((id) => /^\d{15,20}$/.test(id)))];
  const profiles = new Map<string, SteamProfile>();
  if (!key || uniqueIds.length === 0) return profiles;

  const params = new URLSearchParams({ key, steamids: uniqueIds.slice(0, 100).join(',') });
  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?${params.toString()}`;
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return profiles;
    const data = (await response.json()) as {
      response?: { players?: Array<{ steamid: string; personaname: string; profileurl: string; avatar: string; avatarmedium: string; avatarfull: string; personastate: number }> };
    };
    for (const player of data.response?.players ?? []) {
      profiles.set(player.steamid, {
        steamId: player.steamid,
        personaName: player.personaname,
        profileUrl: player.profileurl,
        avatar: player.avatar,
        avatarMedium: player.avatarmedium,
        avatarFull: player.avatarfull,
        personaState: player.personastate,
      });
    }
    return profiles;
  } catch {
    return profiles;
  }
}

export async function getSteamProfile(steamId: string | null): Promise<SteamProfile | null> {
  if (!steamId) return null;
  const profiles = await getSteamProfiles([steamId]);
  return profiles.get(steamId) ?? null;
}
