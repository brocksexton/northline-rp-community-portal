# Northline RP Community Portal v2.9.6

## Tweeter profile editing during maintenance

- Added a Tweeter-side fallback profile editor.
- When the main website is in maintenance mode but Tweeter is allowed through, signed-in users can still edit Tweeter-facing profile basics from their own Tweeter profile page.
- When the main website is open, the normal full Dashboard/Profile Studio remains the primary edit path.
- Added a safe partial-save mode to `/api/profile/settings` so the Tweeter fallback editor does not reset website-only settings, privacy modules, or showcase choices.

## Fallback editor options

- Bio
- Avatar URL
- Accent color
- Cover preset
- Custom cover URL for eligible roles
- Public profile look
- Tweeter layout era
- Tweeter color mode
