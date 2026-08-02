# Privacy data map

| Data                     | Purpose                                    | Visibility                                | Retention/control                                          |
| ------------------------ | ------------------------------------------ | ----------------------------------------- | ---------------------------------------------------------- |
| Auth email/session       | Campus access and authentication           | User/Auth service                         | Session controls; deletion purge                           |
| Profile/campus/interests | Event eligibility and introductions        | Safe scoped views                         | Edit; deletion cascade/anonymization                       |
| RSVP/check-in/XP         | Capacity, attendance, anti-abuse           | User, scoped host, trusted worker         | Status history/ledger retained for integrity               |
| Event chat/reactions     | Confirmed attendee coordination            | Confirmed event members                   | Removed bodies redacted; deleted sender anonymized         |
| Blocks/reports/cases     | Safety and enforcement                     | Reporter write; admin review only         | Operational/legal retention policy owner gate              |
| Coordinates              | Optional event place                       | Hidden publicly; conditional confirmation | No location history or background collection               |
| Push token/preferences   | Notification delivery                      | Own row/trusted worker                    | Disable/unregister; invalid tokens removed                 |
| Referral                 | Attribution and verified attendance reward | Participants/trusted logic                | One attribution; no self/duplicate/cross-campus            |
| Partnership lead         | Campus launch contact                      | Service-role review                       | Rate-limited; retention policy owner gate                  |
| Analytics/logs           | Reliability and product counts             | Local/no-op by default                    | No bodies, report text, tokens, email, or precise location |
| Campus admin assignment  | Campus-scoped staff authorization          | Platform admin grant; own access readable | Soft-revoked so the grant history survives audit           |
| Campus admin audit log   | Accountability for staff actions           | Campus viewer/analyst/administrator       | Action, target type/id and actor only; no student records  |
| Campus announcements     | Campus-wide messaging                      | Published item to own campus/audience     | Author and approver never shown to students; 30-day window |
| Campus aggregate export  | Institutional reporting                    | Campus analyst/administrator              | Daily aggregates only; every export recorded for audit     |
| Semester XP              | Semester standings                         | Honors existing leaderboard opt-out       | Own rank always visible; closed semesters retained         |
| Ambassador programme     | Referral attribution and standing          | Own dashboard; campus admin review queue  | Counts only; an ambassador never sees who used their code  |
| Campaign scan            | Printed-asset effectiveness                | Aggregate daily counts to campus staff    | Salted hash only, deduplicated per day; no device ID or IP |

Users can change leaderboard/history/preferences, request an export, block users, and
request deletion. Export request generation/delivery and production retention periods
must be approved and deployed by the owner. Privacy and Terms pages are drafts requiring
legal review; they are not represented as attorney-approved.
