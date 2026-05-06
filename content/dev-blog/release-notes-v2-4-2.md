---
title: "Northline RP Community Portal v2.4.2"
date: "2026-03-07"
version: "2.4.2"
---

# Northline RP Community Portal v2.4.2

## Build hotfix

- Fixed the Tweeter profile route typing issue where `searchParams` could be inferred as `{}` during production build.
- Kept the v2.4.1 profile/Tweeter behavior unchanged.
- Package version bumped to `2.4.2`.

Run:

```powershell
npm install
npm run rebuild
npm run start
```
