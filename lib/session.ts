import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { getExternalOrigin, isSecureOrigin } from '@/lib/steam-openid';

const COOKIE_NAME = 'northline_steam_session';
const SECURE_COOKIE_NAME = '__Host-northline_steam_session';
const RETURN_TO_COOKIE = 'northline_auth_return_to';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const PROFILE_EDIT_TOKEN_TTL_SECONDS = 60 * 30;

function getSecret(): string {
  const value = (process.env.SESSION_SECRET || '').trim();
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set to a long random value in production.');
  }
  return 'dev-secret-change-me';
}

function sign(value: string): string {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function safeCompare(suppliedValue: string, expectedValue: string): boolean {
  const supplied = Buffer.from(suppliedValue);
  const generated = Buffer.from(expectedValue);
  if (supplied.length !== generated.length) return false;
  return crypto.timingSafeEqual(supplied, generated);
}

export function createSessionCookieValue(steamId: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(12).toString('base64url');
  const payload = `v1.${steamId}.${issuedAt}.${nonce}`;
  return `${payload}.${sign(`session.${payload}`)}`;
}

export function createProfileEditToken(steamId: string): string {
  const safeSteamId = String(steamId || '').trim();
  const expiresAt = Math.floor(Date.now() / 1000) + PROFILE_EDIT_TOKEN_TTL_SECONDS;
  const payload = `${safeSteamId}.${expiresAt}`;
  return `${payload}.${sign(`profile-edit.${payload}`)}`;
}

export function verifyProfileEditToken(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const [steamId, expiresAtRaw, signature] = raw.split('.');
  if (!steamId || !expiresAtRaw || !signature || !/^\d{15,20}$/.test(steamId)) return null;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return null;
  const payload = `${steamId}.${expiresAtRaw}`;
  const expected = sign(`profile-edit.${payload}`);
  return safeCompare(signature, expected) ? steamId : null;
}

export function verifySessionCookieValue(value: string | undefined): string | null {
  if (!value) return null;
  const parts = value.split('.');
  if (parts[0] === 'v1') {
    const [, steamId, issuedAtRaw, nonce, signature] = parts;
    if (!steamId || !issuedAtRaw || !nonce || !signature || !/^\d{15,20}$/.test(steamId)) return null;
    const issuedAt = Number(issuedAtRaw);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(issuedAt) || issuedAt > now + 60 || issuedAt < now - SESSION_MAX_AGE_SECONDS) return null;
    const payload = `v1.${steamId}.${issuedAtRaw}.${nonce}`;
    return safeCompare(signature, sign(`session.${payload}`)) ? steamId : null;
  }
  const [steamId, signature] = parts;
  if (!steamId || !signature || !/^\d{15,20}$/.test(steamId)) return null;
  // Backwards compatibility for sessions issued before v2.9.91. They expire naturally by cookie max-age.
  return safeCompare(signature, sign(steamId)) ? steamId : null;
}

export async function getSessionSteamId(): Promise<string | null> {
  const jar = await cookies();
  return verifySessionCookieValue(jar.get(SECURE_COOKIE_NAME)?.value)
    ?? verifySessionCookieValue(jar.get(COOKIE_NAME)?.value);
}

export function getSessionSteamIdFromRequest(request: NextRequest): string | null {
  return verifySessionCookieValue(request.cookies.get(SECURE_COOKIE_NAME)?.value)
    ?? verifySessionCookieValue(request.cookies.get(COOKIE_NAME)?.value);
}

function cookieSecureForRequest(request?: NextRequest): boolean {
  if (!request) return (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').startsWith('https://');
  return isSecureOrigin(getExternalOrigin(request));
}

function baseCookieOptions(request?: NextRequest) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: cookieSecureForRequest(request),
    path: '/',
    priority: 'high' as const,
  };
}

export function setSessionCookie(response: NextResponse, steamId: string, request?: NextRequest): NextResponse {
  const value = createSessionCookieValue(steamId);
  const options = {
    ...baseCookieOptions(request),
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
  response.cookies.set(COOKIE_NAME, value, options);
  if (options.secure) {
    response.cookies.set(SECURE_COOKIE_NAME, value, options);
  }
  return response;
}

export function refreshSessionCookie(response: NextResponse, steamId: string | null | undefined, request?: NextRequest): NextResponse {
  if (!steamId) return response;
  return setSessionCookie(response, steamId, request);
}

export function setAuthReturnToCookie(response: NextResponse, returnTo: string, request?: NextRequest): NextResponse {
  response.cookies.set(RETURN_TO_COOKIE, returnTo, {
    ...baseCookieOptions(request),
    maxAge: 60 * 10,
  });
  return response;
}

export function clearAuthCookies(response: NextResponse, request?: NextRequest): NextResponse {
  for (const name of [COOKIE_NAME, SECURE_COOKIE_NAME, RETURN_TO_COOKIE]) {
    response.cookies.set(name, '', {
      ...baseCookieOptions(request),
      maxAge: 0,
    });
  }
  return response;
}

export function noStoreHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
    'Surrogate-Control': 'no-store',
    Vary: 'Cookie, Authorization',
    Pragma: 'no-cache',
    Expires: '0',
  };
}

export function withNoStoreHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(noStoreHeaders())) response.headers.set(key, value);
  return response;
}

export function jsonWithSession(body: unknown, init: ResponseInit | undefined, steamId: string | null | undefined, request: NextRequest): NextResponse {
  const response = NextResponse.json(body, init);
  withNoStoreHeaders(response);
  return refreshSessionCookie(response, steamId, request);
}

export const sessionCookieName = COOKIE_NAME;
export const secureSessionCookieName = SECURE_COOKIE_NAME;
export const authReturnToCookieName = RETURN_TO_COOKIE;
