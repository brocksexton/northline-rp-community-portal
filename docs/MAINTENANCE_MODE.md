# Maintenance Mode

Developer accounts can turn maintenance mode on from `/staff`.

When enabled, normal visitors see a custom maintenance page instead of the website. Developer accounts still bypass the page after signing in through Steam, so the site can be checked before reopening it.

Settings are stored in:

```txt
.northline-data/site-maintenance.json
```

or, if configured:

```txt
NORTHLINE_DATA_PATH/site-maintenance.json
```

Available options:

- enabled / disabled
- headline
- message
- optional countdown time
- visual theme
- accent color
- Discord/update button toggle
- Discord/update URL

The maintenance page does not change game data and does not modify player saves.
