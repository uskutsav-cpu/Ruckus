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

Users can change leaderboard/history/preferences, request an export, block users, and
request deletion. Export request generation/delivery and production retention periods
must be approved and deployed by the owner. Privacy and Terms pages are drafts requiring
legal review; they are not represented as attorney-approved.
