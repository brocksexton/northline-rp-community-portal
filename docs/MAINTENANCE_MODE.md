# Maintenance Mode

Developer accounts can manage maintenance mode from `/staff`.

Settings are stored in:

```txt
.northline-data/site-maintenance.json
```

or, if configured:

```txt
NORTHLINE_DATA_PATH/site-maintenance.json
```

## Main website maintenance

When main website maintenance is enabled, regular visitors see the custom maintenance page. Developer accounts can still sign in through Steam and view the site.

Main website options:

- enabled / disabled
- headline
- message
- optional countdown time
- visual theme
- accent color
- Discord/update button toggle
- Discord/update URL
- whether Tweeter should stay open while the main site is closed

## Tweeter maintenance

Tweeter can also be paused on its own without closing the rest of the website. This shows a Tweeter-styled maintenance page only on `/tweeter` routes.

Tweeter options:

- enabled / disabled
- custom Tweeter headline
- custom Tweeter message
- optional Tweeter countdown time

Maintenance mode only affects the website view. It does not modify game data or player saves.
