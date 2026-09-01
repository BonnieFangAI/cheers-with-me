# 喝了吗 / Cheers With Me — App Store build track

## Product promise

One intentional location share, one glass on a global friend map, and one silent cyber cheers. No chat, comments, follower counts, public feed, or drinking competition.

## Product names

- Chinese localization: `喝了吗`
- English localization: `Cheers With Me`
- Swedish localization: `Cheers With Me`
- Internal prototype slug: `cheers-map`

The final names still need App Store Connect availability and trademark checks before release.

## Release architecture

- Native app: React Native with Expo for iOS and Android
- Map: native MapLibre map with separate day/night styles
- Accounts and realtime friend presence: Supabase in an EU region
- Authentication: Sign in with Apple plus email magic link
- Push: APNs/Expo notifications for friend cheers only
- AI avatar and circle recap: server-side generation; no AI provider key in the client
- Location: foreground, one-shot permission only; manual city fallback
- Localization: Simplified Chinese, English, and Swedish at launch; device-language default plus an in-app manual switch
- Store metadata: localized name/subtitle, description, keywords, screenshots, privacy text, and support copy for all three launch languages

## App Store guardrails

- Submit with the honest alcohol-related age rating; never target children.
- Never add drinking streaks, quantity leaderboards, challenges, or rewards for drinking more.
- Private drinking history is off by default, independently consented, exportable, and deletable.
- Expiring map presence and private history are separate data records.
- Provide remove friend, block, report, support contact, and AI-image filtering.
- Provide privacy policy, data deletion, in-app account deletion, and AI processing consent.
- Review builds include a working demo account and live backend.

## Milestones

1. **Interaction prototype — in progress**
   - Global friend map, drink selection, one-shot location, expiring presence
   - AI identity preview, optional history, circle recap
   - Automatic local-time day/night themes and manual switching
   - Complete Simplified Chinese, English, and Swedish interface resources with device-language detection and manual switching

2. **Native foundation**
   - Expo app shell, native map, haptics, localization, secure storage
   - Apple/email login and in-app account deletion

3. **Private social backend**
   - Mutual friends, invitations, realtime presence, block/report
   - Push cheers, expiry jobs, city/place privacy levels

4. **AI layer**
   - Moderated avatar generation with explicit consent and deletion
   - Opt-in nightly circle recap using only active, shared check-ins

5. **TestFlight and submission**
   - Privacy labels, age-rating questionnaire, screenshots, review notes
   - Closed TestFlight circle, bug/privacy review, App Store submission
