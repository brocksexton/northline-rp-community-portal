# Northline RP Community Portal v2.3

## Build/deployment fixes

- Removed `output: 'standalone'` from `next.config.mjs` so the normal Windows/Caddy flow can use `npm run start` again.
- Added `poweredByHeader: false` to reduce unnecessary framework disclosure.
- Updated `tsconfig.json` to use `jsx: "preserve"`, which prevents Next from rewriting the setting during build.
- Kept the TypeScript 6 `baseUrl` deprecation fix from v2.2.1.
- Changed the CSS `align-items: end` value to `align-items: flex-end` to remove the Autoprefixer warning.
- Added `npm run clean` and `npm run rebuild` scripts.
- Added an npm `overrides` entry for `postcss@8.5.10` to address the audit warning from the installed dependency tree without using `npm audit fix --force`.

## Tweeter finish pass

- Polished the Tweeter home timeline with a stronger social-product feel.
- Added a live/sync pill in the sticky top bar.
- Added an engagement summary strip for posts, authors, interactions, and last update time.
- Added a right-rail “City pulse” panel explaining the safe read-only bridge status.
- Improved disabled states for posting, follows, reposts, notifications, messages, and bookmarks.
- Removed the duplicate search icon in the right rail.
- Improved tweet body rendering for hashtags, @mentions, and URLs.
- Improved thread affordances with “Open post” / “View thread” links.
- Added a mobile Tweeter bottom navigation bar.
- Added more precise copy around safe web likes and future bridge-backed actions.

## Deployment note

Use the standard process on the Windows host:

```powershell
npm install
npm run rebuild
npm run start
```

If replacing an older extracted folder, prefer a clean folder or remove stale install/build artifacts first:

```powershell
Remove-Item -Recurse -Force .next,node_modules,package-lock.json -ErrorAction SilentlyContinue
npm install
npm run rebuild
npm run start
```
