import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Cloudflare / browser caches should never reuse logged-out HTML for a signed-in user,
  // or vice versa. Most pages render from live server files and signed cookies.
  response.headers.set('Cache-Control', 'private, no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate');
  response.headers.set('CDN-Cache-Control', 'no-store');
  response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  response.headers.set('Surrogate-Control', 'no-store');
  response.headers.set('Vary', 'Cookie, Authorization');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff2?)$).*)',
  ],
};
