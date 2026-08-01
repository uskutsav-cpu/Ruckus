begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

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

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000007","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000007',
  true
);

insert into public.events (
  id,
  campus_id,
  organization_id,
  created_by,
  slug,
  title,
  description,
  category,
  starts_at,
  ends_at,
  timezone,
  venue_name,
  capacity,
  waitlist_enabled,
  visibility,
  status
)
values (
  '70000000-0000-4000-8000-000000000099',
  '00000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000007',
  'event-authorization-test',
  'Event authorization test',
  'A deterministic event used only inside the transactional pgTAP suite.',
  'Games',
  now() + interval '3 days',
  now() + interval '3 days 2 hours',
  'America/Chicago',
  'Test Commons',
  1,
  true,
  'public',
  'draft'
);

select public.publish_event('70000000-0000-4000-8000-000000000099');

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
  public.join_event(
    '70000000-0000-4000-8000-000000000099',
    '81000000-0000-4000-8000-000000000001'
  ) ->> 'status',
  'confirmed',
  'the first eligible RSVP is confirmed'
);

select is(
  public.join_event(
    '70000000-0000-4000-8000-000000000099',
    '81000000-0000-4000-8000-000000000001'
  ) ->> 'alreadyJoined',
  'true',
  'an idempotent retry returns the existing RSVP'
);

select ok(
  public.can_access_event_chat('70000000-0000-4000-8000-000000000099'),
  'a confirmed attendee receives event-chat access'
);

insert into public.event_messages (event_id, sender_id, body, client_id)
values (
  '70000000-0000-4000-8000-000000000099',
  '10000000-0000-4000-8000-000000000001',
  'Confirmed attendee message',
  '82000000-0000-4000-8000-000000000001'
);

select is(
  jsonb_array_length(
    public.get_event_messages('70000000-0000-4000-8000-000000000099')
  ),
  1,
  'authorized message pagination returns only this event chat'
);

select ok(
  pg_temp.operation_fails(
    $sql$select latitude from public.events limit 1$sql$
  ),
  'precise coordinates are not directly client-readable'
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

select is(
  public.join_event(
    '70000000-0000-4000-8000-000000000099',
    '81000000-0000-4000-8000-000000000002'
  ) ->> 'status',
  'waitlisted',
  'the next RSVP is waitlisted at capacity'
);

select is(
  (
    select waitlist_position
    from public.event_rsvps
    where event_id = '70000000-0000-4000-8000-000000000099'
      and profile_id = '10000000-0000-4000-8000-000000000002'
  ),
  1::bigint,
  'waitlist order is assigned monotonically'
);

select ok(
  not public.can_access_event_chat('70000000-0000-4000-8000-000000000099'),
  'a waitlisted user cannot access event chat'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      insert into public.event_messages (event_id, sender_id, body)
      values (
        '70000000-0000-4000-8000-000000000099',
        '10000000-0000-4000-8000-000000000002',
        'Unauthorized waitlist message'
      )
    $sql$
  ),
  'a waitlisted user cannot send to event chat'
);

select ok(
  pg_temp.operation_fails(
    $sql$
      insert into public.event_rsvps (event_id, profile_id, status)
      values (
        '70000000-0000-4000-8000-000000000099',
        '10000000-0000-4000-8000-000000000002',
        'confirmed'
      )
    $sql$
  ),
  'a user cannot forge an RSVP status directly'
);

select ok(
  pg_temp.operation_fails(
    $sql$select public.get_event_messages('70000000-0000-4000-8000-000000000001')$sql$
  ),
  'event-chat membership cannot be reused for another event topic'
);

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
  public.cancel_event_rsvp(
    '70000000-0000-4000-8000-000000000099',
    'Schedule changed'
  ) ->> 'alreadyCancelled',
  'false',
  'cancelling a confirmed RSVP executes one transition'
);

select ok(
  not public.can_access_event_chat('70000000-0000-4000-8000-000000000099'),
  'cancellation immediately revokes future chat access'
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

select is(
  (
    select status::text
    from public.event_rsvps
    where event_id = '70000000-0000-4000-8000-000000000099'
      and profile_id = '10000000-0000-4000-8000-000000000002'
  ),
  'confirmed',
  'cancellation promotes exactly the earliest eligible waitlisted user'
);

select ok(
  public.can_access_event_chat('70000000-0000-4000-8000-000000000099'),
  'a promoted attendee receives event-chat access'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);

select is(
  (select count(*) from public.event_rsvps),
  0::bigint,
  'an unrelated user cannot enumerate event attendees'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);

select is(
  (
    select count(*) from public.public_event_pages
    where slug = 'event-authorization-test'
  ),
  1::bigint,
  'an anonymous visitor can read a safe public event page'
);

select is(
  (
    select count(*) from public.public_event_pages
    where slug = 'board-game-night-demo'
  ),
  0::bigint,
  'an anonymous visitor cannot read a campus-only shared page'
);

select * from finish();
rollback;
