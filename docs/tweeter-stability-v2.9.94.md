# Tweeter stability pass v2.9.94

This pass focuses on making Tweeter reliable across visuals, interaction state, and API handling.

## Visual stability

- Root layout now marks Tweeter routes with `data-app-section="tweeter"`, plus the active Tweeter era and color mode.
- The Tweeter stylesheet no longer depends only on `:has(.tweeter-mode)` for critical background/theme isolation.
- Light Mode and Twitter Blue now force page, rail, feed, panel, message, profile, composer, and post surfaces through Tweeter theme variables.
- Timeline tabs are normalized to three columns.
- Tweet action rows are normalized to five columns: reply, repost, like, bookmark, share.
- Bottom-left current-user avatar sizing is constrained to prevent image overflow.
- Themed scrollbars continue to inherit the active Tweeter mode.

## Interaction reliability

- Timeline refresh now reports a dismissible warning if the API refresh fails and keeps the last known-good timeline visible.
- Copy/share uses a visible copied state and falls back to a prompt when Clipboard API access is unavailable.
- Timeline tabs now expose `role="tab"` and `aria-selected` state.

## API and data safety

- `/api/tweeter` now refreshes the signed session response consistently.
- `/api/tweets` now returns the sanitized public Tweeter payload instead of raw export rows.
- Follow, message, like, and bookmark endpoints now validate SteamIDs/tweet IDs before processing.
- Follow and message endpoints reject self-targeting.
- Tweeter social store mutations are serialized per process to reduce JSON-file race conditions from simultaneous likes/bookmarks/follows/DMs.
