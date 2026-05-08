import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getExternalOrigin } from '@/lib/steam-openid';
import { noStoreHeaders } from '@/lib/session';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export function safeTimingEqual(left: string, right: string): boolean {
  const a = Buffer.from(left || '');
  const b = Buffer.from(right || '');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function rateLimit(request: NextRequest, scope: string, limit: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  const key = `${scope}:${clientIp(request)}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  current.count += 1;
  if (current.count <= limit) return null;
  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return NextResponse.json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    { status: 429, headers: { ...noStoreHeaders(), 'Retry-After': String(retryAfter) } },
  );
}

export async function readJsonBody<T extends Record<string, unknown> = Record<string, unknown>>(request: NextRequest, maxBytes = 64 * 1024): Promise<T> {
  const length = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(length) && length > maxBytes) throw new Error('request_body_too_large');
  const body = await request.text();
  if (body.length > maxBytes) throw new Error('request_body_too_large');
  if (!body.trim()) return {} as T;
  return JSON.parse(body) as T;
}

function requestOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  if (origin) return origin;
  const referer = request.headers.get('referer');
  if (!referer) return null;
  try { return new URL(referer).origin; } catch { return null; }
}

export function isSameSiteRequest(request: NextRequest): boolean {
  const supplied = requestOrigin(request);
  if (!supplied) return false;
  try {
    return new URL(supplied).origin === new URL(getExternalOrigin(request)).origin;
  } catch {
    return false;
  }
}

export function requireSameSiteRequest(request: NextRequest): NextResponse | null {
  if (isSameSiteRequest(request)) return null;
  return NextResponse.json(
    { error: 'Security check failed. Please refresh the page and try again.' },
    { status: 403, headers: noStoreHeaders() },
  );
}

export function securityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), accelerometer=(), gyroscope=(), magnetometer=()',
    'Content-Security-Policy': "base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'",
  };
}

export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders())) response.headers.set(key, value);
  return response;
}
