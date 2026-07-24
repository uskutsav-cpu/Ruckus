begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(4);

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
  '50000000-0000-4000-8000-000000000004',
  '40000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'pending_confirmation',
  4,
  6,
  8,
  now() + interval '1 hour'
);

insert into public.group_members (group_id, profile_id)
values
  (
    '50000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '50000000-0000-4000-8000-000000000004',
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

insert into public.messages (id, group_id, sender_id, body)
values (
  '60000000-0000-4000-8000-000000000004',
  '50000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000002',
  'Report fixture'
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

select isnt(
  public.report_user(
    '10000000-0000-4000-8000-000000000002',
    'Unsafe behavior',
    null
  ),
  null::uuid,
  'a member can report another active member through the trusted RPC'
);

select isnt(
  public.report_group(
    '50000000-0000-4000-8000-000000000004',
    'Group safety concern',
    null
  ),
  null::uuid,
  'an active member can report their group'
);

select isnt(
  public.report_message(
    '60000000-0000-4000-8000-000000000004',
    'Harassment',
    null
  ),
  null::uuid,
  'an active member can report a visible message'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000003');
select ok(
  pg_temp.operation_fails(
    $sql$
      select public.report_user(
        '10000000-0000-4000-8000-000000000002',
        'No shared group',
        null
      )
    $sql$
  ),
  'a user cannot report an arbitrary profile with no shared active group'
);

select * from finish();
rollback;
