begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(34);

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
  id, campus_id, organization_id, created_by, slug, title, description, category,
  starts_at, ends_at, timezone, venue_name, capacity, visibility, status,
  published_at, completed_at
) values (
  '70000000-0000-4000-8000-000000000099',
  '00000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000007',
  'organizer-analytics-test-event',
  'Organizer analytics test event',
  'A completed event used to verify aggregate-only organizer analytics behavior.',
  'Testing',
  now() - interval '3 hours',
  now() - interval '1 hour',
  'America/Chicago',
  'Aggregate Test Hall',
  20,
  'public',
  'draft',
  null,
  null
);

update public.events
set status = 'completed',
    published_at = now() - interval '2 days',
    completed_at = now() - interval '1 hour'
where id = '70000000-0000-4000-8000-000000000099';

insert into public.campus_semesters (
  id, campus_id, name, starts_on, ends_on
) values (
  '71000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Analytics test term',
  current_date - 30,
  current_date + 30
);

insert into public.event_rsvps (id, event_id, profile_id, status)
select
  ('72000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  '70000000-0000-4000-8000-000000000099',
  ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'confirmed'::public.rsvp_status
from generate_series(1, 6) n;

insert into public.event_rsvp_status_history (
  rsvp_id, event_id, profile_id, from_status, to_status, actor_id, created_at
)
select
  r.id, r.event_id, r.profile_id, null, 'confirmed', r.profile_id,
  now() - interval '2 hours'
from public.event_rsvps r
where r.event_id = '70000000-0000-4000-8000-000000000099';

insert into public.event_checkin_tokens (
  id, event_id, created_by, token_digest, valid_from, expires_at
) values (
  '73000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000099',
  '10000000-0000-4000-8000-000000000007',
  repeat('a', 64),
  now() - interval '4 hours',
  now() - interval '3 hours 50 minutes'
);

insert into public.event_checkins (event_id, profile_id, checkin_token_id, verified_at)
select
  '70000000-0000-4000-8000-000000000099',
  ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  '73000000-0000-4000-8000-000000000001',
  now() - interval '90 minutes'
from generate_series(1, 5) n;

insert into public.recommendation_interactions (
  profile_id, campus_id, event_id, kind, surface, deduplication_key, occurred_at
)
select
  ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000099',
  kind::public.recommendation_interaction_kind,
  'analytics_test',
  'analytics-' || kind || '-' || n,
  now() - interval '2 hours'
from generate_series(1, 6) n
cross join (values ('impression'), ('details_opened')) kinds(kind);

insert into public.recommendation_interactions (
  profile_id, campus_id, event_id, kind, surface, deduplication_key, occurred_at
) values (
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000099',
  'shared', 'analytics_test', 'analytics-shared-0001', now() - interval '2 hours'
);

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000007');
select set_config(
  'test.analytics.token',
  public.create_event_attribution_token(
    '70000000-0000-4000-8000-000000000099',
    'qr_poster',
    now() + interval '7 days',
    10,
    'welcome-poster'
  ),
  true
);

select matches(
  current_setting('test.analytics.token'),
  '^[a-f0-9]{64}$',
  'organizers receive a high-entropy opaque attribution token'
);
select is(
  public.record_event_attribution_visit(
    '70000000-0000-4000-8000-000000000099',
    current_setting('test.analytics.token'),
    null
  )::text,
  'qr_poster',
  'the server resolves attribution from a validated token rather than a source parameter'
);
select is(
  public.record_event_attribution_visit(
    '70000000-0000-4000-8000-000000000099',
    current_setting('test.analytics.token'),
    null
  )::text,
  'qr_poster',
  'a duplicate visit is accepted idempotently'
);
select pg_temp.set_actor('10000000-0000-4000-8000-000000000002');
select is(
  public.record_event_attribution_visit(
    '70000000-0000-4000-8000-000000000099', null, null
  )::text,
  'direct',
  'a token-free visit is classified as direct rather than a forgeable campaign source'
);

reset role;
select is(
  (select count(*) from public.event_attribution_visits
    where event_id = '70000000-0000-4000-8000-000000000099'),
  2::bigint,
  'attribution deduplicates each visitor and source per event local day'
);
select is(
  (select use_count from public.event_attribution_tokens
    where event_id = '70000000-0000-4000-8000-000000000099'),
  1,
  'duplicate visits consume one token use'
);
select ok(
  (select token_digest <> current_setting('test.analytics.token')
    from public.event_attribution_tokens
    where event_id = '70000000-0000-4000-8000-000000000099'),
  'only the token digest is persisted'
);

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000007');
select ok(
  pg_temp.operation_fails($$select public.create_event_attribution_token(
    '70000000-0000-4000-8000-000000000099', 'ambassador'
  )$$),
  'an organizer cannot forge a trusted ambassador attribution token'
);
select ok(
  pg_temp.operation_fails($$select public.record_event_attribution_visit(
    '70000000-0000-4000-8000-000000000099', repeat('b', 64), null
  )$$),
  'an arbitrary attribution token fails closed'
);
select ok(
  pg_temp.operation_fails($$select count(*) from public.event_attribution_visits$$),
  'clients cannot enumerate raw attribution visits'
);
select ok(
  pg_temp.operation_fails($$select count(*) from public.event_analytics_daily$$),
  'clients cannot query cached analytics tables directly'
);

select set_config(
  'test.analytics.payload',
  public.get_event_analytics(
    '70000000-0000-4000-8000-000000000099', 'lifecycle', current_date
  )::text,
  true
);
select is(
  (current_setting('test.analytics.payload')::jsonb #>> '{counts,feedImpressions}')::integer,
  6,
  'feed impressions use the documented deduplicated interaction definition'
);
select is(
  (current_setting('test.analytics.payload')::jsonb #>> '{counts,eventCardOpens}')::integer,
  6,
  'event-card opens are counted separately from impressions'
);
select is(
  (current_setting('test.analytics.payload')::jsonb #>> '{counts,joinAttempts}')::integer,
  6,
  'initial RSVP transitions define join attempts without double counting current state'
);
select is(
  (current_setting('test.analytics.payload')::jsonb #>> '{counts,confirmedRsvps}')::integer,
  6,
  'confirmed RSVP transitions are aggregated deterministically'
);
select is(
  (current_setting('test.analytics.payload')::jsonb #>> '{counts,checkins}')::integer,
  5,
  'verified check-ins are aggregated without exposing attendees'
);
select is(
  (current_setting('test.analytics.payload')::jsonb #>> '{counts,noShows}')::integer,
  1,
  'ended events count final confirmed attendees without a check-in as no-shows'
);
select is(
  (current_setting('test.analytics.payload')::jsonb #>> '{rates,attendanceConversion,denominator}')::integer,
  6,
  'attendance conversion includes its clear confirmed-RSVP denominator'
);
select is(
  current_setting('test.analytics.payload')::jsonb #>> '{attributionSources,qr_poster}',
  '1',
  'validated attribution sources are included only as aggregate counts'
);
select is(
  current_setting('test.analytics.payload')::jsonb #>> '{attributionSources,direct}',
  '1',
  'direct traffic remains visible in the aggregate source breakdown'
);
select is(
  current_setting('test.analytics.payload')::jsonb #>> '{counts,referralVisits}',
  '1',
  'direct traffic is excluded from the referral-visit funnel count'
);
select ok(
  not (
    current_setting('test.analytics.payload')::jsonb ? 'profiles'
    or current_setting('test.analytics.payload')::jsonb ? 'messages'
    or current_setting('test.analytics.payload')::jsonb ? 'locations'
  ),
  'the organizer payload contains no profile, message, or location collections'
);
select is(
  current_setting('test.analytics.payload')::jsonb #>> '{privacy,heatmapMeaning}',
  'Time-and-day funnel activity; never a movement or location map.',
  'the heatmap is explicitly defined as a time/day funnel rather than movement data'
);

select set_config(
  'test.analytics.semester',
  public.get_event_analytics(
    '70000000-0000-4000-8000-000000000099', 'semester', current_date
  )::text,
  true
);
select is(
  current_setting('test.analytics.semester')::jsonb #>> '{range,start}',
  (current_date - 30)::text,
  'semester reporting starts at the configured campus boundary'
);
select is(
  current_setting('test.analytics.semester')::jsonb #>> '{range,end}',
  (current_date + 30)::text,
  'semester reporting ends at the configured campus boundary'
);

select set_config(
  'test.analytics.organization',
  public.get_organization_analytics(
    '60000000-0000-4000-8000-000000000001', current_date - 1, current_date
  )::text,
  true
);
select is(
  current_setting('test.analytics.organization')::jsonb ->> 'privacyThreshold',
  '5',
  'organization aggregates declare the minimum cohort threshold'
);
select ok(
  (current_setting('test.analytics.organization')::jsonb #>> '{events,0,suppressed}')::boolean
    in (true, false),
  'organization cells always carry an explicit suppression decision'
);

select set_config(
  'test.analytics.csv',
  public.export_event_analytics_csv(
    '70000000-0000-4000-8000-000000000099', 'lifecycle', current_date
  ),
  true
);
select matches(
  current_setting('test.analytics.csv'),
  '^date,feed_impressions,',
  'an authorized host can export a fixed aggregate CSV schema'
);
select ok(
  current_setting('test.analytics.csv') !~* '(email|phone|message_body|profile_id|location)',
  'the CSV contains no private profile, contact, message, or location columns'
);

reset role;
select is(
  (select count(*) from public.analytics_export_audit
    where event_id = '70000000-0000-4000-8000-000000000099'),
  1::bigint,
  'every successful export creates an immutable audit record'
);

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select ok(
  pg_temp.operation_fails($$select public.get_event_analytics(
    '70000000-0000-4000-8000-000000000099'
  )$$),
  'a non-owner cannot read event analytics'
);
select ok(
  pg_temp.operation_fails($$select public.export_event_analytics_csv(
    '70000000-0000-4000-8000-000000000099'
  )$$),
  'a non-owner cannot export event analytics'
);
select ok(
  pg_temp.operation_fails($$select public.get_organization_analytics(
    '60000000-0000-4000-8000-000000000001', current_date - 7, current_date
  )$$),
  'a non-manager cannot read organization analytics'
);
reset role;
select ok(
  (
    select bool_and(expires_at <= occurred_at + interval '121 days')
    from public.event_attribution_visits
    where event_id = '70000000-0000-4000-8000-000000000099'
  ),
  'attribution visit retention is bounded'
);

select * from finish();
rollback;
