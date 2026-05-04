# Northline RP Community Portal v2.6.7

## Community homepage motion pass

This release builds on the community-first homepage and adds lightweight interactivity without touching Tweeter.

### Added
- Live homepage snapshot API at `/api/community/snapshot`.
- Homepage city stat cards now poll every 20 seconds.
- Animated number transitions for changing city stats.
- Death report highlights when new fatal events are detected.
- Fresh-chaos banner when total death count increases while the page is open.
- Poll state pill for “Live-ish,” “Checking city files,” and “Fresh chaos.”
- More playful hover effects across homepage cards, quick links, death tiles, and notices.
- Reduced-motion support for users who prefer less animation.

### Notes
- Tweeter pages/components/styles were not modified.
- The homepage still only exposes aggregate/fun community stats, not private player details.
