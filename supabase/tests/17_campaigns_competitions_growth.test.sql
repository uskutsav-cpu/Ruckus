begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(35);

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

select pg_temp.set_actor('10000000-0000-4000-8000-000000000008');
select public.assign_campus_admin_role(
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004', 'administrator');
select public.assign_campus_admin_role(
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000006', 'analyst');

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where relnamespace = 'public'::regnamespace
     and relname in ('growth_campaigns', 'campaign_assets', 'campaign_scan_daily',
                     'campaign_scan_fingerprints', 'organization_competitions')),
  'campaign and competition tables enforce row level security'
);
select ok(
  not has_table_privilege('authenticated', 'public.campaign_assets', 'select')
  and not has_table_privilege('anon', 'public.campaign_scan_fingerprints', 'select'),
  'campaign tables are reachable only through security definer routines'
);

-- ---------------------------------------------------------------------------
-- Campaign creation is restricted
-- ---------------------------------------------------------------------------
select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select ok(
  pg_temp.operation_fails($$select public.create_growth_campaign(
    '00000000-0000-4000-8000-000000000001', 'welcome_week', 'Welcome Week 2026',
    now(), now() + interval '10 days')$$),
  'students cannot create growth campaigns'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000006');
select ok(
  pg_temp.operation_fails($$select public.create_growth_campaign(
    '00000000-0000-4000-8000-000000000001', 'welcome_week', 'Analyst Campaign',
    now(), now() + interval '10 days')$$),
  'analysts cannot create growth campaigns'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000004');
select isnt(
  public.create_growth_campaign(
    '00000000-0000-4000-8000-000000000001', 'welcome_week', 'Welcome Week 2026',
    now() - interval '1 hour', now() + interval '10 days'),
  null,
  'campus administrators create welcome-week campaigns'
);

select isnt(
  public.create_growth_campaign(
    '00000000-0000-4000-8000-000000000001', 'orientation', 'Orientation 2026',
    now() - interval '1 hour', now() + interval '20 days'),
  null,
  'campus administrators create orientation campaigns'
);

select ok(
  pg_temp.operation_fails($$select public.create_growth_campaign(
    '00000000-0000-4000-8000-000000000001', 'custom', 'Impossible window',
    now() + interval '5 days', now())$$),
  'a campaign cannot end before it starts'
);

select ok(
  pg_temp.operation_fails($$select public.create_growth_campaign(
    '00000000-0000-4000-8000-000000000001', 'custom', 'Endless campaign',
    now(), now() + interval '300 days')$$),
  'campaign windows are bounded'
);

-- ---------------------------------------------------------------------------
-- QR campaign assets
-- ---------------------------------------------------------------------------
select isnt(
  public.create_campaign_asset(
    (select id from public.growth_campaigns where name = 'Welcome Week 2026'),
    'qr_poster', 'Union entrance poster', 'ruckus://discover'),
  null,
  'campaign managers mint printable QR assets'
);

select ok(
  (select token ~ '^[a-f0-9]{32}$' from public.campaign_assets
   where label = 'Union entrance poster'),
  'campaign assets carry an opaque token'
);

select ok(
  (select token not like '%' || '00000000-0000-4000-8000-000000000001' || '%'
   from public.campaign_assets where label = 'Union entrance poster'),
  'a printed asset token does not embed the campus identifier'
);

select ok(
  pg_temp.operation_fails($$select public.create_campaign_asset(
    (select id from public.growth_campaigns where name = 'Welcome Week 2026'),
    'qr_poster', 'Bad link', 'https://example.com/phishing')$$),
  'campaign assets reject off-scheme destinations'
);

-- ---------------------------------------------------------------------------
-- Scan counting and deduplication
-- ---------------------------------------------------------------------------
select is(
  public.record_campaign_scan(
    (select token from public.campaign_assets where label = 'Union entrance poster'),
    repeat('a', 64)) -> 'counted',
  'true'::jsonb,
  'a first scan is counted'
);

select is(
  public.record_campaign_scan(
    (select token from public.campaign_assets where label = 'Union entrance poster'),
    repeat('a', 64)) -> 'counted',
  'false'::jsonb,
  'a repeat scan from the same fingerprint is not double counted'
);

select is(
  public.record_campaign_scan(
    (select token from public.campaign_assets where label = 'Union entrance poster'),
    repeat('b', 64)) -> 'counted',
  'true'::jsonb,
  'a distinct scanner is counted separately'
);

select is(
  (select scan_count from public.campaign_scan_daily d
   join public.campaign_assets a on a.id = d.asset_id
   where a.label = 'Union entrance poster' and d.scan_date = current_date),
  2,
  'the daily scan count reflects deduplicated scans'
);

select is(
  public.record_campaign_scan(
    (select token from public.campaign_assets where label = 'Union entrance poster'),
    repeat('c', 64)) -> 'deepLink',
  '"ruckus://discover"'::jsonb,
  'a scan returns only its destination link'
);

select ok(
  pg_temp.operation_fails($$select public.record_campaign_scan(
    (select token from public.campaign_assets where label = 'Union entrance poster'),
    'not-a-fingerprint')$$),
  'malformed scan fingerprints are rejected'
);

select ok(
  pg_temp.operation_fails($$select public.record_campaign_scan(
    'ffffffffffffffffffffffffffffffff', repeat('d', 64))$$),
  'an unknown asset token is rejected'
);

-- A cancelled campaign still resolves its link but stops accruing counts.
update public.growth_campaigns set status = 'cancelled' where name = 'Orientation 2026';
select isnt(
  public.create_campaign_asset(
    (select id from public.growth_campaigns where name = 'Orientation 2026'),
    'table_card', 'Orientation table card', 'ruckus://discover'),
  null,
  'assets can still be inspected for a cancelled campaign'
);
select is(
  public.record_campaign_scan(
    (select token from public.campaign_assets where label = 'Orientation table card'),
    repeat('e', 64)) -> 'counted',
  'false'::jsonb,
  'scans against a cancelled campaign are not counted'
);

-- ---------------------------------------------------------------------------
-- Referral fraud protection
-- ---------------------------------------------------------------------------
select ok(
  (select tgname is not null from pg_trigger
   where tgname = 'referrals_enforce_velocity'),
  'referral velocity protection is installed'
);

create function pg_temp.flood_referrals(attempts integer)
returns void
language plpgsql
as $$
declare code_id uuid; i integer;
begin
  select id into code_id from public.referral_codes limit 1;
  for i in 1..attempts loop
    insert into public.referrals (referral_code_id, referred_profile_id)
    values (code_id, extensions.gen_random_uuid());
  end loop;
end;
$$;

select ok(
  pg_temp.operation_fails($$select pg_temp.flood_referrals(30)$$),
  'a burst of referrals against one code is refused'
);

-- ---------------------------------------------------------------------------
-- Organization competitions
-- ---------------------------------------------------------------------------
select pg_temp.set_actor('10000000-0000-4000-8000-000000000006');
select ok(
  pg_temp.operation_fails($$select public.create_organization_competition(
    '00000000-0000-4000-8000-000000000001', 'Analyst Cup', 'verified_checkins',
    current_date - 10, current_date + 10)$$),
  'analysts cannot create organization competitions'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000004');
select isnt(
  public.create_organization_competition(
    '00000000-0000-4000-8000-000000000001', 'Fall Attendance Cup', 'verified_checkins',
    current_date - 30, current_date + 30),
  null,
  'campus administrators create organization competitions'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select is(
  jsonb_array_length(public.get_campus_competitions('00000000-0000-4000-8000-000000000001')),
  1,
  'students see their own campus competitions'
);

select is(
  public.get_competition_standings(
    (select id from public.organization_competitions where name = 'Fall Attendance Cup'))
    -> 'metric',
  '"verified_checkins"'::jsonb,
  'competition standings report the ranked metric'
);

select ok(
  public.get_competition_standings(
    (select id from public.organization_competitions where name = 'Fall Attendance Cup'))
    ::text not like '%profileId%',
  'competition standings rank organizations and never individual students'
);

select ok(
  pg_temp.operation_fails($$select public.get_campus_competitions(
    '00000000-0000-4000-8000-0000000000ee')$$),
  'students cannot read competitions on another campus'
);

-- ---------------------------------------------------------------------------
-- Growth analytics
-- ---------------------------------------------------------------------------
select ok(
  pg_temp.operation_fails($$select public.get_campus_growth_analytics(
    '00000000-0000-4000-8000-000000000001')$$),
  'students cannot read campus growth analytics'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000006');
select is(
  public.get_campus_growth_analytics('00000000-0000-4000-8000-000000000001')
    -> 'privacy' -> 'minimumCohort',
  '5'::jsonb,
  'growth analytics reports its minimum cohort size'
);

-- A historical window with no signups exercises suppression directly.
select is(
  public.get_campus_growth_analytics(
    '00000000-0000-4000-8000-000000000001', date '2020-01-01', date '2020-02-01')
    -> 'counts' -> 'newStudentsSuppressed',
  'true'::jsonb,
  'a new-student cohort below the threshold is suppressed'
);

select is(
  public.get_campus_growth_analytics(
    '00000000-0000-4000-8000-000000000001', date '2020-01-01', date '2020-02-01')
    -> 'counts' -> 'newStudents',
  'null'::jsonb,
  'a suppressed new-student cohort is withheld rather than reported as zero'
);

select is(
  public.get_campus_growth_analytics('00000000-0000-4000-8000-000000000001')
    -> 'counts' -> 'campaignScans',
  '3'::jsonb,
  'growth analytics counts deduplicated campaign scans'
);

select ok(
  pg_temp.operation_fails($$select public.get_campus_growth_analytics(
    '00000000-0000-4000-8000-000000000001', current_date - 900, current_date)$$),
  'growth analytics rejects oversized reporting ranges'
);

select * from finish();
rollback;
