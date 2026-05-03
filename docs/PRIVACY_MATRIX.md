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

## v2.4 profile showcase update

Website profiles and Tweeter profiles now share the same community profile record. The profile can be public or private, and the following gameplay modules are individually opt-in:

| Module | Public default | Owner dashboard | Public when enabled | Notes |
| --- | --- | --- | --- | --- |
| Economy | Hidden | Visible | Cash, bank, and total visible funds | High metagame risk; opt-in only. |
| Inventory | Hidden | Visible | Occupied slot count and top item stacks | Does not expose phone messages or logs. |
| Stats | Hidden | Visible | Level, XP, and top tracked stats | Opt-in for achievement/showcase use. |
| Properties | Hidden | Visible | Layout names, property names, prop counts | Avoids ownership/control actions. |
| Activity | Hidden | Visible | Playtime, joined date, basic needs | Useful for public identity but opt-in only. |

Phone messages, staff logs, damage evidence, moderation notes, and private communications remain excluded from public profile rendering.
