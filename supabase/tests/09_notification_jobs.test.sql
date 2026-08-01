begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(5);

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

insert into public.notification_jobs (
  id, profile_id, event_id, kind, deduplication_key, payload
) values (
  '8a000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  'rsvp_confirmed',
  'notification-claim-test',
  '{}'::jsonb
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select ok(
  pg_temp.operation_fails($$select * from public.claim_notification_jobs(1)$$),
  'an authenticated client cannot claim server notification work'
);

reset role;
set local role service_role;

select is(
  (select count(*) from public.claim_notification_jobs(1)),
  1::bigint,
  'a service worker can atomically claim one due job'
);

select is(
  (
    select status::text
    from public.notification_jobs
    where id = '8a000000-0000-4000-8000-000000000001'
  ),
  'processing',
  'claiming moves the job to processing'
);

select is(
  (
    select attempts
    from public.notification_jobs
    where id = '8a000000-0000-4000-8000-000000000001'
  ),
  1::smallint,
  'claiming increments the bounded attempt counter'
);

select is(
  (select count(*) from public.claim_notification_jobs(1)),
  0::bigint,
  'a concurrent or duplicate worker cannot claim the processing job again'
);

select * from finish();
rollback;
