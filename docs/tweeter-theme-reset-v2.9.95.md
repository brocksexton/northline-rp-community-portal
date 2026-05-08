# Tweeter theme reset v2.9.95

This pass hard-resets Tweeter theming at the end of `app/globals.css` so older theme experiments cannot leak black/X-style surfaces into Light, Twitter Blue, Mid-2010s, or Classic layouts.

## What this targets

- Theme variables now apply to both `.tweeter-mode` and `.tweeter-shell`.
- Light and Twitter Blue no longer inherit black backgrounds from older `.tweeter-shell` rules.
- Mid-2010s uses a light, card-based Twitter-era layout with the horizontal nav and blue bird.
- Classic uses an early-Twitter-style framed layout with a teal page background.
- Dark remains the modern black/X-inspired layout.
- Profile, thread, message, rail, panel, composer, timeline, and action-row surfaces all resolve through the active Tweeter variables.

## Why this was needed

An earlier Tweeter parity pass declared `--tw-bg`, `--tw-surface`, and related variables directly on `.tweeter-shell`. Later theme passes changed variables on the body and `.tweeter-mode`, but the shell-level variables won the cascade. The v2.9.95 reset assigns the final values directly to the shell as well.
