# Northline RP Community Portal v2.9.21

## Server status accuracy

- Added a dedicated server runtime status layer so the portal distinguishes between:
  - online with players connected
  - online but quiet / zero players
  - offline / stale server signal
  - unknown / data unavailable
- The public Status page now shows **Offline** instead of presenting an offline server as simply `0 online`.
- The homepage server card now also reflects offline state instead of only showing player count.
- `/api/status` now returns a `runtime` object with state, source, last signal time, and freshness metadata.
- Added optional support for `APE_RP_DATA_PATH/server_status.json` as a future game/server heartbeat file. If present, it is preferred over connection-log inference.
- Added `config.status.offlineAfterMinutes` so stale connection logs can be tuned without code changes.

## Notes

If no `server_status.json` heartbeat exists yet, the portal infers offline state when there are no connected players and the latest connection-log signal is older than the configured threshold.
