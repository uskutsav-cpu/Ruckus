# Analytics and observability

`src/lib/analytics.ts` is a vendor-neutral local/no-op adapter for product events,
performance timing, and error boundaries. No vendor is required. A future adapter may
use documented public client identifiers but never a secret key.

Allowed taxonomy: `onboarding_completed`, `discovery_card_viewed`, `event_passed`,
`join_attempted`, `rsvp_confirmed`, `rsvp_waitlisted`, `rsvp_cancelled`, `event_shared`,
`chat_opened`, `message_sent`, `checkin_completed`, `rating_submitted`, `event_created`,
`event_published`, and `referral_completed`.

Properties should be coarse state/category booleans and bounded performance values.
The sanitizer removes keys suggesting bodies, descriptions/details, email/name,
password/token/secret, precise location/coordinates, or reports. Never record message
bodies, report evidence, passwords, session/check-in tokens, full location history, or
sensitive profile fields. Server job logs use event names and error codes—not payloads.
