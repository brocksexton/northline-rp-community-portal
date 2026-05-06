# Maintenance Mode

Developer accounts can manage maintenance from `/staff/maintenance`.

Settings are saved to:

```txt
.northline-data/site-maintenance.json
```

or, if configured:

```txt
NORTHLINE_DATA_PATH/site-maintenance.json
```

## Main website maintenance

When main-site maintenance is enabled, regular visitors see the configured maintenance page. Developer accounts can still sign in and view the site.

The maintenance studio supports:

- preset looks
- custom headline/message/kicker
- optional countdown
- accent color
- layout style
- icon choice
- Discord/update button
- optional custom link button
- optional Visit Tweeter button when Tweeter is allowed through

## Tweeter maintenance

Tweeter can be paused separately from the rest of the website. When enabled, `/tweeter` routes show a Tweeter-styled maintenance screen with its own copy, theme, and countdown.

This allows these combinations:

- close the main website, keep Tweeter open
- close the main website and Tweeter together
- keep the main website open, pause Tweeter only

Maintenance mode only affects website views. It does not modify game data or player saves.
