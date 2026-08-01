# Staging release v1

This is the single ordered runbook for the first connected Ruckus staging beta. It
does not authorize production, public distribution, an App Store submission, or a
Google Play submission.

## Current release state

- Branch: `staging-release-v1`, created from clean `ui-polish-v2`.
- Hosted Supabase: not linked, created, or modified.
- EAS: not authenticated, initialized, or built.
- Native devices: no smoke-test item has been run.
- Production: untouched.
- Known gate: `expo-dev-client` is not installed. Installing it requires explicit
  approval for a package-registry download before either development build can start.
- Known gate: the EAS CLI is not installed. Its download also requires explicit
  approval before Expo login or cloud-build work.

Every unchecked item below is a release blocker unless it explicitly says otherwise.
Never mark a remote action complete from a local or demo-mode result.

## Exact ordered checklist

### Actions Codex can perform without credentials

1. [x] Confirm the starting branch is `ui-polish-v2` and the worktree is clean.
2. [x] Create and switch to `staging-release-v1`; do not merge it to `main`.
3. [x] Audit release documentation, Expo/EAS config, Supabase migrations and
       functions, CI, push, deep links, Storage, RLS, and Auth redirects.
4. [x] Add explicit `development`, `staging`, and `production` runtime modes.
5. [x] Make staging/production config fail when the build target, hosted project ref,
       URL, publishable key, university domain, or EAS project ID is inconsistent.
6. [x] Keep the stable app name `Ruckus`, identifiers
       `com.campusclash.app`, and `campusclash` URL scheme.
7. [x] Add a visible staging marker to pre-authentication and protected screens.
8. [x] Add the native icon, Android adaptive icon, and splash mark from the existing
       Ruckus visual language.
9. [x] Add `supabase/staging/seed.sql` with UT Austin catalog data and no Auth users,
       passwords, messages, private data, or production data.
10. [x] Make the concurrent-matching harness require explicitly supplied test users
        for every non-local Supabase URL.
11. [x] Run `npm run verify`, credential-free config checks, and all-platform exports.
12. [x] Inspect the final diff for secrets and unrelated product changes.
13. [x] Commit the verified local release preparation on `staging-release-v1`.
14. [x] Stop before package downloads or hosted mutations and request the release
        owner’s explicit approval/authentication for the next gated section.

### Actions requiring the release owner’s Supabase login and hosted-project approval

Do not begin this section until the release owner has authenticated and explicitly
authorized a dedicated hosted staging project. Do not paste access tokens, database
passwords, service-role keys, or function secrets into chat.

15. [ ] Sign in interactively:

    ```sh
    npx supabase login
    ```

16. [ ] In the Supabase dashboard, create or select a dedicated staging project with
        no production data. Record its 20-character project ref locally.
17. [ ] Confirm the project ref is not a production ref, then authorize Codex to link:

    ```sh
    npx supabase link --project-ref <staging-project-ref>
    ```

18. [ ] Verify `supabase/.temp/project-ref` equals the authorized staging ref. Stop on
        any mismatch.
19. [ ] Preview the exact migration set; do not include the local seed:

    ```sh
    npx supabase db push --linked --dry-run
    ```

20. [ ] Review the preview, then explicitly authorize and apply migrations:

    ```sh
    npx supabase db push --linked
    ```

21. [ ] Deploy the four user-authenticated functions:

    ```sh
    npx supabase functions deploy match-activity-session generate-checkin-token redeem-checkin notify-chat-message
    ```

22. [ ] Deploy the three cron-authenticated functions with platform JWT verification
        disabled; each function still verifies the independent cron header:

    ```sh
    npx supabase functions deploy notification-sweep process-push-receipts purge-deleted-accounts --no-verify-jwt
    ```

23. [ ] In Supabase Dashboard → Edge Functions → Secrets, set independent random
        values for `CHECKIN_TOKEN_PEPPER` and `CRON_SECRET`. Set `EXPO_ACCESS_TOKEN` only
        if Expo push access-token security is enabled. Never use an `EXPO_PUBLIC_*` name.
24. [ ] Configure controlled staging schedules: `notification-sweep` every five
        minutes, `process-push-receipts` every 15 minutes, and
        `purge-deleted-accounts` daily. Store the cron header only in the scheduler and
        Edge Function secrets.
25. [ ] In Dashboard → Authentication → URL Configuration, set the staging site URL
        and redirect allowlist to:

    ```text
    campusclash://auth/callback
    ```

26. [ ] In Dashboard → Authentication, keep email confirmation enabled and verify a
        confirmation email returns to the installed staging build—not a browser-only or
        production route.
27. [ ] In Dashboard SQL Editor, apply `supabase/staging/seed.sql` only after confirming
        the dashboard project ref again. Never apply `supabase/seed.sql` remotely; it is
        deterministic local-only data.
