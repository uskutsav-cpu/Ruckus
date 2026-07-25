# End-to-end smoke test

Run this checklist on both an iOS staging development build and an Android staging
development build. Use the dedicated staging Supabase project—not production. Record
an item as passed only when it was performed on the stated physical device.

## Prepare

1. Follow `docs/STAGING_RELEASE.md` to link the dedicated staging project, apply
   migrations, and apply only `supabase/staging/seed.sql`.
2. Deploy all functions listed in `docs/OPERATIONS.md`.
3. Configure the check-in pepper, cron secret, Expo project ID, and optional Expo push
   access token.
4. Build with `eas build --profile staging-development --platform ios` and repeat for
   Android.
5. Install both builds on physical devices. Push registration and camera behavior
   cannot be accepted using Expo Go; Android remote push also requires a development
   build.

## New-account path

1. Register a new controlled `@utexas.edu` account; confirm that another domain is
   rejected.
2. Verify the email link returns to the app.
3. Confirm the 18+ and safety attestation.
4. Finish all three onboarding steps with 3–5 interests.
5. Kill and reopen the app; confirm the protected route returns to the activity deck.

## Deck and matching

1. Swipe one card left and one right, then restart; neither card should return.
2. Disable the network, swipe another card, re-enable the network, and confirm the
   queued decision flushes.
3. Reset the database and run:

   ```sh
   SUPABASE_PUBLISHABLE_KEY="<local key>" npm run test:matching
   ```

4. Confirm exactly one group with four unique members.

## Lobby, chat, and safety

1. Sign in as two group members and one nonmember.
2. Confirm attendance as enough members to reveal the public venue.
3. Send messages from both member devices; verify realtime delivery, timestamp,
   pagination, optimistic state, and retry behavior.
4. Verify the nonmember cannot query the group or its messages.
5. Long-press a message and a member; submit reports and test blocking.
6. Confirm blocking removes shared participation and excludes future matching.
7. Open the safety center, emergency information, and community guidelines.

## QR, XP, and rating

1. Move a staging session into its check-in window and confirm the group.
2. As the host, open the rotating QR. As a member, scan it from the other device.
3. Confirm one check-in and +50 XP.
4. Scan the same QR again; confirm “Already checked in,” one check-in row, and no
   duplicate XP.
5. Try with a nonmember, unconfirmed member, expired code, and replaced code; each must
   fail without creating a check-in.
6. Submit a rating; confirm +10 XP appears once.
7. After the event, finalize as host; verify no-show adjustments and host-completion XP
   are idempotent.

## Notifications and lifecycle

1. Enable push permissions on a physical device and confirm one `push_tokens` row for
   its stable device ID.
2. Trigger group formed, deadline, venue, chat, event-starting, check-in, and XP events.
3. Verify each tap opens an allowlisted in-app route.
4. Disable chat reminders, then all push notifications; confirm server preferences
   change and the device token is removed when globally disabled.
5. Process a delayed Expo receipt marked `DeviceNotRegistered`; confirm the stored
   token is invalidated.
6. Submit account deletion; confirm immediate sign-out, waitlist/group removal, token
   invalidation, and the pending-deletion guard after signing in again.
7. In staging only, age the request beyond seven days and run the purge; confirm Auth,
   avatar, and profile-owned data are deleted and retained group messages are anonymous.

Record device models, OS versions, app build IDs, Supabase migration version, and any
failed step in the release ticket.
