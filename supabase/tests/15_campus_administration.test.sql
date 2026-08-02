begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(50);

create function pg_temp.set_actor(actor_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', actor_id, 'role', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', actor_id::text, true);
end;
$$;

create function pg_temp.operation_fails(command text)
returns boolean
language plpgsql
as $$
begin
  execute command;
  return false;
exception when others then
  return true;
end;
$$;

-- A second campus proves every campus-administration surface is scoped and that
-- a privileged actor on one campus gains nothing on another.
insert into public.campuses (id, name, email_domain, timezone)
values (
  '00000000-0000-4000-8000-0000000000ff',
  'Isolation Test University',
  'isolation-test.edu',
  'America/Chicago'
);

-- ---------------------------------------------------------------------------
-- Schema shape
-- ---------------------------------------------------------------------------
select has_table('public', 'campus_admin_assignments', 'campus admin assignments table exists');
select has_table('public', 'campus_admin_audit_log', 'campus admin audit log table exists');
select has_table('public', 'campus_announcements', 'campus announcements table exists');
select has_table('public', 'campus_safety_escalations', 'campus safety escalations table exists');
select has_table('public', 'campus_admin_export_audit', 'campus admin export audit table exists');

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where relnamespace = 'public'::regnamespace
     and relname in ('campus_admin_assignments', 'campus_admin_audit_log',
                     'campus_announcements', 'campus_safety_escalations',
                     'campus_admin_export_audit')),
  'every campus administration table enforces row level security'
);

select ok(
  not has_table_privilege('authenticated', 'public.campus_admin_assignments', 'select')
  and not has_table_privilege('anon', 'public.campus_announcements', 'select')
  and not has_table_privilege('authenticated', 'public.campus_admin_audit_log', 'select'),
  'campus administration tables are reachable only through security definer routines'
);

