# Architecture

Ruckus is a typed Expo Router client over a Supabase trust boundary. `app/` composes
public/auth/onboarding/protected routes; `src/features/` owns typed reads and mutations;
`src/domain/` owns deterministic rules; `src/lib/` owns validated infrastructure;
`supabase/` is authoritative for authorization and multi-row correctness.

## Event transaction

Discover reads a privacy-safe scored feed. Join calls `join_event`, which authenticates,
checks campus/profile/event/block eligibility, obtains an event advisory lock, locks
RSVP state, assigns confirmed/pending/waitlisted without exceeding capacity, records
history, grants chat only when confirmed, and queues a deduplicated notification.
Cancellation performs the inverse and promotes the earliest valid waitlist member in
the same transaction.

## Read models and Realtime

Dedicated functions/views expose public pages, discovery, event detail, organizer
attendees, organization dashboard, chat messages, and moderation queue. They omit or
redact sensitive columns. Event Realtime uses private `event:<uuid>` topics and repeats
confirmed-attendee/host authorization. Database history remains authoritative;
broadcast only triggers refetch and never grants access.

## Server operations

Postgres owns RSVP, organization roles, check-in, XP, referrals, account requests,
moderation, and notification claiming. Edge Functions own raw QR hashing, push vendor
calls/receipts, scheduled sweeps, partnership abuse controls, and deletion purge. The
mobile client uses only public project configuration; service credentials and peppers
remain server-only.

Check-in QR values are random and short-lived. Only peppered digests reach Postgres;
redemption locks the token and atomically writes the unique attendance and XP facts.
Referral qualification is triggered only from verified event check-in.

## Secondary subsystem

Ruckus Crews preserves the earlier overlap-safe small-group matcher. It uses session
advisory locks and ordered profile locks to prevent concurrent double assignment. It is
an optional activity feature, not the primary event RSVP/chat path.

See `docs/DATABASE.md`, `docs/RLS_AUTHORIZATION_MATRIX.md`, `docs/THREAT_MODEL.md`, and
`docs/NOTIFICATIONS.md` for detailed contracts.
