begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

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
  public.process_swipe_and_match('40000000-0000-4000-8000-000000000001') ->> 'state',
  'waiting',
  'the first compatible right swipe waits'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000002');
select is(
  public.process_swipe_and_match('40000000-0000-4000-8000-000000000001') ->> 'state',
  'waiting',
  'the second compatible right swipe waits'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000003');
select is(
  public.process_swipe_and_match('40000000-0000-4000-8000-000000000001') ->> 'state',
  'waiting',
  'the third compatible right swipe waits'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000004');
select is(
  public.process_swipe_and_match('40000000-0000-4000-8000-000000000001') ->> 'state',
  'matched',
  'the fourth compatible right swipe atomically forms a group'
);

select is(
  public.process_swipe_and_match('40000000-0000-4000-8000-000000000001') ->> 'duplicate',
  'true',
  'a repeated right swipe is idempotent'
);

reset role;

select is(
  (
    select count(*)
    from public.groups
    where activity_session_id = '40000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'one group was created'
);

select is(
  (
    select count(*)
    from public.group_members
    where group_id = (
      select id from public.groups
      where activity_session_id = '40000000-0000-4000-8000-000000000001'
      limit 1
    )
  ),
  4::bigint,
  'the group has the configured minimum of four members'
);

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000005');
select public.block_user('10000000-0000-4000-8000-000000000006');
select public.process_swipe_and_match('40000000-0000-4000-8000-000000000001');

select pg_temp.set_actor('10000000-0000-4000-8000-000000000006');
select public.process_swipe_and_match('40000000-0000-4000-8000-000000000001');

select pg_temp.set_actor('10000000-0000-4000-8000-000000000007');
select public.process_swipe_and_match('40000000-0000-4000-8000-000000000001');

select pg_temp.set_actor('10000000-0000-4000-8000-000000000008');
select is(
  public.process_swipe_and_match('40000000-0000-4000-8000-000000000001') ->> 'state',
  'waiting',
  'a blocked pair is not placed into the same four-person group'
);

reset role;
select is(
  (
    select count(*)
    from public.groups
    where activity_session_id = '40000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'block filtering prevented a second incompatible group'
);

insert into public.activity_sessions (
  id,
  activity_template_id,
  campus_id,
  starts_at,
  ends_at,
  swipe_closes_at,
  public_venue_name,
  public_venue_address
)
select
  '40000000-0000-4000-8000-000000000099',
  activity_template_id,
  campus_id,
  starts_at + interval '10 minutes',
  ends_at + interval '10 minutes',
  swipe_closes_at,
  public_venue_name,
  public_venue_address
from public.activity_sessions
where id = '40000000-0000-4000-8000-000000000001';

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select ok(
  pg_temp.operation_fails(
    $sql$
      select public.process_swipe_and_match(
        '40000000-0000-4000-8000-000000000099'
      )
    $sql$
  ),
  'an overlapping confirmed assignment is rejected'
);

select * from finish();
rollback;
