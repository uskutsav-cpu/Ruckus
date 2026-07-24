# Ruckus visual QA checklist

This is the manual acceptance plan for the Ruckus interface. Static checks and Expo
exports do not count as visual inspection. Every box below is intentionally unchecked
until a person verifies it on the named viewport or physical device.

## Preview setup

### Credential-free demo

Start the explicit local demo without creating a Supabase client:

```sh
EXPO_PUBLIC_APP_ENV=development \
EXPO_PUBLIC_SUPABASE_URL= \
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY= \
npx expo start --clear
```

Open the QR code in Expo Go, or press `i`, `a`, or `w` for an available simulator,
emulator, or web browser. Choose **Explore the demo** on the welcome screen. The
persistent **DEMO PREVIEW** banner must remain visible throughout protected routes.

The demo includes stable activities, a pending activity, one crew, member cards,
private-chat examples, a local rotating QR, profile/XP history, and all three
leaderboard periods. Demo completion screens must explicitly say that no real
authentication, matching, messaging, report, block, attendance, rating, XP, push, or
account action occurred.

### Connected development

Copy `.env.example` to `.env`, set a valid local or staging Supabase project URL and
publishable key, then use:

```sh
npm run start
```

For native module acceptance, build and install a development client:

```sh
eas build --profile development --platform ios
eas build --profile development --platform android
npx expo start --dev-client --clear
```

`npm run ios` and `npm run android` create local native development builds when Xcode
or Android Studio is configured. Expo Go is useful for visual exploration, but it is
not sufficient to accept remote push delivery, production deep links, or every native
permission behavior.

## Target matrix

### Physical devices

- [ ] iPhone SE-class device, 375 × 667 points, current supported iOS
- [ ] iPhone 15/16-class device, 393 × 852 points, notched or Dynamic Island
- [ ] iPhone Pro Max-class device, 430 × 932 points
- [ ] Small Android device, 360 × 640 dp, three-button navigation
- [ ] Pixel-class Android device, approximately 412 × 915 dp, gesture navigation
- [ ] Android device with camera cutout and large display/font scaling

Record the model, OS version, build ID, appearance mode, text scale, and result for
each physical-device run.

### Web and responsive viewports

- [ ] 320 × 568
- [ ] 375 × 667
- [ ] 393 × 852
- [ ] 768 × 1024
- [ ] 1024 × 768
- [ ] 1440 × 900

At desktop widths, verify that the 560-point content cap creates a focused mobile
canvas without stretching cards, controls, or text lines.

## Screen-by-screen matrix

For every row, check both appearance columns and repeat at least once with large text.

| Screen or state                                 | Light | Dark | What to verify                                                              |
| ----------------------------------------------- | ----- | ---- | --------------------------------------------------------------------------- |
| Welcome                                         | [ ]   | [ ]  | Hero image crop, headline, contrast, demo entry, safe areas                 |
| Sign up                                         | [ ]   | [ ]  | Keyboard flow, validation, long university email, disabled/loading states   |
| Sign in                                         | [ ]   | [ ]  | Password keyboard, error notice, demo explanation, back behavior            |
| Verify email                                    | [ ]   | [ ]  | Long email wrapping, resend state, deep-link callback                       |
| Root loading                                    | [ ]   | [ ]  | Centering, status bar, no layout flash                                      |
| Backend configuration error                     | [ ]   | [ ]  | Malformed/partial configuration copy and readable variable names            |
| Age and safety                                  | [ ]   | [ ]  | Scroll reachability, deliberate attestation, blocked continue state         |
| Onboarding profile                              | [ ]   | [ ]  | Photo permission, keyboard avoidance, 3–5 interests, long bio               |
| Activity deck                                   | [ ]   | [ ]  | Photography, gesture thresholds, haptics, empty/offline/error states        |
| Activity detail modal                           | [ ]   | [ ]  | Sheet transition, image crop, small-screen scroll, decision actions         |
| Group-unlocked result                           | [ ]   | [ ]  | Celebration motion and reduced-motion behavior                              |
| Pending activities                              | [ ]   | [ ]  | Real image, schedule, honest counts, cancellation copy, empty/offline/error |
| Confirmed crews list                            | [ ]   | [ ]  | Status, progress, countdown, venue lock, long activity title                |
| Crew lobby: pending                             | [ ]   | [ ]  | Confirm/decline actions, deadline, member statuses                          |
| Crew lobby: confirmed                           | [ ]   | [ ]  | Venue reveal, safety reminder, chat/check-in actions                        |
| Crew lobby: cancelled/expired/completed/removed | [ ]   | [ ]  | Correct primary action and no inaccessible controls                         |
| Crew chat                                       | [ ]   | [ ]  | Own/other/system messages, day groups, pagination, empty state              |
| Crew chat sending/failure                       | [ ]   | [ ]  | Optimistic bubble, retry, rate-limit copy, offline composer                 |
| Host QR                                         | [ ]   | [ ]  | Loading, rotation timer, offline credential hiding, error/retry             |
| Member scanner                                  | [ ]   | [ ]  | Permission unknown/denied/blocked, framing, compact phone layout            |
| Scanner processing/errors                       | [ ]   | [ ]  | Invalid, wrong crew, expired/replaced, network, no raw token                |
| Check-in result                                 | [ ]   | [ ]  | Success, already checked in, XP, explicit demo preview                      |
| Rating                                          | [ ]   | [ ]  | 1–5 selection, keyboard, disabled/loading/error, demo result                |
| Profile                                         | [ ]   | [ ]  | Avatar fallback, long name, campus/year, level/XP, ledger                   |
| Edit profile                                    | [ ]   | [ ]  | Photo picker, keyboard, validation, interest wrapping, fixed footer         |
| Leaderboard                                     | [ ]   | [ ]  | Weekly/monthly/all-time switch, current rank, empty/loading/error           |
| Report compose                                  | [ ]   | [ ]  | Categories, long context, block explanation, keyboard                       |
| Report review/result                            | [ ]   | [ ]  | Confirmation, report-only, report+block, partial block failure, demo        |
| Safety center                                   | [ ]   | [ ]  | Serious visual tone, public-meeting and no-location guidance                |
| Community guidelines                            | [ ]   | [ ]  | Numbered rules, text scaling, full scroll                                   |
| Emergency information                           | [ ]   | [ ]  | Warning prominence, no implied real-time monitoring                         |
| Settings appearance                             | [ ]   | [ ]  | System/light/dark switching and status bar update                           |
| Notification preferences                        | [ ]   | [ ]  | Master/dependent switches, saved/error copy, denied permission              |
| Privacy & data use                              | [ ]   | [ ]  | Missing approved-document warning and data boundaries                       |
| Account deletion review                         | [ ]   | [ ]  | Offline state, DELETE confirmation, keep-account escape                     |
| Deletion success                                | [ ]   | [ ]  | Immediate sign-out and seven-day success explanation                        |
| Pending deletion guard                          | [ ]   | [ ]  | Social access blocked, purge date, support limitation, sign out             |
| Global recovery boundary                        | [ ]   | [ ]  | Theme consistency, readable error, successful retry                         |

