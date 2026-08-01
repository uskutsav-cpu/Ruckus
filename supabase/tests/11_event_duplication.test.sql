begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(5);

create function pg_temp.set_actor(actor_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', actor_id, 'role', 'authenticated')::text, true);
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

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');

select ok(
  pg_temp.operation_fails($$select public.duplicate_event('70000000-0000-4000-8000-000000000001')$$),
  'a non-host cannot duplicate an event'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000007');
select set_config('test.duplicate_id', public.duplicate_event('70000000-0000-4000-8000-000000000001')::text, true);

select isnt(current_setting('test.duplicate_id'), '', 'an event host can duplicate their event');

select is(
  (select status::text from public.events where id = current_setting('test.duplicate_id')::uuid),
  'draft',
  'the duplicate is a draft rather than an accidental publication'
);

select is(
  (select role::text from public.event_hosts where event_id = current_setting('test.duplicate_id')::uuid and profile_id = '10000000-0000-4000-8000-000000000007'),
  'owner',
  'the acting host owns the new draft'
);

select is(
  (select count(*) from public.event_rsvps where event_id = current_setting('test.duplicate_id')::uuid),
  0::bigint,
  'attendance and chat state are never copied'
);

select * from finish();
rollback;
