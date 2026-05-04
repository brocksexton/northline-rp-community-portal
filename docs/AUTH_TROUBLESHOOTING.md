# Northline auth troubleshooting

## What v2.6.9 fixed

A logout link was previously implemented as a `GET` URL. Because the app uses Next navigation, that URL could be requested by link prefetching, previews, crawlers, browser helpers, or CDN probes. That could clear the Steam session without the user intentionally pressing Log out.

The fix is:

- login links to `/api/auth/steam` are now normal `<a>` links instead of Next `<Link>` navigation links;
- logout is now a `POST` form action;
- `GET /api/auth/logout` no longer clears cookies;
- auth-sensitive responses send stronger `private/no-store` and `Vary: Cookie` headers.

## Verify after deployment

1. Sign in with Steam.
2. Open:

```txt
https://northline.lol/api/auth/session
```

Expected:

```json
{
  "authenticated": true,
  "cookies": {
    "secureSessionPresent": true,
    "legacySessionPresent": true
  }
}
```

3. Refresh the endpoint several times. It should stay authenticated.
4. Navigate around the site. It should stay authenticated.
5. Press Log out. It should become unauthenticated only after the explicit logout form is submitted.

## Cloudflare settings to check

For `northline.lol`, do not cache:

- `/api/*`
- `/dashboard*`
- `/staff*`
- `/u/*`
- `/players*`
- `/tweeter*` if signed-in state matters

Create a Cache Rule or Page Rule that bypasses cache for `/api/*` at minimum.

## Environment stability

Keep the same `SESSION_SECRET` across deploys. Changing it invalidates existing cookies. Also confirm:

```env
SITE_URL=https://northline.lol
NEXT_PUBLIC_SITE_URL=https://northline.lol
```

Do not set either value to `http://127.0.0.1:3000` in production.
