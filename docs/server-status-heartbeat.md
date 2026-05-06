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
