---
title: "Northline RP Community Portal v2.4.1"
date: "2026-05-06T16:42:12Z"
version: "2.4.1"
---

# Northline RP Community Portal v2.4.1

## Profile and Tweeter cleanup

### Fixed
- Profile settings save now sends same-origin credentials and the API route has a server-cookie fallback for Steam sessions.
- Removed the large hidden-module cards from public/Tweeter profiles. Hidden modules now stay absent instead of taking up page space.
- Private profiles now show a direct private-profile page to other users instead of a large blocked showcase area.
- Tweeter profile tabs now use real navigation: Tweets, Replies, and Info. Tweets are the default view.
- Tweeter home layout received right-rail cleanup for city pulse, suggestions, and tighter classic social layout spacing.
- Reduced likely hydration text mismatches in the Tweeter feed by using a deterministic initial feed timestamp.

### Profile behavior
- `/tweeter/profile/[steamId]` defaults to Tweets.
- `?tab=replies` shows replies.
- `?tab=info` shows public profile information and opt-in gameplay modules.
- Entirely private profiles show “This user’s profile is private.” to other users.

### Privacy
- Economy, inventory, stats, properties, and activity remain opt-in.
- Phone messages, staff logs, moderation notes, and damage/evidence logs remain private.
