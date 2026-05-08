import { NextRequest, NextResponse } from 'next/server';
const stateChanging = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), accelerometer=(), gyroscope=(), magnetometer=()');
  response.headers.set('Content-Security-Policy', "base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'");
  return response;
}

const middlewareBuckets = new Map<string, { count: number; resetAt: number }>();

function requestIp(request: NextRequest) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const supplied = origin || referer;
  if (!supplied) return false;
  try {
    const suppliedUrl = new URL(supplied);
    const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
    const requestProto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
    const requestOrigin = `${requestProto}://${requestHost}`;
    const configured = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || requestOrigin;
    return suppliedUrl.origin === new URL(configured).origin;
  } catch {
    return false;
  }
}

function rateLimit(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) return null;
  const now = Date.now();
  const windowMs = 60_000;
  const limit = request.nextUrl.pathname.startsWith('/api/status') || request.nextUrl.pathname.startsWith('/api/community') ? 180 : 90;
  const key = `${requestIp(request)}:${request.nextUrl.pathname}`;
  const bucket = middlewareBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    middlewareBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  bucket.count += 1;
  if (bucket.count <= limit) return null;
  return new NextResponse(JSON.stringify({ error: 'Too many requests. Please slow down and try again.' }), {
    status: 429,
    headers: {
      'content-type': 'application/json',
      'Retry-After': String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))),
    },
  });
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-northline-pathname', request.nextUrl.pathname);

  if (stateChanging.has(request.method) && request.nextUrl.pathname.startsWith('/api/') && !request.nextUrl.pathname.startsWith('/api/bot/')) {
    if (!sameOrigin(request)) {
      return applySecurityHeaders(new NextResponse(JSON.stringify({ error: 'Security check failed. Refresh the page and try again.' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }));
    }
  }

  const limited = rateLimit(request);
  if (limited) return applySecurityHeaders(limited);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Cloudflare / browser caches should never reuse logged-out HTML for a signed-in user,
  // or vice versa. Most pages render from live server files and signed cookies.
  response.headers.set('Cache-Control', 'private, no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate');
  response.headers.set('CDN-Cache-Control', 'no-store');
  response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  response.headers.set('Surrogate-Control', 'no-store');
  response.headers.set('Vary', 'Cookie, Authorization');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff2?)$).*)',
  ],
};
