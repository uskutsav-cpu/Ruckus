# Organizer analytics

Ruckus organizer analytics are built from cached aggregate tables. Event hosts and
organization managers can inspect performance, but cannot query raw interaction,
attendance, chat, feedback, or attribution rows.

## Funnel definitions

| Metric                           | Definition                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| Feed impression                  | Deduplicated event impression accepted by the recommendation interaction API.              |
| Event-card open                  | Deduplicated `details_opened` interaction.                                                 |
| Join attempt                     | Initial or post-cancellation/rejection transition into confirmed, pending, or waitlisted.  |
| Confirmed / pending / waitlisted | Transition into the named RSVP state.                                                      |
| Cancellation                     | Transition into cancelled.                                                                 |
| Waitlist promotion               | Transition from waitlisted to confirmed.                                                   |
| Share                            | Deduplicated share interaction.                                                            |
| Referral visit                   | Per-event, per-local-day non-direct visit accepted by the attribution API.                 |
| Chat participant                 | Distinct message sender per event local day; message bodies are never read into analytics. |
| Check-in                         | Unique verified event check-in.                                                            |
| No-show                          | Final confirmed RSVP without a verified check-in after the event ends.                     |
| Rating                           | Rating from a verified attendee. No free-text feedback is collected.                       |
| Repeat attendee                  | Verified attendee with an earlier check-in at another event from the same organization.    |

Each reported rate includes its numerator, denominator, and nullable value. The detail
view rate is opens/impressions; RSVP conversion is attempts/opens; attendance conversion
is check-ins/confirmed transitions; cancellation is cancellations/(confirmed +
cancellations); no-show is no-shows/(check-ins + no-shows); waitlist conversion is
promotions/waitlist additions; share conversion is visits/shares; repeat attendance is
repeat attendees/check-ins.

## Attribution trust boundary

Sources are `direct`, `event_share_link`, `user_referral`, `ambassador`,
`organization_page`, `campus_campaign`, `qr_poster`, `public_search`,
`internal_recommendation`, and `welcome_week`.

The source is never accepted from a public query parameter. An organizer can request an
opaque 256-bit token for event-share, organization-page, or QR-poster links. Only its
SHA-256 digest is stored. Server-side campaign systems can issue the other token types.
The visit endpoint validates event, visibility, campus eligibility, digest, expiry,
revocation, and usage cap before resolving a source. Arbitrary or expired tokens fail
closed. Attribution visits cannot grant XP, referral credit, ambassador credit, or any
other reward; those remain in their separate trusted qualification workflows.

Anonymous visitor keys are local random values. Only a per-event, per-local-day digest
is retained, with a maximum 121-day retention window. No IP address, user agent, email,
phone, precise location, report, or message body is stored.

## Privacy and exports

Event time/day funnel cells below three participants are suppressed. Organization and
university-level cells use a minimum cohort of five. A heatmap always means interaction
activity by local weekday and hour; it is never a movement or location map.

CSV exports are fixed-schema daily aggregates. They contain no profile, attendee,
message, report, email, phone, or location columns. Every authorized export inserts an
immutable audit record with actor, event, organization, period, row count, and time.

Daily, weekly, monthly, and event-lifecycle ranges use the event timezone. Semester
ranges require an explicit, non-overlapping campus semester configuration; the server
does not guess academic boundaries.

## Operations

Invoke `analytics-maintenance` on a regular schedule with the shared `CRON_SECRET`. The
job deterministically refreshes the latest 400 days and deletes expired attribution
visits. Organizer reads refresh only their selected event and range so recently changed
funnels do not wait for cron.
