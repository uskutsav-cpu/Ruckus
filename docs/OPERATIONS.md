# Operations runbook

## Required configuration

Mobile-safe variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN`
- `EXPO_PUBLIC_EAS_PROJECT_ID`
- optional `EXPO_PUBLIC_SENTRY_DSN`

Edge-only secrets, set with `supabase secrets set`:

- `CHECKIN_TOKEN_PEPPER`: independent random value of at least 32 characters
- `CRON_SECRET`: different random value of at least 32 characters
- optional `EXPO_ACCESS_TOKEN` when Expo push access-token security is enabled

Never use the service-role key in an `EXPO_PUBLIC_*` variable. Supabase supplies it to
deployed functions.

## Deploy

```sh
npx supabase db push
npx supabase functions deploy match-activity-session
npx supabase functions deploy generate-checkin-token
npx supabase functions deploy redeem-checkin
npx supabase functions deploy notify-chat-message
npx supabase functions deploy notification-sweep --no-verify-jwt
npx supabase functions deploy process-push-receipts --no-verify-jwt
npx supabase functions deploy purge-deleted-accounts --no-verify-jwt
```

The three `--no-verify-jwt` functions still require a constant-time checked
`x-campus-clash-cron-secret` header. Schedule `notification-sweep` every five minutes
`process-push-receipts` every 15 minutes, and `purge-deleted-accounts` daily using the
platform scheduler or another controlled HTTPS scheduler. Store the cron secret only
in that scheduler and Supabase secrets.

## Push delivery

The sender immediately invalidates failed tickets, queues accepted Expo ticket IDs,
and the receipt worker handles delayed `DeviceNotRegistered` failures. Scheduled
events use database idempotency markers. Alert on structured events ending in
`_failed`.

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