## Interaction and device checks

### Keyboard and text

- [ ] Inputs remain visible above the iOS and Android keyboards.
- [ ] Multiline report, rating, bio, and onboarding fields can scroll to their actions.
- [ ] Return, dismiss, and hardware-back behavior does not lose unsaved text silently.
- [ ] 200% text scaling does not clip names, buttons, status pills, timers, or settings.
- [ ] Long names, activity titles, venue names, and addresses truncate or wrap
      intentionally.

### Safe areas and navigation

- [ ] Status-bar content has correct light/dark contrast on every root route.
- [ ] The demo banner clears notches/cutouts and never overlaps screen content.
- [ ] Bottom actions clear the iPhone home indicator and Android navigation area.
- [ ] Back controls and iOS edge gestures return to the expected parent.
- [ ] Android predictive back does not exit the app from a nested flow unexpectedly.
- [ ] Activity detail uses a bottom modal transition; result screens use a calm fade.
- [ ] Notification and auth deep links reject external or unallowlisted destinations.

### Offline, loading, empty, and errors

- [ ] Launching from cached state offline never creates a malformed Supabase client.
- [ ] Pending, crews, lobby, chat, scanner, host QR, and deletion show explicit offline
      behavior.
- [ ] Loading skeletons reserve final layout dimensions without visible jump.
- [ ] Empty states explain the next useful action without fabricated counts or people.
- [ ] Retry buttons recover after connectivity returns.
- [ ] Production/preview configuration failures stop at build/config validation and do
      not expose demo entry.

### Permissions and native integrations

- [ ] Camera not determined, allowed, denied, and permanently blocked states.
- [ ] Photo library not determined, allowed, limited, and denied states.
- [ ] Push permission allowed, denied, and cannot-ask-again states on physical devices.
- [ ] Host QR remains scannable at low and high display brightness.
- [ ] QR redemption never displays or logs the raw credential.
- [ ] Notification taps open only the allowlisted Ruckus route.

### Accessibility and motion

- [ ] VoiceOver traverses headings, controls, lists, chat, QR context, and results in a
      logical order.
- [ ] TalkBack announces switch, radio, tab, checkbox, busy, disabled, and progress
      states correctly.
- [ ] Every interactive target is at least 48 × 48 points/dp.
- [ ] Color is never the only indicator of selection, delivery, error, or status.
- [ ] Light and dark text/background pairs meet WCAG AA for their rendered size.
- [ ] Reduce Motion removes or softens nonessential repeated and celebration motion.
- [ ] Haptics occur only for purposeful selection, decisions, confirmation, and errors.

## Connected security and data acceptance

Use a disposable local or staging project and complete `docs/E2E_SMOKE.md`. In
particular, verify RLS isolation, matching concurrency, private Realtime chat, rotating
and replaced QR codes, idempotent XP, report/block enforcement, notification
preferences, immediate deletion sign-out, and the seven-day purge.

## Current manual verification status

No screen or physical-device check in this document has been manually verified as part
of the static implementation pass. Successful lint, TypeScript, unit tests, config
validation, and platform exports establish build integrity only. A release owner must
complete and record this checklist before describing the app as production-ready.
