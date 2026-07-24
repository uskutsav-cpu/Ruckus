begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(20);

insert into public.notification_preferences (profile_id)
values ('10000000-0000-4000-8000-000000000002');

insert into public.notification_dispatches (event_type, source_id)
values ('event_starting', '50000000-0000-4000-8000-000000000001');

insert into public.groups (
  id,
  activity_session_id,
  campus_id,
  status,
  min_size,
  target_size,
  max_size,
  confirmation_deadline
)
values (
  '50000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'pending_confirmation',
  4,
  6,
  8,
  now() + interval '6 hours'
);

insert into public.group_members (group_id, profile_id)
values (
  '50000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

insert into public.messages (group_id, sender_id, body)
values (
  '50000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'Only group members should see this.'
);

insert into public.reports (
  reporter_id,
  target_type,
  target_user_id,
  reason
)
values (
  '10000000-0000-4000-8000-000000000002',
  'user',
  '10000000-0000-4000-8000-000000000001',
  'Safety concern'
);

insert into public.swipes (profile_id, activity_session_id, decision)
values (
  '10000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000002',
  'interested'
);

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

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'a student reads only their private profile row'
);

select is(
  (select count(*) from public.swipes),
  0::bigint,
  'a student cannot see another student swipe'
);

select is(
  (select count(*) from public.groups),
  0::bigint,
  'a nonmember cannot see a group'
);

select is(
  (select count(*) from public.messages),
  0::bigint,
  'a nonmember cannot read group chat'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      insert into public.messages (group_id, sender_id, body)
      values (
        '50000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        'Unauthorized'
      )
    $sql$
  ),
  'a nonmember cannot insert a group message'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      insert into public.xp_ledger (
        profile_id, campus_id, amount, reason, source_type, source_id
      )
      values (
        '10000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000001',
        999,
        'admin_adjustment',
        'forged',
        '90000000-0000-4000-8000-000000000001'
      )
    $sql$
  ),
  'a student cannot award XP directly'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      insert into public.checkins (
        group_id,
        activity_session_id,
        profile_id,
        checkin_token_id
      )
      values (
        '50000000-0000-4000-8000-000000000001',
        '40000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '90000000-0000-4000-8000-000000000002'
      )
    $sql$
  ),
  'a student cannot create an arbitrary check-in'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      update public.profiles
      set role = 'admin'
      where id = '10000000-0000-4000-8000-000000000001'
    $sql$
  ),
  'a student cannot promote their profile role'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      update public.profiles
      set onboarding_completed_at = now()
      where id = '10000000-0000-4000-8000-000000000001'
    $sql$
  ),
  'a student cannot bypass the trusted onboarding transition'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      select public_venue_name from public.activity_sessions limit 1
    $sql$
  ),
  'pre-confirmation venue columns are not client-readable'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      select token_digest from public.checkin_tokens limit 1
    $sql$
  ),
  'QR token digests are not client-readable'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      insert into public.blocks (blocker_id, blocked_id)
      values (
        '10000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002'
      )
    $sql$
  ),
  'blocks must use the trusted RPC so matching and groups are updated'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      insert into public.reports (
        reporter_id,
        target_type,
        target_user_id,
        reason
      )
      values (
        '10000000-0000-4000-8000-000000000001',
        'user',
        '10000000-0000-4000-8000-000000000002',
        'Bypass trusted report validation'
      )
    $sql$
  ),
  'reports must use a target-validating trusted RPC'
);

select is(
  (select count(*) from public.reports),
  0::bigint,
  'submitted reports are visible only to authorized administrators'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      update public.xp_ledger set amount = 100 where true
    $sql$
  ),
  'the XP ledger cannot be modified'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      delete from public.checkins where true
    $sql$
  ),
  'students cannot delete check-in records'
);

select is(
  (select count(*) from public.notification_preferences),
  0::bigint,
  'a student cannot read another user notification preferences'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      insert into public.notification_preferences (profile_id)
      values ('10000000-0000-4000-8000-000000000001')
    $sql$
  ),
  'notification preferences must use the trusted RPC'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      select * from public.notification_dispatches
    $sql$
  ),
  'scheduled notification dispatch markers are service-role-only'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      select * from public.push_receipts
    $sql$
  ),
  'Expo push receipts are service-role-only'
);

select * from finish();
rollback;
