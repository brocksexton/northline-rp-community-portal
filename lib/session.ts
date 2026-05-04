import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'northline_steam_session';
const RETURN_TO_COOKIE = 'northline_auth_return_to';

function getSecret(): string {
  return process.env.SESSION_SECRET || 'dev-secret-change-me';
}

function sign(value: string): string {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');
}

export function createSessionCookieValue(steamId: string): string {
  return `${steamId}.${sign(steamId)}`;
}

const PROFILE_EDIT_TOKEN_TTL_SECONDS = 60 * 30;

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
  const supplied = Buffer.from(signature);
  const generated = Buffer.from(expected);
  if (supplied.length !== generated.length) return null;
  return crypto.timingSafeEqual(supplied, generated) ? steamId : null;
}


export function verifySessionCookieValue(value: string | undefined): string | null {
  if (!value) return null;
  const [steamId, signature] = value.split('.');
  if (!steamId || !signature || !/^\d{15,20}$/.test(steamId)) return null;

  const expected = sign(steamId);
  const supplied = Buffer.from(signature);
  const generated = Buffer.from(expected);

  if (supplied.length !== generated.length) return null;
  return crypto.timingSafeEqual(supplied, generated) ? steamId : null;
}

export async function getSessionSteamId(): Promise<string | null> {
  const jar = await cookies();
  return verifySessionCookieValue(jar.get(COOKIE_NAME)?.value);
}


export function getSessionSteamIdFromRequest(request: NextRequest): string | null {
  return verifySessionCookieValue(request.cookies.get(COOKIE_NAME)?.value);
}

export function noStoreHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };
}

export const sessionCookieName = COOKIE_NAME;
export const authReturnToCookieName = RETURN_TO_COOKIE;
