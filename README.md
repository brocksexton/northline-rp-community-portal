# Northline RP Community Portal

A rebuilt Next.js community portal for **Northline RP**, a s&box server running the **Northbound RP / ApeTavern / aperp** gamemode.

The app is designed for your current Windows deployment model:

- s&box and the website run on the same Windows machine.
- Next.js listens on `127.0.0.1:3000`.
- Caddy reverse-proxies `https://northline.lol` to the local Next.js server.
- Northbound RP JSON files remain the source of truth.

## What this rebuild includes

- Professional Northline branding and public landing page.
- Steam OpenID login.
- Player dashboard with character, economy, needs, stats, property layouts, phone summary, related logs, and guide progress.
- Privacy-safe public profiles.
- Public player directory.
- City feed powered by in-game `tweeter.json`.
- Server status page with data-path health, population, host metrics, staff notices, and recent connections.
- Public-safe ban list with live temporary-ban state.
- Guides, rules, and future supporter policy pages.
- Read-only staff operations page with admin/chat/damage logs.
- Windows-oriented scripts and Caddy example.

## Requirements

- Node.js 20.11+.
- npm 10+.
- Read access to the folder containing Northbound RP data files such as:
  - `player_save_data.json`
  - `tweeter.json`
  - `server_config.json`
  - `roles.json`
  - `player_roles.json`
  - `blacklist.json`
  - `connection_logs/`
  - `chat_logs/`
  - `admin_logs/`
  - `damage_logs/`
  - `property_layouts/`
  - `phone_messages/`

## Install

```powershell
npm install
copy .env.example .env.local
notepad .env.local
```

Set the real paths in `.env.local`.

```dotenv
SITE_URL=https://northline.lol
NEXT_PUBLIC_SITE_URL=https://northline.lol
APE_RP_DATA_PATH=C:\Path\To\aperp
NORTHLINE_DATA_PATH=C:\Servers\northline-data
SESSION_SECRET=replace-with-a-long-random-value
STEAM_API_KEY=
ENABLE_DEV_STEAM_LOGIN=false
DEV_STEAM_ID=
```

`APE_RP_DATA_PATH` must be the folder that directly contains `player_save_data.json`.

## Build and run

```powershell
npm run build
npm run start
```

The production start script binds to `127.0.0.1:3000` for Caddy.

## Caddy

Use the included `Caddyfile.example` as the shape:

```caddyfile
northline.lol {
  encode zstd gzip

  reverse_proxy 127.0.0.1:3000 {
    header_up Host {host}
    header_up X-Forwarded-Host {host}
    header_up X-Forwarded-Proto {scheme}
    header_up X-Forwarded-For {remote_host}
  }
}
```

Steam OpenID needs `SITE_URL=https://northline.lol` so the callback is generated as:

```text
https://northline.lol/api/auth/steam/callback
```

## Data safety model

The website reads game data. It should not directly mutate Northbound RP JSON save files.

Public pages intentionally avoid exposing:

- Exact inventory contents.
- Phone message bodies.
- Private staff evidence.
- Raw damage/chat/admin logs.
- Sensitive gameplay state that can be abused for metagaming.

Future write features such as web Tweeter posting, moderation actions, or supporter entitlements should use a signed game bridge with audit logs and rate limiting.

## Future supporter policy

The `/support` page is intentionally checkout-free. It defines the future monetization boundary:

- Cosmetic and community-facing perks are acceptable.
- Gameplay power is not acceptable.
- Never sell money, items, XP, weapons, job access, police access, property advantage, reduced punishments, or moderation preference.

## Useful scripts

```powershell
npm run dev       # local development on 0.0.0.0:3000
npm run build     # production build
npm run start     # production start on 127.0.0.1:3000
npm run start:lan # production start on 0.0.0.0:3000
npm run typecheck # TypeScript validation
npm run validate  # typecheck + build
```

## Notes

- `next`, `react`, and `react-dom` are pinned instead of using `latest`.
- Next.js is pinned to a patched 15.x release line.
- The portal can run without `STEAM_API_KEY`, but Steam names/avatars will be less rich.
- Development login only works when `ENABLE_DEV_STEAM_LOGIN=true`.
