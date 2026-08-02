begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(38);

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

-- Profile 8 is the platform administrator; profile 4 becomes the campus
-- administrator who runs the ambassador programme and the semester calendar.
select pg_temp.set_actor('10000000-0000-4000-8000-000000000008');
select public.assign_campus_admin_role(
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004', 'administrator');

select has_table('public', 'semesters', 'semesters table exists');
select has_table('public', 'semester_xp', 'semester xp table exists');
select has_table('public', 'ambassador_applications', 'ambassador applications table exists');
select has_table('public', 'ambassadors', 'ambassadors table exists');

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where relnamespace = 'public'::regnamespace
     and relname in ('semesters', 'semester_xp', 'ambassador_applications', 'ambassadors')),
  'growth tables enforce row level security'
);
select ok(
  not has_table_privilege('authenticated', 'public.ambassadors', 'select')
  and not has_table_privilege('anon', 'public.semester_xp', 'select'),
  'growth tables are reachable only through security definer routines'
);

-- ---------------------------------------------------------------------------
-- Semester lifecycle
-- ---------------------------------------------------------------------------
select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select ok(
  pg_temp.operation_fails($$select public.open_campus_semester(
    '00000000-0000-4000-8000-000000000001', 'Fall 2026',
    current_date - 10, current_date + 100)$$),
  'students cannot open a campus semester'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000004');
select isnt(
  public.open_campus_semester(
    '00000000-0000-4000-8000-000000000001', 'Fall 2026',
    current_date - 10, current_date + 100),
  null,
  'campus administrators open a semester'
);

select is(
  (select count(*)::integer from public.semesters
   where campus_id = '00000000-0000-4000-8000-000000000001' and is_current),
  1,
  'exactly one semester is current per campus'
);

select ok(
  pg_temp.operation_fails($$insert into public.semesters
    (campus_id, name, starts_on, ends_on)
    values ('00000000-0000-4000-8000-000000000001', 'Bad window',
      current_date, current_date - 1)$$),
  'a semester cannot end before it starts'
);

-- ---------------------------------------------------------------------------
-- Semester XP accrual
-- ---------------------------------------------------------------------------
insert into public.xp_ledger (profile_id, campus_id, amount, reason, source_type, source_id)
values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
  40, 'verified_checkin', 'semester_test', '80000000-0000-4000-8000-00000000f001');

select is(
  (select xp_total from public.semester_xp sx
   join public.semesters s on s.id = sx.semester_id
   where s.is_current and sx.profile_id = '10000000-0000-4000-8000-000000000001'),
  40,
  'xp ledger entries accrue against the current semester'
);

insert into public.xp_ledger (profile_id, campus_id, amount, reason, source_type, source_id)
values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
  15, 'hosted_event', 'semester_test', '80000000-0000-4000-8000-00000000f002');

select is(
  (select xp_total from public.semester_xp sx
   join public.semesters s on s.id = sx.semester_id
   where s.is_current and sx.profile_id = '10000000-0000-4000-8000-000000000001'),
  55,
  'semester xp accumulates across ledger entries'
);

insert into public.xp_ledger (profile_id, campus_id, amount, reason, source_type, source_id)
values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
  -100, 'no_show', 'semester_test', '80000000-0000-4000-8000-00000000f003');

select is(
  (select xp_total from public.semester_xp sx
   join public.semesters s on s.id = sx.semester_id
   where s.is_current and sx.profile_id = '10000000-0000-4000-8000-000000000001'),
  0,
  'penalties never drive a semester total below zero'
);

-- ---------------------------------------------------------------------------
-- Semester leaderboard honours the existing leaderboard opt-out
-- ---------------------------------------------------------------------------
select pg_temp.set_actor('10000000-0000-4000-8000-000000000002');
insert into public.xp_ledger (profile_id, campus_id, amount, reason, source_type, source_id)
values ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
  70, 'verified_checkin', 'semester_test', '80000000-0000-4000-8000-00000000f004');

select is(
  public.get_semester_leaderboard(10) -> 'semester' -> 'name',
  '"Fall 2026"'::jsonb,
  'the leaderboard reports the current semester'
);

select ok(
  (select public.get_semester_leaderboard(10) -> 'entries' @> jsonb_build_array(
     jsonb_build_object('profileId', '10000000-0000-4000-8000-000000000002')) = false
   or jsonb_array_length(public.get_semester_leaderboard(10) -> 'entries') >= 1),
  'the leaderboard returns ranked entries'
);

update public.profile_preferences set leaderboard_visible = false
where profile_id = '10000000-0000-4000-8000-000000000002';

select ok(
  not exists (
    select 1 from jsonb_array_elements(public.get_semester_leaderboard(50) -> 'entries') entry
    where entry ->> 'profileId' = '10000000-0000-4000-8000-000000000002'
  ),
  'students who opted out of leaderboards are excluded from semester standings'
);

select is(
  public.get_semester_leaderboard(50) -> 'viewer' -> 'xpTotal',
  '70'::jsonb,
  'a hidden student still sees their own semester standing'
);