-- ---------------------------------------------------------------------------
-- Role assignment is platform-admin only
-- ---------------------------------------------------------------------------
select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select ok(
  pg_temp.operation_fails($$select public.assign_campus_admin_role(
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002', 'administrator')$$),
  'students cannot grant campus administration roles'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000007');
select ok(
  pg_temp.operation_fails($$select public.assign_campus_admin_role(
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002', 'administrator')$$),
  'organizers cannot grant campus administration roles'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000008');
select ok(
  pg_temp.operation_fails($$select public.assign_campus_admin_role(
    '00000000-0000-4000-8000-0000000000ff',
    '10000000-0000-4000-8000-000000000002', 'administrator')$$),
  'a profile cannot be granted a role on a campus it does not belong to'
);

select isnt(
  public.assign_campus_admin_role(
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002', 'organization_verifier'),
  null,
  'platform administrators grant campus verifier roles'
);
select isnt(
  public.assign_campus_admin_role(
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003', 'announcement_manager'),
  null,
  'platform administrators grant announcement manager roles'
);
select isnt(
  public.assign_campus_admin_role(
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000004', 'administrator'),
  null,
  'platform administrators grant campus administrator roles'
);
select isnt(
  public.assign_campus_admin_role(
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000005', 'moderator'),
  null,
  'platform administrators grant campus moderator roles'
);
select isnt(
  public.assign_campus_admin_role(
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000006', 'analyst'),
  null,
  'platform administrators grant campus analyst roles'
);

select ok(
  (select count(*) from public.campus_admin_audit_log
   where action = 'campus_role_assigned') = 5,
  'each granted role writes an audit entry'
);

-- ---------------------------------------------------------------------------
-- Access descriptor
-- ---------------------------------------------------------------------------
select pg_temp.set_actor('10000000-0000-4000-8000-000000000002');
select is(
  public.get_my_campus_admin_access() -> 'platformAdministrator',
  'false'::jsonb,
  'campus roles never imply platform administration'
);
select is(
  jsonb_array_length(public.get_my_campus_admin_access() -> 'campuses'),
  1,
  'campus verifier sees exactly one campus assignment'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select is(
  jsonb_array_length(public.get_my_campus_admin_access() -> 'campuses'),
  0,
  'ordinary students hold no campus assignments'
);

-- ---------------------------------------------------------------------------
-- Overview scoping and privacy
-- ---------------------------------------------------------------------------
select ok(
  pg_temp.operation_fails($$select public.get_campus_admin_overview(
    '00000000-0000-4000-8000-000000000001')$$),
  'students cannot read the campus administration overview'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000006');
select isnt(
  public.get_campus_admin_overview('00000000-0000-4000-8000-000000000001'),
  null,
  'campus analysts read the campus overview'
);

select ok(
  pg_temp.operation_fails($$select public.get_campus_admin_overview(
    '00000000-0000-4000-8000-0000000000ff')$$),
  'campus role on one campus grants no overview access to another campus'
);

select ok(
  pg_temp.operation_fails($$select public.get_campus_admin_overview(
    '00000000-0000-4000-8000-000000000001', current_date - 900, current_date)$$),
  'oversized reporting ranges are rejected'
);

select is(
  public.get_campus_admin_overview('00000000-0000-4000-8000-000000000001')
    -> 'privacy' -> 'minimumCohort',
  '5'::jsonb,
  'the overview reports its minimum cohort size'
);

select is(
  public.get_campus_admin_overview('00000000-0000-4000-8000-000000000001')
    -> 'counts' -> 'activeUsers',
  'null'::jsonb,
  'active user cohorts below the privacy threshold are suppressed, not reported'
);

select is(
  public.get_campus_admin_overview('00000000-0000-4000-8000-000000000001')
    -> 'counts' -> 'activeUsersSuppressed',
  'true'::jsonb,
  'suppression is disclosed to the reader rather than hidden'
);

-- ---------------------------------------------------------------------------
-- Organization verification queue
-- ---------------------------------------------------------------------------
insert into public.organization_verification_requests (
  id, organization_id, requested_by, request_kind, evidence, status
) values (
  '90000000-0000-4000-8000-0000000000a1',
  '60000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000007',
  'verification',
  '{"officerEmail": "officer@demo.edu"}'::jsonb,
  'submitted'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000006');
select ok(
  pg_temp.operation_fails($$select public.get_campus_verification_queue(
    '00000000-0000-4000-8000-000000000001')$$),
  'analysts cannot open the organization verification queue'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000002');
select is(
  jsonb_array_length(public.get_campus_verification_queue('00000000-0000-4000-8000-000000000001')),
  1,
  'verifiers see the pending organization verification request'
);

select is(
  public.review_campus_organization_verification(
    '90000000-0000-4000-8000-0000000000a1', true, 'Officer roster confirmed.'),
  'approved'::public.verification_request_status,
  'verifiers approve organization verification requests'
);

select ok(
  (select is_verified from public.organizations
   where id = '60000000-0000-4000-8000-000000000001'),
  'approval marks the organization verified'
);

select ok(
  (select count(*) from public.notification_jobs
   where kind = 'organization_verification_outcome') = 1,
  'the requesting organizer is notified of the verification outcome'
);

select ok(
  pg_temp.operation_fails($$select public.review_campus_organization_verification(
    '90000000-0000-4000-8000-0000000000a1', true, 'Duplicate review.')$$),
  'an already reviewed verification request cannot be reviewed again'
);

select lives_ok(
  $$select public.revoke_campus_organization_verification(
    '60000000-0000-4000-8000-000000000001', 'Officer roster lapsed.')$$,
  'verifiers revoke organization verification'
);

select ok(
  not (select is_verified from public.organizations
       where id = '60000000-0000-4000-8000-000000000001'),
  'revocation clears the organization verified flag'
);

-- ---------------------------------------------------------------------------
-- Announcements: separation of duties
-- ---------------------------------------------------------------------------
select pg_temp.set_actor('10000000-0000-4000-8000-000000000006');
select ok(
  pg_temp.operation_fails($$select public.create_campus_announcement(
    '00000000-0000-4000-8000-000000000001', 'Analyst notice',
    'Analysts must not be able to author campus announcements.', 'all')$$),
  'analysts cannot author campus announcements'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000003');
select isnt(
  public.create_campus_announcement(
    '00000000-0000-4000-8000-000000000001', 'Welcome week hours',
    'The student union extends its hours during welcome week.', 'students'),
  null,
  'announcement managers author campus announcements'
);

select lives_ok(
  $$select public.submit_campus_announcement_for_approval(
    (select id from public.campus_announcements order by created_at desc limit 1))$$,
  'authors submit their own drafts for approval'
);

select ok(
  pg_temp.operation_fails($$select public.approve_campus_announcement(
    (select id from public.campus_announcements order by created_at desc limit 1),
    now() + interval '1 hour', now() + interval '2 days', true)$$),
  'an author cannot approve their own announcement'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000004');
select is(
  public.approve_campus_announcement(
    (select id from public.campus_announcements order by created_at desc limit 1),
    now() + interval '1 hour', now() + interval '2 days', true),
  'scheduled'::public.campus_announcement_status,
  'an independent approver schedules the announcement'
);

select ok(
  pg_temp.operation_fails($$select public.approve_campus_announcement(
    (select id from public.campus_announcements order by created_at desc limit 1),
    now() + interval '1 hour', now() + interval '90 days', true)$$),
  'announcement schedules beyond the retention window are rejected'
);

-- Bring the scheduled announcement due and publish it through the worker path.
update public.campus_announcements
set scheduled_for = now() - interval '1 minute'
where status = 'scheduled';

select ok(
  public.publish_due_campus_announcements() >= 1,
  'the scheduled publisher promotes due announcements'
);

select is(
  (select status from public.campus_announcements order by created_at desc limit 1),
  'published'::public.campus_announcement_status,
  'due announcements reach the published state'
);

-- ---------------------------------------------------------------------------
-- Student-facing announcement reader honours audience scoping
-- ---------------------------------------------------------------------------
select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select is(
  jsonb_array_length(public.get_campus_announcements()),
  1,
  'students receive announcements addressed to students'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000007');
select is(
  jsonb_array_length(public.get_campus_announcements()),
  0,
  'organizers do not receive student-only announcements'
);

-- ---------------------------------------------------------------------------
-- Audit log and aggregate export
-- ---------------------------------------------------------------------------
select pg_temp.set_actor('10000000-0000-4000-8000-000000000003');
select ok(
  pg_temp.operation_fails($$select public.get_campus_admin_audit_log(
    '00000000-0000-4000-8000-000000000001')$$),
  'announcement managers cannot read the campus audit log'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000006');
select ok(
  jsonb_array_length(public.get_campus_admin_audit_log(
    '00000000-0000-4000-8000-000000000001', 100)) > 0,
  'analysts read the campus audit log'
);

select ok(
  pg_temp.operation_fails($$select public.get_campus_admin_audit_log(
    '00000000-0000-4000-8000-000000000001', 500)$$),
  'audit log page sizes are bounded'
);

select ok(
  public.export_campus_aggregate_csv(
    '00000000-0000-4000-8000-000000000001', current_date - 30, current_date)
    like 'date,events,impressions%',
  'analysts export campus aggregates as CSV'
);

select ok(
  (select count(*) from public.campus_admin_export_audit) = 1,
  'every aggregate export is recorded for audit'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000003');
select ok(
  pg_temp.operation_fails($$select public.export_campus_aggregate_csv(
    '00000000-0000-4000-8000-000000000001', current_date - 30, current_date)$$),
  'announcement managers cannot export campus aggregates'
);

select * from finish();
rollback;
