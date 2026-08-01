begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(4);

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
  id, campus_id, created_by, slug, title, description, category,
  starts_at, ends_at, timezone, venue_name, capacity, status
) values (
  '70000000-0000-4000-8000-000000000098',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000007',
  'badge-award-fixture',
  'Badge award fixture',
  'A deterministic third event used only by the badge transaction test.',
  'Games',
  now() + interval '5 days',
  now() + interval '5 days 2 hours',
  'America/Chicago',
  'Test Commons',
  20,
  'draft'
);

insert into public.event_checkin_tokens (
  id, event_id, created_by, token_digest, valid_from, expires_at
) values
  ('8b000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000007', repeat('b', 64), now(), now() + interval '5 minutes'),
  ('8b000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000007', repeat('c', 64), now(), now() + interval '5 minutes'),
  ('8b000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000098', '10000000-0000-4000-8000-000000000007', repeat('d', 64), now(), now() + interval '5 minutes');

insert into public.event_checkins (event_id, profile_id, checkin_token_id)
values ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', '8b000000-0000-4000-8000-000000000001');

select is(
  (select count(*) from public.user_badges where profile_id = '10000000-0000-4000-8000-000000000004' and badge_id = 'first_checkin'),
  1::bigint,
  'a first verified event check-in awards the first badge once'
);

insert into public.event_checkins (event_id, profile_id, checkin_token_id)
values
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', '8b000000-0000-4000-8000-000000000002'),
  ('70000000-0000-4000-8000-000000000098', '10000000-0000-4000-8000-000000000004', '8b000000-0000-4000-8000-000000000003');

select is(
  (select count(*) from public.user_badges where profile_id = '10000000-0000-4000-8000-000000000004' and badge_id = 'campus_regular'),
  1::bigint,
  'the third verified event check-in awards the campus regular badge once'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);

select is(
  (select count(*) from public.user_badges),
  2::bigint,
  'a user can read only their own earned badges'
);

select ok(
  pg_temp.operation_fails(
    $$insert into public.user_badges (profile_id, badge_id, source_type, source_id)
      values (
        '10000000-0000-4000-8000-000000000004',
        'campus_regular',
        'forged',
        '8b000000-0000-4000-8000-000000000099'
      )$$
  ),
  'a client cannot forge a badge award'
);

select * from finish();
rollback;
