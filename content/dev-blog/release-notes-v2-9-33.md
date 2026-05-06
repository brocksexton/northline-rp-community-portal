---
title: "Northline RP Community Portal v2.9.33"
date: "2026-05-06T23:35:00Z"
version: "2.9.33"
---

# Northline RP Community Portal v2.9.33

## Staff server admin hotfix

- Fixed the production build error in `lib/server-admin.ts` caused by a server-control command variable being inferred too narrowly.
- Clarified server admin setup docs for installs without a direct console command bridge.
- Documented that start/update/kill/restart use local server scripts directly, while kick/ban/broadcast commands are queued unless a bridge script is configured.
- Kept the default script paths aligned with `C:\Servers\Scripts\Run-NorthboundRP.bat` and `C:\Servers\Scripts\update_sbox.bat`.
