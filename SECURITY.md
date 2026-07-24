# Security

This document evolves with the implementation. The baseline rules are:

- A university email verifies access to an allowed email domain; it is not proof of
  identity.
- The application is restricted to users who attest that they are at least 18.
- The mobile bundle contains only the Supabase URL and publishable key.
- Every exposed table uses RLS, with privileges revoked where direct writes are unsafe.
- XP, check-ins, matching, account deletion, and privileged moderation run only through
  trusted server operations.
- Check-in QR values are short lived; only a one-way digest is stored.
- Exact or background location is never collected.
- Meetings are group-based and reveal only approved public venues.

## Authorization matrix

| Resource        | Student read             | Student write          | Trusted write            |
| --------------- | ------------------------ | ---------------------- | ------------------------ |
| Private profile | Own row                  | Safe own columns       | Auth trigger/admin       |
| Activity feed   | Same-campus safe columns | None                   | Admin                    |
| Swipes/waitlist | Own rows                 | RPC only               | Matching transaction     |
| Groups/members  | Active groups only       | Leave/confirm RPC      | Matching/admin           |
| Messages        | Active groups only       | Own text, rate limited | System/admin             |
| Check-in tokens | None                     | None                   | Host/admin Edge Function |
| Check-ins       | Own rows                 | None                   | Redemption transaction   |
| XP ledger       | Own rows                 | None                   | Trusted functions only   |
| Push prefs      | Own row                  | RPC only               | Notification workers     |
| Dispatch marks  | None                     | None                   | Cron Edge Function       |
| Push receipts   | None                     | None                   | Receipt Edge Function    |
| Blocks          | Own outgoing blocks      | RPC/delete             | Moderation               |
| Reports         | Admin only               | Insert only            | Admin review             |
| Admin actions   | Admin only               | None                   | Moderation functions     |

Table and column grants are restricted in addition to RLS. This matters for sensitive
columns such as the venue, role, token digest, moderation state, and email verification
timestamps.

## Threat model

- **Forged XP or attendance:** client roles have no insert/update/delete privilege on
  `xp_ledger` or `checkins`; security-definer functions validate the authenticated
  caller and enforce idempotency.
- **Reusable QR capture:** raw values expire within five minutes, only digests are
  stored, tokens can be revoked/rotated, and redemption also checks the event window,
  group, active membership, and attendance confirmation.
- **Double assignment:** advisory and ordered row locks serialize competing matches,
  followed by an overlap re-check in the same transaction.
- **Chat enumeration:** group tables and messages use active-membership RLS; private
  channel policies repeat that requirement.
- **Venue scraping:** direct client column privileges omit venue data. The lobby RPC
  reveals it only to active members of confirmed groups.
- **Block bypass:** matching checks blocks pairwise. Creating a block through the RPC
  withdraws the blocker from waitlists and shared active groups; lobby, leaderboard,
  and avatar access also filter blocked relationships.
- **Credential leakage:** only the publishable key is accepted in mobile configuration.
  Secret keys and the check-in pepper are Edge Function secrets.
- **Notification route injection:** push payload routes are length-limited and matched
  against known local route patterns; URLs, query strings, and unknown screens fail
  closed.
- **Cron invocation:** scheduled functions disable gateway JWT verification only
  because they require an independent 32+ character secret checked without
  early-exit string comparison.
- **Deletion incompleteness:** deletion requests immediately disable social
  participation and tokens; the scheduled purge removes avatar objects and hard-deletes
  Auth after seven days so profile-owned rows cascade and retained messages anonymize.

## Verification

`supabase/tests/01_rls.test.sql` runs attempted prohibited reads and writes as an
authenticated student, including forged XP, arbitrary check-ins, role escalation,
venue/token reads, nonmember chat, and moderation access.

`supabase/tests/02_matching.test.sql` verifies minimum-size formation, idempotent
duplicates, block exclusion, and overlap rejection.
`supabase/tests/03_checkin.test.sql` verifies a valid redemption, duplicate idempotency,
one XP award, and nonmember rejection. `supabase/tests/04_reports.test.sql` verifies
member-scoped user, group, and message reports plus arbitrary-target rejection.
`npm run test:matching` sends four parallel authenticated requests against the local
stack and asserts a single group and single assignment per user.
