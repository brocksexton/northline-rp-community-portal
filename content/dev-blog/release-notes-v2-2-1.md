---
title: "Northline RP Community Portal v2.2.1"
date: "2026-05-06T16:42:12Z"
version: "2.2.1"
---

# Northline RP Community Portal v2.2.1

## TypeScript config hotfix

- Removed deprecated `compilerOptions.baseUrl` from `tsconfig.json`.
- Kept the `@/*` path alias through explicit `paths` entries.
- Removed the temporary `ignoreDeprecations` setting because it is no longer needed after removing `baseUrl`.

This addresses TypeScript 6.x error TS5101:

> Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.
