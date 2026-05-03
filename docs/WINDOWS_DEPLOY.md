# Windows + Caddy Deployment

This package is configured for the current Northline host model:

- Next.js runs locally on `127.0.0.1:3000`.
- Caddy reverse-proxies `https://northline.lol` to `127.0.0.1:3000`.
- S&box/Northbound RP can remain on the same Windows machine.

## Clean install

```powershell
cd C:\Servers\web
Remove-Item -Recurse -Force .next,node_modules,package-lock.json -ErrorAction SilentlyContinue
npm install
npm run rebuild
npm run start
```

## Normal updates

```powershell
npm install
npm run rebuild
npm run start
```

## Why this package uses `next start`

`next.config.mjs` intentionally does not use `output: 'standalone'`. That keeps the start path simple for this server:

```powershell
next start -H 127.0.0.1 -p 3000
```

Standalone mode is useful when copying a minimal `.next/standalone` bundle to another host, but it requires running `node .next/standalone/server.js` instead of `next start`.

## Caddy reminder

Your site block should proxy to the local Next process:

```caddy
northline.lol {
  reverse_proxy 127.0.0.1:3000
}
```