28. [ ] Verify the UT Austin campus row is active with `email_domain = 'utexas.edu'`.
29. [ ] Verify both Storage buckets are private and retain their migration-defined
        limits:

    ```sql
    select id, public, file_size_limit
    from storage.buckets
    where id in ('activity-images', 'avatars')
    order by id;
    ```

30. [ ] Verify Storage and table RLS policies exist, and Realtime publication includes
        the intended group/chat tables. Do not edit policies unless a test proves a defect.
31. [ ] Run the linked pgTAP suite:

    ```sh
    npx supabase test db --linked
    ```

32. [ ] Record the migration version, function deployment versions, pgTAP result,
        bucket result, and authorization-denial evidence in the release record.

### Actions requiring the release owner’s Expo login

33. [ ] Explicitly approve the package-registry downloads, install the missing
        development-client dependency, and re-run local verification:

    ```sh
    npx expo install expo-dev-client
    npm run verify
    ```

34. [ ] Install/use the EAS CLI and sign in interactively:

    ```sh
    npx eas-cli login
    ```

35. [ ] Create or select the dedicated Ruckus EAS project and run `eas init` only with
        the release owner’s approval. Record its UUID; do not change the stable app
        identifiers.
36. [ ] In the EAS `preview` environment only, create these mobile-safe values:

    - `EXPO_PUBLIC_SUPABASE_URL=https://<staging-project-ref>.supabase.co`
    - `EXPO_PUBLIC_SUPABASE_PROJECT_REF=<staging-project-ref>`
    - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<staging publishable/anon client key>`
    - `EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN=utexas.edu`
    - `EXPO_PUBLIC_EAS_PROJECT_ID=<EAS project UUID>`

    Use `eas env:create --environment preview --name <NAME>` and enter each value only
    in the interactive prompt or EAS dashboard. Do not define service-role, database,
    cron, check-in, or production credentials in EAS.

37. [ ] List the EAS `preview` variable names and verify no production project ref is
        present:

    ```sh
    eas env:list --environment preview
    ```

38. [ ] Resolve the staging Expo config with the EAS `preview` variables and confirm:
        app name `Ruckus`, bundle/package `com.campusclash.app`, scheme `campusclash`,
        runtime `staging`, backend `connected`, and the intended EAS project UUID.
39. [ ] Configure Android and iOS push credentials when available. Record credential
        presence and ownership, never credential values.

### Actions requiring Apple Developer credentials

40. [ ] Ensure the release owner’s Apple Developer team controls
        `com.campusclash.app`.
41. [ ] Register each intended physical iOS device with EAS when prompted; an internal
        development build must include those device UDIDs in its provisioning profile.
42. [ ] Let EAS create or select the development certificate and provisioning profile
        interactively. Do not export or commit certificate files.
43. [ ] With steps 33–42 complete, start the iOS cloud development build:

    ```sh
    eas build --profile staging-development --platform ios
    ```

44. [ ] Record the iOS EAS build ID, commit SHA, build URL, bundle identifier,
        provisioning-device list, and installation URL/QR. Do not call the build passed
        until it installs and opens on a registered physical device.

### Actions requiring Google Play credentials

45. [x] No Google Play credential is required for this internal Android development
        APK. Do not create a Play submission, service account, production build, or public
        listing during this release.

### Remaining Expo action for the Android build

46. [ ] With steps 33–39 complete, start the Android cloud development build:

    ```sh
    eas build --profile staging-development --platform android
    ```

47. [ ] Record the Android EAS build ID, commit SHA, build URL, package identifier, and
        APK installation URL/QR. Do not call the build passed until it installs and opens
        on a physical Android device.

### Actions requiring controlled UT Austin test accounts and physical devices

48. [ ] Install the iOS build on a registered physical iPhone and the Android APK on a
        physical Android device. Record model, OS, build ID, commit SHA, and install time.
49. [ ] Create four disposable, release-owner-controlled `@utexas.edu` accounts
        through the staging app. Use a strong temporary password stored only in a local
        password manager or ignored local environment file.
50. [ ] After the accounts are onboarded, run the hosted concurrency harness using the
        staging publishable client key only:

    ```sh
    SUPABASE_URL="https://<staging-project-ref>.supabase.co" \
    SUPABASE_PUBLISHABLE_KEY="<staging publishable key>" \
    MATCHING_TEST_SESSION_ID="<staging session UUID>" \
    MATCHING_TEST_EMAILS="<email1>,<email2>,<email3>,<email4>" \
    MATCHING_TEST_PASSWORD="<temporary test password>" \
    npm run test:matching
    ```

    Enter values locally, do not paste them into chat, do not commit them, and do not
    use a service-role key.

51. [ ] Run every item in the physical-device matrix below and attach evidence.
52. [ ] Record every failure using the bug record below. Fix only proven staging or
        native reliability defects and add a regression test.
53. [ ] Re-run the affected automated, database, and device checks after each fix.
54. [ ] Confirm no critical crash remains and all release-candidate requirements are
        evidenced.
55. [ ] Provide the 12-part completion report at the end of this document. Describe
        the result only as a staging beta or staging release candidate.

## Physical-device smoke matrix

Use `Not run`, `Pass`, `Fail`, or `Blocked`. `Pass` requires an actual physical-device
observation; simulator, web, SQL, or unit-test evidence is not a substitute.

|   # | Test                                       | Status  | Device/build/evidence |
| --: | ------------------------------------------ | ------- | --------------------- |
|   1 | Registration                               | Not run |                       |
|   2 | University-email verification              | Not run |                       |
|   3 | Sign-in and session restoration            | Not run |                       |
|   4 | Onboarding                                 | Not run |                       |
|   5 | Activity loading                           | Not run |                       |
|   6 | Left and right swipes                      | Not run |                       |
|   7 | Four concurrent users joining one activity | Not run |                       |
|   8 | Exactly one group forming                  | Not run |                       |
|   9 | Confirmation flow                          | Not run |                       |
|  10 | Private group lobby                        | Not run |                       |
|  11 | Private Realtime chat                      | Not run |                       |
|  12 | Unauthorized chat access denial            | Not run |                       |
|  13 | Push notification in foreground            | Not run |                       |
|  14 | Push notification in background            | Not run |                       |
|  15 | Push notification while terminated         | Not run |                       |
|  16 | Host QR generation                         | Not run |                       |
|  17 | Cross-device QR scanning                   | Not run |                       |
|  18 | Successful check-in                        | Not run |                       |
|  19 | Duplicate check-in protection              | Not run |                       |
|  20 | XP award                                   | Not run |                       |
|  21 | Leaderboard update                         | Not run |                       |
|  22 | Rating flow                                | Not run |                       |
|  23 | Blocking                                   | Not run |                       |
|  24 | Reporting                                  | Not run |                       |
|  25 | Account deletion request                   | Not run |                       |
|  26 | Offline and reconnection behavior          | Not run |                       |
|  27 | Browser/deep-link routing                  | Not run |                       |
|  28 | Sign-out and sign-in again                 | Not run |                       |

## Bug record

Create one record per proven defect. Do not use this table for feature requests or
visual redesign.

| Field                       | Required evidence                                        |
| --------------------------- | -------------------------------------------------------- |
| Device and operating system | Model plus exact OS version                              |
| Build identifier            | EAS build ID and commit SHA                              |
| Reproduction steps          | Minimal numbered sequence                                |
| Expected result             | Existing intended behavior                               |
| Actual result               | Observed behavior, logs/screenshots with secrets removed |
| Root cause                  | Confirmed code/config cause                              |
| Fix                         | Smallest staging/native reliability change               |
| Regression test             | Automated test or repeated device step                   |

## Release-candidate gate

All items must be evidenced before calling this a staging beta release candidate:

- [ ] Hosted staging Supabase is linked; migrations and all seven functions deployed.
- [ ] Linked pgTAP, RLS-denial, and concurrent-matching checks pass.
- [ ] iOS and Android development builds install and open on physical devices.
- [ ] Staging authentication, matching, private chat, cross-device QR, idempotent XP,
      push, blocking, reporting, and deletion pass.
- [ ] No secret is committed or included in the mobile bundle.
- [ ] No critical crash remains.
- [ ] Existing automated tests and web/iOS/Android exports pass.

## Completion report template

1. **Actions completed:** Pending.
2. **Actions that required login or approval:** Pending.
3. **Staging Supabase project status:** Not linked or deployed.
4. **Migrations and functions deployed:** None.
5. **iOS development-build status and installation instructions:** Not built.
6. **Android development-build status and installation instructions:** Not built.
7. **Native-device tests completed:** None.
8. **Tests not yet completed:** All hosted, build, and physical-device checks.
9. **Bugs found and fixed:** None from connected/native testing yet.
10. **Remaining launch blockers:** `expo-dev-client` and EAS CLI approval/install,
    Supabase and Expo authentication/authorization, hosted deployment, signed builds,
    four test accounts, and physical-device evidence.
11. **Git commits created:** Add verified commit SHA(s) after step 13.
12. **Exact next action for the release owner:** Explicitly approve the
    `expo-dev-client` registry download, then authenticate Supabase and authorize a
    dedicated staging project without sharing credentials in chat.

Reference procedures:
[Supabase local-to-hosted workflow](https://supabase.com/docs/guides/local-development/cli-workflows),
[Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
[Supabase Edge secrets](https://supabase.com/docs/guides/functions/secrets),
[Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/),
and [EAS environment variables](https://docs.expo.dev/eas/environment-variables/).
