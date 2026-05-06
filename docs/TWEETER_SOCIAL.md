# Tweeter website social layer

Tweeter follows and DMs are stored by the website only. They do not write into Northbound RP or S&box save data.

## Storage

By default, social data is stored in:

```txt
.northline-data/tweeter-social-store.json
```

If `NORTHLINE_DATA_PATH` is set, it stores there instead:

```txt
NORTHLINE_DATA_PATH/tweeter-social-store.json
```

## Features

- Follow/unfollow public Tweeter profiles.
- Direct message signed-in users from profiles.
- Read conversations at `/tweeter/messages`.

## Future bridge note

If Northbound RP later gains official follow/message support, this file can be treated as a temporary website-side social layer and migrated or retired.
