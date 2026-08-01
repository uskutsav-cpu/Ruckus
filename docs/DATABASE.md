# Database model

Migrations are append-only and reset-tested. `profiles` and `campuses` anchor identity.
The event domain uses `events`, `event_hosts`, `event_media`, `tags`, `event_tags`,
`event_rsvps`, status history, chat membership/messages/reactions/announcements,
check-in tokens/check-ins, and discovery decisions. Organization membership,
verification requests, audit history, referrals, badges, privacy preferences,
notification jobs, reports, moderation cases/actions, and data requests are separate
bounded domains.

`join_event` serializes an event with an advisory lock, locks relevant rows, validates
eligibility/blocks/status/capacity, writes one RSVP/history transition, and grants chat
only on confirmation. Cancellation locks the event, revokes chat, promotes the earliest
eligible waitlist row, and queues deduplicated notifications.

Raw QR values never enter Postgres; only peppered digests do. Redemption locks the
token, rejects expiry/revocation/replay/nonmembership, and writes the unique check-in
plus idempotent append-only XP. Referrals qualify only from the check-in trigger.

Index coverage targets discovery, profile RSVP/history, hosts, attendee status,
waitlist order, chat pagination/reactions, organization history, due notifications,
moderation queue, and partnership review. Run `npm run db:reset` followed by
`npm run test:db` after every schema change; regenerate `src/types/database.generated.ts`
with `npm run db:types`.
