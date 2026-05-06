---
title: "v2.7.7 — Tweeter Profile Covers"
date: "2026-05-06T16:42:12Z"
version: "2.7.7"
---

# v2.7.7 — Tweeter Profile Covers

This pass expands Tweeter profile customization while keeping the overall Twitter-style feel intact.

## Added

- Safe profile cover presets for all users.
- S&box/Facepunch-inspired cover options using official sbox.game visual assets.
- Custom cover image URL support for Trusted/staff/elevated accounts only.
- Public profile theme choices that visitors see on the user’s Tweeter profile:
  - Clean
  - Arcade
  - Sunset
  - Noir
- Profile summary now shows the selected profile look.

## Privacy / moderation

- Regular users can choose from safe presets but cannot set arbitrary cover images.
- Custom cover URLs are server-validated and only accepted for accounts above the default User role.
- Custom cover URLs must be direct image URLs ending in .png, .jpg, .jpeg, .webp, .gif, .avif, or .svg.

## Notes

- Tweeter feed layout and existing theme eras/modes were kept intact.
- This builds on v2.7.6.
