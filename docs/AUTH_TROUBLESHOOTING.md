# Auth troubleshooting for northline.lol

Steam sign-in uses a signed HTTP-only cookie. If the site looks like it signs in and then immediately drops the session, check these first.

## Required environment values

```powershell
SITE_URL=https://northline.lol
NEXT_PUBLIC_SITE_URL=https://northline.lol
SESSION_SECRET=<one long stable random value>
```

Do not regenerate `SESSION_SECRET` during deploys. Changing it invalidates every existing session cookie.

## Cloudflare

Recommended Cloudflare settings:

- SSL/TLS mode: **Full (strict)** where possible.
- Do not create a Cache Rule that caches HTML pages for `northline.lol/*`.
- Bypass cache for `/api/*`.
- Bypass cache when the request has a `Cookie` header.

The app sends `Cache-Control`, `CDN-Cache-Control`, and `Cloudflare-CDN-Cache-Control` headers to discourage stale signed-out HTML, but an aggressive Cache Rule can still override expected behavior.

## Caddy reverse proxy

The included Caddy example forwards the important headers:

```caddy
header_up Host {host}
header_up X-Forwarded-Host {host}
header_up X-Forwarded-Proto {scheme}
```

Those headers let the app know the external site is `https://northline.lol`, even though Next is listening on `127.0.0.1:3000`.

## What changed in v2.6.8

- Added a `__Host-` secure session cookie alongside the legacy session cookie when served over HTTPS.
- Session reads now prefer the secure cookie but still fall back to the legacy cookie.
- Added global no-store headers through middleware.
- Added no-store Cloudflare/CDN headers to JSON API responses.
- Trimmed accidental whitespace from `SESSION_SECRET`.
