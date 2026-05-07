---
title: "Northline RP Community Portal v2.9.43"
date: "2026-05-07T02:05:00-04:00"
version: "2.9.43"
---

# v2.9.43 – Server bridge Windows launch hotfix

## Fixed

- Fixed the server command bridge failing to launch `Run-NorthboundRP.bat` on Windows when the path was quoted or escaped in environment configuration.
- The bridge now sanitizes quoted path values before launching the configured server script.
- The bridge now launches Windows batch files through `cmd.exe /d /c call "path"`, which is more reliable for `.bat`/`.cmd` scripts and paths with spaces.
- Added a bridge log line showing the exact Windows command line used to start the server script.

## Notes

- Existing `.env.local` values like `NORTHLINE_START_SERVER_SCRIPT="C:\Servers\Scripts\Run-NorthboundRP.bat"` should now work, but the recommended value is still unquoted:

```env
NORTHLINE_START_SERVER_SCRIPT=C:\Servers\Scripts\Run-NorthboundRP.bat
```