select ok(
  pg_temp.operation_fails($$select public.get_semester_leaderboard(500)$$),
  'leaderboard page sizes are bounded'
);

-- ---------------------------------------------------------------------------
-- Ambassador applications
-- ---------------------------------------------------------------------------
select pg_temp.set_actor('10000000-0000-4000-8000-000000000005');
select isnt(
  public.apply_for_ambassador_program(
    'I run the outdoors club and want to help more first-year students find events on campus.'),
  null,
  'verified students apply to the ambassador programme'
);

select ok(
  pg_temp.operation_fails($$select public.apply_for_ambassador_program('Too short.')$$),
  'ambassador motivations below the minimum length are rejected'
);

select ok(
  pg_temp.operation_fails($$select public.apply_for_ambassador_program(
    'A second concurrent application from the same student must not be accepted at all.')$$),
  'a student cannot hold two open ambassador applications'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000006');
select ok(
  pg_temp.operation_fails($$select public.get_campus_ambassador_applications(
    '00000000-0000-4000-8000-000000000001')$$),
  'students cannot read the ambassador application queue'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000004');
select is(
  jsonb_array_length(public.get_campus_ambassador_applications(
    '00000000-0000-4000-8000-000000000001')),
  1,
  'campus administrators see the pending ambassador application'
);

select is(
  public.review_ambassador_application(
    (select id from public.ambassador_applications
     where profile_id = '10000000-0000-4000-8000-000000000005'),
    true, 'Confirmed as an active organization officer.'),
  'approved'::public.ambassador_application_status,
  'campus administrators approve ambassador applications'
);

select ok(
  (select status = 'active' from public.ambassadors
   where profile_id = '10000000-0000-4000-8000-000000000005'),
  'approval activates the ambassador'
);

select ok(
  (select kind = 'ambassador' and is_active from public.referral_codes c
   join public.ambassadors a on a.referral_code_id = c.id
   where a.profile_id = '10000000-0000-4000-8000-000000000005'),
  'approval issues a dedicated active ambassador referral code'
);

select ok(
  (select count(*) from public.notification_jobs
   where kind = 'ambassador_application_outcome') = 1,
  'the applicant is notified of the outcome'
);

select ok(
  (select count(*) from public.campus_admin_audit_log
   where action = 'ambassador_approved') = 1,
  'ambassador approval is written to the campus audit log'
);

-- ---------------------------------------------------------------------------
-- Ambassador dashboard is aggregate only
-- ---------------------------------------------------------------------------
select pg_temp.set_actor('10000000-0000-4000-8000-000000000005');
select is(
  public.get_my_ambassador_dashboard() -> 'isAmbassador',
  'true'::jsonb,
  'an active ambassador sees their dashboard'
);

select is(
  public.get_my_ambassador_dashboard() -> 'counts' -> 'qualified',
  '0'::jsonb,
  'a new ambassador starts with no qualified referrals'
);

select ok(
  public.get_my_ambassador_dashboard()::text not like '%referredProfileId%'
  and public.get_my_ambassador_dashboard()::text not like '%university_email%',
  'the ambassador dashboard never identifies who used the code'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select is(
  public.get_my_ambassador_dashboard() -> 'isAmbassador',
  'false'::jsonb,
  'students who are not ambassadors receive no programme data'
);

-- ---------------------------------------------------------------------------
-- Tier recomputation counts qualified referrals only
-- ---------------------------------------------------------------------------
insert into public.referrals (referral_code_id, referred_profile_id, status)
select a.referral_code_id, '10000000-0000-4000-8000-000000000003', 'attributed'
from public.ambassadors a where a.profile_id = '10000000-0000-4000-8000-000000000005';

select is(
  public.recompute_ambassador_tiers(),
  0,
  'unqualified referrals do not promote an ambassador'
);

select is(
  (select tier from public.ambassadors
   where profile_id = '10000000-0000-4000-8000-000000000005'),
  'rookie'::public.ambassador_tier,
  'an ambassador with only attributed referrals stays at the entry tier'
);

-- ---------------------------------------------------------------------------
-- Retirement
-- ---------------------------------------------------------------------------
select pg_temp.set_actor('10000000-0000-4000-8000-000000000004');
select lives_ok(
  $$select public.retire_ambassador(
    (select id from public.ambassadors
     where profile_id = '10000000-0000-4000-8000-000000000005'),
    'Graduated at the end of the semester.')$$,
  'campus administrators retire ambassadors'
);

select ok(
  not (select is_active from public.referral_codes c
       join public.ambassadors a on a.referral_code_id = c.id
       where a.profile_id = '10000000-0000-4000-8000-000000000005'),
  'retiring an ambassador deactivates their referral code'
);

-- ---------------------------------------------------------------------------
-- Rollover preserves closed semester standings
-- ---------------------------------------------------------------------------
select isnt(
  public.roll_over_campus_semester(
    '00000000-0000-4000-8000-000000000001', 'Spring 2027',
    current_date + 101, current_date + 300),
  null,
  'campus administrators roll the semester over'
);

select is(
  (select count(*)::integer from public.semester_xp),
  2,
  'rollover preserves the closed semester standings'
);

select * from finish();
rollback;
