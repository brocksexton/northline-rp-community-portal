---
title: "Northline RP Community Portal v2.9.45"
date: "2026-05-07T02:55:00-04:00"
version: "2.9.45"
---

# v2.9.45 – Server bridge Windows launch wrapper

## Fixed

- Reworked the built-in server bridge launch path for Windows.
- The bridge now writes a temporary wrapper command file and launches that wrapper instead of passing the quoted `.bat` path directly through `cmd.exe`.
- This prevents Windows from trying to execute a literal escaped path such as `\"C:\Servers\Scripts\Run-NorthboundRP.bat\"`.

## Improved

- Web-managed CMD windows now have clear titles:
  - `Northline RP - Discord Bot`
  - `Northline RP - Server Command Bridge`
  - `Northline RP - S&box Game Server (Bridge Managed)`
- Bridge logs now show the wrapper path and the exact command line used to start it.
