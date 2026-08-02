# Growth, ambassadors, and campaigns

Ruckus growth surfaces are aggregate by construction. No routine in this area
returns a student record, and every ranking either covers organizations (public
entities) or respects the student's own leaderboard opt-out.

## Semesters and semester XP

Each campus has at most one current semester, enforced by a partial unique index.
Every `xp_ledger` insert accrues against the campus's current semester through the
`xp_ledger_accrue_semester` trigger, so semester standings never require a full
ledger rescan. Penalties are clamped at zero: a semester total cannot go negative.

`roll_over_campus_semester` closes the current term and opens the next one without
deleting the closed term's standings, so historical semesters stay readable.

## Semester leaderboard

`get_semester_leaderboard` includes a student only when `leaderboard_visible` is
true in their existing profile preferences, and excludes banned or
deletion-requested profiles. A student who has opted out still receives their own
rank and XP in the `viewer` field — hiding from others never hides the board from
you.

## Ambassador programme

Students apply with a motivation statement; campus administrators review. A
partial unique index allows only one open application per student.

Approval activates the ambassador and mints a dedicated `ambassador` referral
code, keeping ambassador-driven signups attributable separately from ordinary peer
referrals. Retiring an ambassador deactivates that code so no further signups are
attributed to a programme the person has left.

Tiers (`rookie` → `builder` → `leader`) are recomputed by
`recompute_ambassador_tiers` from **qualified** referrals only. A referral
qualifies only after the referred student completes a verified event check-in, so
bulk signups cannot inflate standing.

`get_my_ambassador_dashboard` returns counts only. An ambassador never learns who
used their code.

## Campaigns and printable assets

Campaigns (`welcome_week`, `orientation`, `club_fair`, `custom`) are created by
announcement managers or campus administrators and are bounded to 120 days.

Campaign assets carry a random 128-bit token, never a campus or campaign
identifier, so a printed poster discloses nothing about the institution that
produced it. Destinations must be `ruckus://` deep links; off-scheme URLs are
rejected, which keeps a printed Ruckus asset from being repointed at an external
phishing page.

`record_campaign_scan` counts a scan once per asset per day per salted
fingerprint. Only a hash is stored — never a device identifier or IP address — and
the caller receives the destination link and nothing else: no campaign name, no
campus, no counts. Scans outside the campaign window, or against a cancelled
campaign, still resolve the link but are not counted.

## Referral fraud protection

Attribution already rejects self-referral, cross-campus codes, and repeat
attribution. In addition, `referrals_enforce_velocity` caps a single code at 25
attributed signups per rolling day, which is the cheapest referral abuse to run.

## Organization competitions

Competitions rank organizations on `verified_checkins`, `events_hosted`, or
`qualified_referrals` over a bounded window. Standings cover organizations rather
than students, so no per-student suppression applies; restricted organizations are
excluded, and organizations with a zero score are omitted. Reading standings
requires membership of the competition's own campus.

## Growth analytics

`get_campus_growth_analytics` is limited to campus analysts and administrators and
bounded to 400 days. It shares the campus administration privacy threshold: a
new-student cohort below 5 is withheld as `null` with
`newStudentsSuppressed: true`, rather than reported as a small number or rounded.

## Tests

- `supabase/tests/16_ambassadors_and_semesters.test.sql` — 38 tests
- `supabase/tests/17_campaigns_competitions_growth.test.sql` — 35 tests
