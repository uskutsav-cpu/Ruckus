# Architecture

Campus Clash uses a typed Expo Router client and a Supabase backend. The client is
untrusted: authorization, matching, group assignment, check-in, XP, and administrative
operations are enforced in Postgres functions and Edge Functions.

## Boundaries

- `app/` owns navigation and screen composition.
- `src/features/` owns feature queries and mutations.
- `src/domain/` contains deterministic rules with no React or Supabase dependency.
- `src/lib/` owns infrastructure adapters and validated configuration.
- `supabase/` is the source of truth for data integrity and authorization.

Client writes are limited by RLS. Multi-row operations execute in one Postgres
transaction behind narrow RPC functions. Edge Functions authenticate callers and
coordinate trusted side effects such as Expo push delivery; the service-role key never
ships in the application.

## Data and trust flow

### Activity discovery

`activity_feed` omits venue columns and filters to the signed-in user's campus,
onboarding state, future swipe window, and unswiped sessions. The table privilege on
`activity_sessions` also excludes venue columns, so a client cannot bypass the view
with a different select.

### Matching

`process_swipe_and_match` owns the right-swipe, waitlist, and group transaction:

1. Validate authentication, email-domain access, age attestation, onboarding, campus,
   and session timing.
2. Acquire a transaction advisory lock for the activity session.
3. Select compatible campus waiters while excluding blocks and overlapping groups.
4. Lock every provisional member profile in UUID order.
5. Re-check overlap after the locks, then create the group, memberships, and
   confirmation rows and mark waitlist rows matched.

The session lock prevents two groups consuming the same waitlist rows. Ordered profile
locks prevent two concurrent requests for different, overlapping sessions from
assigning the same student twice.

### Check-in and XP

The QR contains a random, short-lived value. An Edge Function peppers and hashes it;
only the digest reaches `checkin_tokens`. Redemption hashes the scanned value and calls
`redeem_checkin_token_digest`, which locks the token, validates membership,
confirmation and event time, then inserts the unique check-in and append-only XP row in
one transaction. Duplicate scans return the existing check-in and zero new XP.

### Realtime

Persisted messages use Postgres Changes with message-table RLS. Broadcast and Presence
use private `group:<uuid>` channels authorized by policies on `realtime.messages`.
Only active group members can subscribe or publish.
