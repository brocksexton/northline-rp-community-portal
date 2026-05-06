# Northline RP Community Portal v2.9.8

## Tweeter Lite Edit + Social Layer

- Changed the Tweeter maintenance fallback editor into a collapsed **Lite Edit** panel instead of showing the full editor immediately.
- Renamed maintenance fallback language to player-facing Lite Edit wording.
- Added more spacing around Tweeter profile headers and the Lite Edit editor.
- Added a website-only follow system for Tweeter profiles.
- Added website-only direct messages for Tweeter.
- Added `/tweeter/messages` for signed-in users.
- Added social storage at `.northline-data/tweeter-social-store.json` or `NORTHLINE_DATA_PATH/tweeter-social-store.json`.
- No writes are made to Northbound RP game save files.

## New API routes

- `GET/POST /api/tweeter/social/follow`
- `GET/POST /api/tweeter/social/messages`
