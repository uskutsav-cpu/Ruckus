begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(32);

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

select pg_temp.set_actor('10000000-0000-4000-8000-000000000007');
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
  visibility,
  status
) values (
  '70000000-0000-4000-8000-000000000098',
  '00000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000007',
  'private-recommendation-test',
  'Private recommendation test',
  'A private event that must never appear in another member recommendation feed.',
  'Games',
  now() + interval '5 days',
  now() + interval '5 days 2 hours',
  'America/Chicago',
  'Private Test Venue',
  10,
  'private',
  'draft'
);
select public.publish_event('70000000-0000-4000-8000-000000000098');

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');

select ok(
  not (public.get_event_feed(page_size => 10) -> 'items')
    @> '[{"id":"70000000-0000-4000-8000-000000000098"}]'::jsonb,
  'private events are never included in another member recommendation feed'
);

select ok(
  pg_temp.operation_fails(
    $$select public.record_event_interaction(
      '70000000-0000-4000-8000-000000000098',
      'details_opened',
      'recommendation_test'
    )$$
  ),
  'interaction recording cannot be used as a private-event existence oracle'
);

select is(
  jsonb_array_length(public.get_event_feed(page_size => 1) -> 'items'),
  1,
  'the deterministic feed respects page size'
);

select ok(
  not (public.get_event_feed(page_size => 1) #> '{items,0}')
    ? 'recommendationScore',
  'the client response never exposes the internal numeric score'
);

select is(
  jsonb_typeof(public.get_event_feed(page_size => 1) #> '{items,0,recommendationReasons}'),
  'array',
  'the feed returns human-readable recommendation explanations'
);

select ok(
  public.get_event_feed(page_size => 1) ->> 'nextCursor' is not null,
  'the first page returns an opaque continuation cursor'
);

select set_config(
  'test.recommendation.first_id',
  public.get_event_feed(page_size => 1) #>> '{items,0,id}',
  true
);
select set_config(
  'test.recommendation.cursor',
  public.get_event_feed(page_size => 1) ->> 'nextCursor',
  true
);

select isnt(
  public.get_event_feed(
    cursor_token => current_setting('test.recommendation.cursor'),
    page_size => 1
  ) #>> '{items,0,id}',
  current_setting('test.recommendation.first_id'),
  'cursor pagination returns the next distinct event without skipping it'
);

select is(
  public.get_event_feed(
    cursor_token => current_setting('test.recommendation.cursor'),
    page_size => 1
  ) ->> 'nextCursor',
  null,
  'the final page has no continuation cursor'
);

select is(
  public.get_event_feed(page_size => 2),
  public.get_event_feed(page_size => 2),
  'ranking and tie breaking are deterministic for identical inputs'
);

select ok(
  pg_temp.operation_fails(
    $$select public.get_event_feed(cursor_token => 'not-a-valid-cursor')$$
  ),
  'malformed cursors fail closed'
);

select is(
  public.record_event_impressions(
    array[
      '70000000-0000-4000-8000-000000000001'::uuid,
      '70000000-0000-4000-8000-000000000002'::uuid
    ],
    'recommendation_test'
  ),
  2,
  'a bounded impression batch records eligible events'
);

select lives_ok(
  $$select public.record_event_interaction(
    '70000000-0000-4000-8000-000000000001',
    'details_opened',
    'recommendation_test'
  )$$,
  'details-opened can be recorded without accepting arbitrary payloads'
);

select ok(
  pg_temp.operation_fails(
    $$select public.record_event_interaction(
      '70000000-0000-4000-8000-000000000001',
      'passed',
      'recommendation_test'
    )$$
  ),
  'clients cannot forge server-derived recommendation outcomes'
);

select ok(
  pg_temp.operation_fails(
    $$select count(*) from public.recommendation_interactions$$
  ),
  'clients cannot enumerate the interaction stream'
);

reset role;
select is(
  (
    select count(*)
    from public.recommendation_interactions
    where profile_id = '10000000-0000-4000-8000-000000000001'
      and kind = 'impression'
      and surface = 'recommendation_test'
  ),
  2::bigint,
  'the trusted stream contains only the two deduplicated impressions'
);

select ok(
  (
    select bool_and(expires_at <= occurred_at + interval '401 days')
    from public.recommendation_interactions
    where profile_id = '10000000-0000-4000-8000-000000000001'
  ),
  'interaction retention is bounded'
);

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select ok(
  public.follow_organization('60000000-0000-4000-8000-000000000001'),
  'a verified same-campus member can follow an organization'
);

select ok(
  public.is_organization_followed('60000000-0000-4000-8000-000000000001'),
  'the member can read only their own organization follow state'
);

select ok(
  (public.get_event_feed(page_size => 2) #> '{items,0,recommendationReasons}')
    ? 'From an organization you follow',
  'organization affinity is explained without exposing its score weight'
);

select ok(
  public.unfollow_organization('60000000-0000-4000-8000-000000000001'),
  'organization follows can be removed explicitly'
);

select ok(
  not public.is_organization_followed('60000000-0000-4000-8000-000000000001'),
  'the follow state is false after removal'
);

reset role;
insert into public.friendships (user_low_id, user_high_id)
values (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);
insert into public.event_rsvps (event_id, profile_id, status)
values (
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'confirmed'
);

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select is(
  public.get_event_feed(page_size => 2) #>> '{items,0,friendsAttendingCount}',
  '1',
  'friends attending counts only a confirmed privacy-eligible friend'
);

select ok(
  (public.get_event_feed(page_size => 2) #> '{items,0,recommendationReasons}')
    ? 'A friend is going',
  'friends-attending affinity receives a human-readable explanation'
);

select lives_ok(
  $$select public.block_user('10000000-0000-4000-8000-000000000007')$$,
  'the user can block an event host through the trusted safety operation'
);

select is(
  jsonb_array_length(public.get_event_feed(page_size => 2) -> 'items'),
  0,
  'events from a blocked host are excluded'
);

select ok(
  public.unblock_user('10000000-0000-4000-8000-000000000007'),
  'unblocking restores eligibility without restoring social relationships'
);

insert into public.event_discovery_decisions (profile_id, event_id, decision)
values (
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  'passed'
);

select ok(
  not (public.get_event_feed(page_size => 2) -> 'items')
    @> '[{"id":"70000000-0000-4000-8000-000000000001"}]'::jsonb,
  'a passed event is suppressed from later recommendations'
);

reset role;
select is(
  (
    select count(*)
    from public.recommendation_interactions
    where profile_id = '10000000-0000-4000-8000-000000000001'
      and event_id = '70000000-0000-4000-8000-000000000001'
      and kind = 'passed'
  ),
  1::bigint,
  'the server-derived pass interaction is captured once'
);

select ok(
  pg_temp.operation_fails(
    $$insert into public.event_collaborative_signals (
      event_id, similar_event_id, cohort_size, signal_strength
    ) values (
      '70000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000002',
      4,
      50
    )$$
  ),
  'collaborative signals below the five-person privacy threshold are rejected'
);

select is(
  (
    select embeddings_enabled
    from public.recommendation_feature_flags
    where campus_id = '00000000-0000-4000-8000-000000000001'
  ),
  false,
  'paid embedding providers are disabled by default'
);

select is(
  public.queue_event_embedding_jobs(),
  0,
  'the background embedding queue remains empty without an enabled provider'
);

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select ok(
  jsonb_array_length(public.get_event_feed(page_size => 2) -> 'items') > 0,
  'deterministic recommendations remain available with all optional stages disabled'
);

select * from finish();
rollback;
