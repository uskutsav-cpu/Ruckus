# Campus administration

Campus administration gives university staff campus-scoped operational tools. It is
deliberately separate from platform administration: a campus role never grants
`profiles.role = 'admin'`, and platform administration is never assignable through
any campus routine.

## Roles

| Role                    | Overview | Verification | Announcements | Safety | Audit | Export |
| ----------------------- | -------- | ------------ | ------------- | ------ | ----- | ------ |
| `viewer`                | yes      | no           | no            | no     | yes   | no     |
| `analyst`               | yes      | no           | no            | no     | yes   | yes    |
| `organization_verifier` | yes      | yes          | no            | no     | no    | no     |
| `moderator`             | yes      | no           | no            | yes    | no    | no     |
| `announcement_manager`  | yes      | no           | yes           | no     | no    | no     |
| `administrator`         | yes      | yes          | yes           | yes    | yes   | yes    |

Only a platform administrator may call `assign_campus_admin_role` or
`revoke_campus_admin_role`, and only for a profile that already belongs to the target
campus with a verified university email domain. Assignments are soft-revoked so the
grant history survives for audit.

## Scoping

Every routine takes an explicit `target_campus_id` and re-checks the caller's active
assignment for that campus through `ruckus_private.has_campus_admin_role`. Holding a
role on one campus grants nothing on another. Campus administration tables have row
level security enabled and all `anon`/`authenticated` grants revoked, so the only
path to them is a security definer routine that enforces the role check first.

## Privacy

The overview reports campus-level aggregates only; it never returns a student record.
Cohorts smaller than the minimum cohort size (5) are withheld rather than rounded or
estimated:

- `counts.activeUsers` is `null` when the cohort is below the threshold, and
  `counts.activeUsersSuppressed` states that suppression happened.
- Daily report trend entries carry `count: null` with `suppressed: true` for the same
  reason.

`export_campus_aggregate_csv` emits daily aggregate rows only, is bounded to 400 days,
and records every export in `campus_admin_export_audit`.

## Separation of duties

Announcements move through `draft → pending_approval → scheduled → published →
expired`. `approve_campus_announcement` rejects any attempt by the author to approve
their own announcement, so a second person always reviews campus-wide messaging.
Approved announcements must publish within a 30-day window.

`publish_due_campus_announcements` is service-role only and runs from the
`campus-announcement-publisher` Edge Function on a schedule. Students read published
announcements through `get_campus_announcements`, which filters to the reader's own
campus and audience and never exposes author or approver identity.

## Audit

Every state-changing routine writes to `campus_admin_audit_log`: role grants and
revocations, verification approvals, denials and revocations, announcement drafting,
submission, approval and rejection, moderation escalation, and escalation resolution.
Audit reading is itself a privileged capability limited to `viewer`, `analyst`, and
`administrator`.

## Tests

`supabase/tests/15_campus_administration.test.sql` covers schema shape, grant
lockdown, role assignment authority, cross-campus isolation, privacy suppression,
the verification queue lifecycle, announcement separation of duties, audience
scoping, audit access control, and export bounds.
