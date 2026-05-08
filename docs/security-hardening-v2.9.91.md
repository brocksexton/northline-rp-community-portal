# Northline RP Web Security Hardening — v2.9.91

This pass focuses on practical protections for the Northline RP portal while keeping the site easy to run on the same Windows host as the S&Box server.

## Added protections

- Same-origin checks for state-changing `/api/*` requests, except bot bridge endpoints that use a shared secret.
- Global API rate limiting in middleware to slow down abuse and accidental request loops.
- Stronger session cookies with signed payloads that include issue time and a nonce.
- Production guard that requires `SESSION_SECRET` to be configured.
- Timing-safe comparison for Discord/bot shared secrets.
- Security headers on dynamic pages and API responses:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: SAMEORIGIN`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Permissions-Policy` disabling unused browser capabilities
  - CSP guardrails for `base-uri`, `object-src`, `frame-ancestors`, and `form-action`
- Request body size checks on sensitive write endpoints:
  - profile settings
  - data deletion requests
  - staff server console actions
- Tighter rate limits on sensitive operations:
  - data export downloads
  - deletion requests
  - profile settings saves
  - staff server console actions

## Operational recommendations

- Keep `SITE_URL` and `NEXT_PUBLIC_SITE_URL` set to the canonical HTTPS site URL.
- Set `SESSION_SECRET` to a long random value and keep it stable. Changing it logs everyone out.
- Set `NORTHLINE_BOT_API_SECRET` to a different long random value.
- Keep webhook URLs, Steam API keys, Discord bot tokens, and bridge secrets in `.env.local` or server environment variables only.
- Continue running the Next.js app behind Caddy/Cloudflare with HTTPS.
- Do not expose the Next.js process directly to the public internet if Caddy is meant to be the public entry point.

## Notes

Existing login cookies remain accepted until they naturally expire, but newly-issued sessions use the stronger signed format.
