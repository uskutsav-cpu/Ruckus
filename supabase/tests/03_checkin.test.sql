begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(5);

update public.activity_sessions
set starts_at = now(),
    ends_at = now() + interval '90 minutes',
    swipe_closes_at = now() - interval '2 hours',
    checkin_opens_at = now() - interval '5 minutes',
    checkin_closes_at = now() + interval '30 minutes'
where id = '40000000-0000-4000-8000-000000000001';

insert into public.groups (
  id,
  activity_session_id,
  campus_id,
  status,
  min_size,
  target_size,
  max_size,
  confirmation_deadline,
  venue_revealed_at
)
values (
  '50000000-0000-4000-8000-000000000003',
  '40000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'confirmed',
  4,
  6,
  8,
  now() - interval '30 minutes',
  now()
);

insert into public.group_members (group_id, profile_id, is_host)
values
  (
    '50000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    false
  ),
  (
    '50000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000007',
    true
  );

insert into public.attendance_confirmations (
  group_id,
  profile_id,
  status,
  deadline,
  responded_at
)
values
  (
    '50000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'confirmed',
    now() - interval '30 minutes',
    now() - interval '45 minutes'
  ),
  (
    '50000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000007',
    'confirmed',
    now() - interval '30 minutes',
    now() - interval '45 minutes'
  );

insert into public.checkin_tokens (
  id,
  group_id,
  activity_session_id,
  created_by,
  token_digest,
  valid_from,
  expires_at
)
values (
  '90000000-0000-4000-8000-000000000003',
  '50000000-0000-4000-8000-000000000003',
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000007',
  repeat('a', 64),
  now() - interval '5 seconds',
  now() + interval '2 minutes'
);

create function pg_temp.set_actor(actor_id uuid)
returns void
language sql
as $$
  select set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', actor_id, 'role', 'authenticated')::text,
    true
  );
  select set_config('request.jwt.claim.sub', actor_id::text, true);
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

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');

select is(
  public.redeem_checkin_token_digest(repeat('a', 64)) ->> 'alreadyCheckedIn',
  'false',
  'the first valid redemption creates a check-in'
);

select is(
  public.redeem_checkin_token_digest(repeat('a', 64)) ->> 'alreadyCheckedIn',
  'true',
  'reusing a valid token is idempotent for the same member'
);

select is(
  (select count(*) from public.checkins),
  1::bigint,
  'duplicate redemption leaves exactly one check-in'
);

select is(
  (
    select coalesce(sum(amount), 0)
    from public.xp_ledger
    where reason = 'verified_checkin'
  ),
  50::bigint,
  'duplicate redemption awards verified attendance XP exactly once'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000002');
select ok(
  pg_temp.operation_fails(
    $sql$
      select public.redeem_checkin_token_digest(repeat('a', 64))
    $sql$
  ),
  'a nonmember cannot redeem another group token'
);

select * from finish();
rollback;
