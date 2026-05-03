# Northline RP Data Privacy Matrix

| Data source | Public default | Player dashboard | Staff page | Notes |
| --- | --- | --- | --- | --- |
| Steam name/avatar | Yes | Yes | Yes | Public Steam profile data when `STEAM_API_KEY` is configured. |
| RP display name | Yes | Yes | Yes | Main citizen identity field. |
| SteamID64 | Limited | Yes | Yes | Public profile URLs use SteamID64; avoid overusing elsewhere. |
| Role name | Yes | Yes | Yes | Consider hiding special roles later if metagaming becomes a problem. |
| Cash/bank | No | Yes | Yes | Never public by default. |
| Inventory/equipment | No | Count only | Yes, future detail | Exact inventory is sensitive gameplay data. |
| Playtime | Yes | Yes | Yes | Public playtime is acceptable as community identity. |
| Needs/health | No | Yes | Yes | Current state can be abused for metagaming. |
| Tracked stats | Summary | Yes | Yes | Public stats should be opt-in/showcase oriented long term. |
| Property layouts | Summary only | Yes | Yes | Public pages show counts/summaries, not exact coordinates. |
| Phone messages | No | Summary only | Restricted future | Message bodies should stay private. |
| Tweeter posts | Yes | Yes | Yes | In-game public feed. |
| Chat logs | No | Own recent only | Yes | Staff moderation data. |
| Admin logs | No | Related only | Yes | Keep detailed evidence staff-only. |
| Damage logs | No | Related only | Yes | Sensitive moderation/evidence data. |
| Ban list | Public-safe | Yes | Yes | Reasons should be sanitized. |
| Warnings/mutes | No | Future owner view | Yes | Avoid public shaming unless policy explicitly says otherwise. |
