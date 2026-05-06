---
title: "Northline RP Community Portal v2.2"
date: "2026-05-06T16:42:12Z"
version: "2.2"
---

# Northline RP Community Portal v2.2

## Focus pass: Tweeter pages, profiles, threads, and safe likes

This update expands Tweeter beyond the main timeline into a more complete social product while intentionally avoiding risky direct writes to the live S&box/Northbound RP server data.

### Added
- Individual post pages at `/tweeter/tweet/[tweetId]`.
- Thread rendering with parent posts above the selected post and replies below it.
- Tweeter-native profile pages at `/tweeter/profile/[steamId]`.
- Profile hero banners, avatar treatment, profile stats, joined date, playtime, title, and post timeline.
- Feed cards now link into post detail pages.
- Author names and suggestions now link into Tweeter profile pages instead of the main Northline profile route.
- Signed-in likes from the website.
- A like API route at `/api/tweeter/[tweetId]/like`.
- Likes are stored in the Northline community store, not written into the game server `tweeter.json` file.

### Important safety decision
Web likes are stored in `NORTHLINE_DATA_PATH/community-store.json` under `tweeterLikes`. This avoids direct mutation of the game server's live Tweeter data while still letting signed-in users interact with content on the website.

### Still intentionally disabled
- Web posting.
- Web replies.
- Web reposts.
- Web follows.
- Web notifications.

Those features should wait for a signed bridge between the web app and the S&box server process.

### Validation note
The sandbox copy does not include `node_modules`, so typecheck/build cannot be completed inside this extracted folder without installing dependencies. The intended server validation remains:

```powershell
npm install
npm run typecheck
npm run build
npm run start
```
