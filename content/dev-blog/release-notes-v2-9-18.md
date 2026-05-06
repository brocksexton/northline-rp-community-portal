---
title: "Northline RP Community Portal v2.9.18"
date: "2026-05-06T19:05:18Z"
version: "2.9.18"
---

# Northline RP Community Portal v2.9.18

## Build hotfix

- Fixed a TypeScript build failure in the Tweeter staff filter-word panel where the Clear button passed a mouse event into `resetRuleForm`.
- Replaced legacy CSS `align-items: start/end` values with `flex-start/flex-end` to quiet autoprefixer warnings during production builds.
- Keeps the v2.9.17 hashtag filtering and improved sparkle polish intact.
