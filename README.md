# 喝了吗 / Cheers With Me

A mobile-first PWA prototype for lightweight friend check-ins around the world.

## Prototype features

- Global dark map with friend-only drink markers
- One-time browser geolocation when the user actively checks in
- City-level or place-level location sharing
- Eight drink/glass choices, including coffee and tea for daytime use
- Two-, four-, or six-hour automatic expiry
- One-tap cloud cheers with no chat or comments
- Friend list, private invite sharing, privacy controls
- AI-generated cyber drinking-buddy identity at registration
- Optional private drinking history stored separately from expiring map presence
- AI-style nightly circle recap with cities, glasses, and clink moments
- Automatic local-time day/night interface plus a manual theme switch
- Sunlit beach day palette and black-gold-ink-green night palette with matching map tiles
- Complete Simplified Chinese, English, and Swedish interface switching, with device-language detection and a saved manual preference
- Installable PWA shell

## Interface direction

The home screen deliberately has one dominant action: choose a glass and check in. Profile and friends live in the two top corners; the map itself communicates who is currently active, so there is no feed, bottom navigation, comment UI, or redundant status copy.

The current prototype stores the user's own check-in, opt-in history preference, theme and language preferences, and new history entries locally and uses sample friend/report data. Drinking history is off by default. The included fictional AI avatar was generated specifically for this prototype. Real avatar generation, accounts, mutual friend relationships, presence, server-side recaps, push notifications, moderation/reporting, account deletion, and production privacy disclosures are required for the App Store build phase.

## Run locally

```sh
python3 -m http.server 8791 --bind 127.0.0.1
```
