# Operations runbook

## Required configuration

Mobile-safe variables:

- `EXPO_PUBLIC_APP_ENV`: `development`, `staging`, or `production`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_PROJECT_REF`
- `EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN`
- `EXPO_PUBLIC_EAS_PROJECT_ID`
- optional `EXPO_PUBLIC_SENTRY_DSN`

Edge-only secrets, set with `supabase secrets set`:

- `CHECKIN_TOKEN_PEPPER`: independent random value of at least 32 characters
- `CRON_SECRET`: different random value of at least 32 characters
- `PARTNERSHIP_RATE_LIMIT_PEPPER`: independent source-hash pepper
- `PUBLIC_SITE_ORIGIN`: exact approved HTTPS origin for partnership CORS
- optional `EXPO_ACCESS_TOKEN` when Expo push access-token security is enabled

Never use the service-role key in an `EXPO_PUBLIC_*` variable. Supabase supplies it to
deployed functions.

### Backend modes

- Local development with both Supabase variables absent starts in intentional demo
  mode. No Supabase client is constructed, and backend-only actions remain unavailable.
- Connected development requires both a valid HTTP(S) Supabase URL and a publishable
  client key. A partial or malformed pair displays an actionable setup screen.
- EAS staging-development and production profiles set `EXPO_PUBLIC_APP_ENV` and a
  matching non-public build target explicitly. Their config evaluation fails when
  the hosted Supabase URL/project ref, publishable key, university domain, EAS project
  ID, or build target is missing or inconsistent. These builds cannot silently ship
  demo mode or select the other hosted environment.
- Staging is additionally pinned to `utexas.edu` for the initial UT Austin pilot and
  visibly labels authentication and protected-app screens as staging.

The `staging-development` build profile reads EAS variables from the canonical
`preview` environment set while setting the in-app runtime to `staging`. Configure
these public client values only after the staging project and EAS project exist:

```sh
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PROJECT_REF
eas env:create --environment preview --name EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN
eas env:create --environment preview --name EXPO_PUBLIC_EAS_PROJECT_ID
```

Use only the project URL and publishable/anonymous client key. Never place a
service-role key, database password, check-in pepper, or cron secret in an
`EXPO_PUBLIC_*` variable. Configure production in the separate EAS `production`
environment only when a production release is explicitly authorized.

## Deploy

For the first staging deployment, follow `docs/STAGING_RELEASE.md` so the linked
project ref is verified before every remote operation. Never include the local
`supabase/seed.sql` in a hosted push: it contains deterministic local Auth users.

```sh
npx supabase db push
npx supabase functions deploy match-activity-session
npx supabase functions deploy generate-checkin-token
npx supabase functions deploy redeem-checkin
npx supabase functions deploy notify-chat-message
npx supabase functions deploy notification-sweep --no-verify-jwt
npx supabase functions deploy process-push-receipts --no-verify-jwt
npx supabase functions deploy purge-deleted-accounts --no-verify-jwt
npx supabase functions deploy partnership-lead --no-verify-jwt
```

The three scheduled `--no-verify-jwt` functions still require a constant-time checked
legacy `x-campus-clash-cron-secret` header, preserved for scheduler compatibility. The
public partnership function instead enforces exact-origin CORS, validation, a honeypot,
link/control-character limits, and source-hash rate limits. Schedule
`notification-sweep` every five minutes, `process-push-receipts` every 15 minutes, and
`purge-deleted-accounts` daily. Store the cron secret only in that scheduler and
Supabase secrets.

## Push delivery

The sender immediately invalidates failed tickets, queues accepted Expo ticket IDs,
and the receipt worker handles delayed `DeviceNotRegistered` failures. Crew reminders
use dispatch markers; event-first jobs use unique deduplication keys and an atomic
service-role `SKIP LOCKED` claim with bounded retry. Alert on structured events ending
in `_failed` and on permanently failed jobs.

## Account deletion

The client RPC immediately marks the profile, invalidates push tokens, withdraws
waitlists, declines pending confirmations, and leaves active groups. The daily purge
hard-deletes eligible Auth users after seven days and removes avatar objects first.
Foreign-key actions delete profile-owned rows; retained group messages set the sender
to null.

## Incident response

1. Disable the affected Edge Function or scheduler.
2. Rotate the relevant secret; rotate the check-in pepper only with an explicit plan,
   because active QR tokens become invalid.
3. Preserve structured logs and `admin_actions` records.
4. Review RLS/grants before restoring traffic.
5. Never add venue, raw QR, service key, email, or message body values to logs.
