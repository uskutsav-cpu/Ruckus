# RLS and authorization matrix

| Domain                   | Anonymous                        | Authenticated member                         | Host/org manager                                   | Admin/service                      |
| ------------------------ | -------------------------------- | -------------------------------------------- | -------------------------------------------------- | ---------------------------------- |
| Public event/org pages   | Safe views only                  | Safe views                                   | Safe views                                         | Safe views                         |
| Profiles/preferences     | None                             | Own safe row/columns                         | No unrelated access                                | Scoped admin operations            |
| Events                   | Published eligible view          | Feed/detail RPC                              | Own draft/published safe updates and lifecycle RPC | Audited moderation                 |
| RSVP/history             | None                             | Own rows through trusted transitions         | Event attendee dashboard/review RPC                | No direct client mutation          |
| Event chat               | None                             | Confirmed membership only                    | Scoped event only                                  | Report-linked action only          |
| Organizations            | Public safe profile              | Own memberships/invites                      | Scoped role/member/event operations                | Verification/moderation operations |
| Check-in/XP/badges       | None                             | Own safe history; no award writes            | Rotating digest creation                           | Trusted functions only             |
| Referrals/data requests  | None                             | Own code/status; trusted attribution/request | No extra access                                    | Operational workers                |
| Reports/cases/actions    | None                             | Submit eligible target; cannot read case     | Submit/scoped content controls                     | Admin queue and audited RPC only   |
| Notification jobs/tokens | None                             | Own preference/token RPCs                    | None                                               | Service-role worker grants only    |
| Partnership leads        | Submit through hardened function | Same                                         | Same                                               | Service-role review only           |

RLS is defense in depth with table/column grants. Functions in `ruckus_private` are not
PostgREST-exposed; reviewed public wrappers and explicit execution grants are required.
Private Realtime topics repeat membership checks. pgTAP proves cross-user, cross-event,
role-escalation, case-privacy, reaction, and worker-claim denials.
