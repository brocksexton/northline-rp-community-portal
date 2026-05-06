# Optional server status heartbeat

The portal can infer status from connection logs, but the cleanest signal is a small heartbeat file written by the game server or a local watchdog.

Place this file at:

```text
%APE_RP_DATA_PATH%/server_status.json
```

Recommended shape:

```json
{
  "isOnline": true,
  "playerCount": 0,
  "maxPlayers": 64,
  "lastHeartbeatUtc": "2026-05-06T19:00:00.000Z"
}
```

Supported aliases include:

- Online flag: `isOnline`, `online`, `serverOnline`, `running`, `isRunning`, `isListening`
- Status text: `status`, `state`, `serverState` with values like `online`, `offline`, `running`, `stopped`
- Player count: `playerCount`, `playersOnline`, `onlineCount`, `currentPlayers`, `connectedPlayers`
- Max players: `maxPlayers`, `slots`
- Timestamp: `timestamp`, `updatedAt`, `lastUpdatedUtc`, `heartbeatUtc`, `lastHeartbeatUtc`, `lastSeenUtc`, `generatedAt`

If this file is absent, the portal falls back to connection-log inference. The fallback marks the server as offline when there are no connected players and the newest connection signal is older than `config.status.offlineAfterMinutes`.


## Direct server query fallback

When `server_status.json` is missing or does not provide a usable status, the portal now sends a Source/S&Box UDP server query to the configured game server. By default it checks `203.0.113.10:27015`.

Environment overrides:

- `NORTHLINE_SERVER_QUERY_HOST` or `SBOX_SERVER_HOST`
- `NORTHLINE_SERVER_QUERY_PORT` or `SBOX_SERVER_PORT`
- `NORTHLINE_SERVER_QUERY_TIMEOUT_MS` or `SBOX_SERVER_QUERY_TIMEOUT_MS`

If the query times out or fails, the website treats the server as offline instead of showing a misleading `0 online` state.
