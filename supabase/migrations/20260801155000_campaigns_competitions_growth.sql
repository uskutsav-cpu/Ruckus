-- Welcome-week and orientation campaigns, printable QR assets, organization
-- competitions, referral fraud protection, and campus growth analytics.
-- Every reporting surface here is aggregate; none returns a student record.

create type public.growth_campaign_kind as enum (
  'welcome_week', 'orientation', 'club_fair', 'custom'
);
create type public.growth_campaign_status as enum (
  'draft', 'scheduled', 'active', 'completed', 'cancelled'
);
create type public.campaign_asset_kind as enum ('qr_poster', 'short_link', 'table_card');
create type public.competition_metric as enum (
  'verified_checkins', 'events_hosted', 'qualified_referrals'
);

create table public.growth_campaigns (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  kind public.growth_campaign_kind not null,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.growth_campaign_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campus_id, name),
  constraint growth_campaign_name check (char_length(name) between 3 and 120),
  constraint growth_campaign_window check (
    starts_at < ends_at and ends_at <= starts_at + interval '120 days'
  )
);

create table public.campaign_assets (
  id uuid primary key default extensions.gen_random_uuid(),
  campaign_id uuid not null references public.growth_campaigns(id) on delete cascade,
  kind public.campaign_asset_kind not null,
  label text not null,
  token text not null unique,
  deep_link text not null,
  created_at timestamptz not null default now(),
  constraint campaign_asset_label check (char_length(label) between 3 and 80),
  constraint campaign_asset_token check (token ~ '^[a-f0-9]{32}$'),
  constraint campaign_asset_deep_link check (
    deep_link ~ '^ruckus://[a-zA-Z0-9/_?=&.-]{1,255}$'
  )
);

-- Scans are stored as a daily count per asset. A salted fingerprint deduplicates
-- repeat scans within a day without ever storing a device or network identifier.
create table public.campaign_scan_daily (
  id uuid primary key default extensions.gen_random_uuid(),
  asset_id uuid not null references public.campaign_assets(id) on delete cascade,
  scan_date date not null,
  scan_count integer not null default 0,
  unique (asset_id, scan_date),
  constraint campaign_scan_count check (scan_count >= 0)
);

create table public.campaign_scan_fingerprints (
  asset_id uuid not null references public.campaign_assets(id) on delete cascade,
  scan_date date not null,
  fingerprint text not null,
  primary key (asset_id, scan_date, fingerprint),
  constraint campaign_fingerprint_format check (fingerprint ~ '^[a-f0-9]{64}$')
);

create table public.organization_competitions (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  metric public.competition_metric not null,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  unique (campus_id, name),
  constraint competition_name check (char_length(name) between 3 and 120),
  constraint competition_window check (starts_on < ends_on and ends_on <= starts_on + 400)
);

create index campaign_assets_campaign_idx on public.campaign_assets(campaign_id);
create index growth_campaigns_campus_idx
  on public.growth_campaigns(campus_id, status, starts_at desc);
create index campaign_scan_daily_idx on public.campaign_scan_daily(asset_id, scan_date);
create index organization_competitions_campus_idx
  on public.organization_competitions(campus_id, ends_on desc);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'growth_campaigns', 'campaign_assets', 'campaign_scan_daily',
    'campaign_scan_fingerprints', 'organization_competitions'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;

create trigger growth_campaigns_set_updated_at
before update on public.growth_campaigns
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Referral fraud protection
-- ---------------------------------------------------------------------------

-- A single code attracting an implausible burst of signups is the cheapest
-- referral abuse to run, so attribution is capped per code per rolling day.
create or replace function ruckus_private.enforce_referral_velocity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recent_count integer; daily_cap constant integer := 25;
begin
  select count(*) into recent_count from public.referrals
  where referral_code_id = new.referral_code_id and created_at > now() - interval '1 day';
  if recent_count >= daily_cap then
    raise exception using errcode = '22023', message = 'REFERRAL_VELOCITY_EXCEEDED';
  end if;
  return new;
end;
$$;

create trigger referrals_enforce_velocity
before insert on public.referrals
for each row execute function ruckus_private.enforce_referral_velocity();

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------

create or replace function public.create_growth_campaign(
  target_campus_id uuid, campaign_kind public.growth_campaign_kind,
  campaign_name text, starts_at timestamptz, ends_at timestamptz
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); campaign_id uuid;
begin
  if not ruckus_private.has_campus_admin_role(target_campus_id, actor_id,
    array['announcement_manager', 'administrator']::public.campus_admin_role[]) then
    raise exception using errcode = '42501', message = 'CAMPAIGN_MANAGER_REQUIRED';
  end if;
  insert into public.growth_campaigns (
    campus_id, created_by, kind, name, starts_at, ends_at, status
  ) values (target_campus_id, actor_id, campaign_kind, trim(campaign_name),
    starts_at, ends_at, 'scheduled')
  returning id into campaign_id;
  insert into public.campus_admin_audit_log (campus_id, actor_id, action, target_type, target_id)
  values (target_campus_id, actor_id, 'campaign_created', 'campaign', campaign_id);
  return campaign_id;
end;
$$;

-- Assets carry an opaque token rather than a campus or campaign identifier, so a
-- printed poster discloses nothing about the institution that produced it.
create or replace function public.create_campaign_asset(
  target_campaign_id uuid, asset_kind public.campaign_asset_kind,
  asset_label text, target_deep_link text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  campaign public.growth_campaigns%rowtype;
  new_token text;
  asset_id uuid;
begin
  select * into campaign from public.growth_campaigns where id = target_campaign_id;
  if campaign.id is null or not ruckus_private.has_campus_admin_role(
    campaign.campus_id, actor_id,
    array['announcement_manager', 'administrator']::public.campus_admin_role[]) then
    raise exception using errcode = '42501', message = 'CAMPAIGN_MANAGER_REQUIRED';
  end if;
  new_token := encode(extensions.gen_random_bytes(16), 'hex');
  insert into public.campaign_assets (campaign_id, kind, label, token, deep_link)
  values (target_campaign_id, asset_kind, trim(asset_label), new_token, target_deep_link)
  returning id into asset_id;
  insert into public.campus_admin_audit_log (campus_id, actor_id, action, target_type, target_id)
  values (campaign.campus_id, actor_id, 'campaign_asset_created', 'campaign', asset_id);
  return jsonb_build_object('id', asset_id, 'token', new_token, 'deepLink', target_deep_link);
end;
$$;

-- Called when a printed asset is scanned. Returns only the destination link; it
-- never reveals the campaign, the campus, or any counts to the scanner.
create or replace function public.record_campaign_scan(
  asset_token text, scan_fingerprint text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare asset public.campaign_assets%rowtype; campaign public.growth_campaigns%rowtype; inserted boolean;
begin
  if scan_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'INVALID_SCAN_FINGERPRINT';
  end if;
  select * into asset from public.campaign_assets where token = asset_token;
  if asset.id is null then
    raise exception using errcode = 'P0002', message = 'CAMPAIGN_ASSET_NOT_FOUND';
  end if;
  select * into campaign from public.growth_campaigns where id = asset.campaign_id;
  if campaign.status = 'cancelled' or now() < campaign.starts_at or now() > campaign.ends_at then
    return jsonb_build_object('deepLink', asset.deep_link, 'counted', false);
  end if;

  insert into public.campaign_scan_fingerprints (asset_id, scan_date, fingerprint)
  values (asset.id, current_date, scan_fingerprint)
  on conflict do nothing;
  inserted := found;
  if inserted then
    insert into public.campaign_scan_daily (asset_id, scan_date, scan_count)
    values (asset.id, current_date, 1)
    on conflict (asset_id, scan_date) do update
    set scan_count = public.campaign_scan_daily.scan_count + 1;
  end if;
  return jsonb_build_object('deepLink', asset.deep_link, 'counted', inserted);
end;
$$;

create or replace function public.get_campus_campaigns(target_campus_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); result jsonb;
begin
  if not ruckus_private.has_campus_admin_role(target_campus_id, actor_id,
    array['viewer', 'analyst', 'announcement_manager', 'administrator']::public.campus_admin_role[]) then
    raise exception using errcode = '42501', message = 'CAMPUS_ADMIN_ACCESS_DENIED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'kind', c.kind, 'name', c.name, 'status', c.status,
    'startsAt', c.starts_at, 'endsAt', c.ends_at,
    'assets', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id, 'kind', a.kind, 'label', a.label, 'token', a.token,
        'deepLink', a.deep_link,
        'scans', coalesce((select sum(d.scan_count) from public.campaign_scan_daily d
                           where d.asset_id = a.id), 0)
      ) order by a.created_at), '[]'::jsonb)
      from public.campaign_assets a where a.campaign_id = c.id
    )
  ) order by c.starts_at desc), '[]'::jsonb) into result
  from public.growth_campaigns c where c.campus_id = target_campus_id;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Organization competitions
-- ---------------------------------------------------------------------------

create or replace function public.create_organization_competition(
  target_campus_id uuid, competition_name text,
  competition_metric public.competition_metric, starts_on date, ends_on date
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); competition_id uuid;
begin
  if not ruckus_private.has_campus_admin_role(target_campus_id, actor_id,
    array['administrator']::public.campus_admin_role[]) then
    raise exception using errcode = '42501', message = 'CAMPUS_ADMINISTRATOR_REQUIRED';
  end if;
  insert into public.organization_competitions (
    campus_id, created_by, name, metric, starts_on, ends_on
  ) values (target_campus_id, actor_id, trim(competition_name), competition_metric,
    starts_on, ends_on)
  returning id into competition_id;
  insert into public.campus_admin_audit_log (campus_id, actor_id, action, target_type, target_id)
  values (target_campus_id, actor_id, 'competition_created', 'competition', competition_id);
  return competition_id;
end;
$$;

-- Standings rank organizations, which are public entities, so no per-student
-- suppression is required. Restricted organizations are excluded outright.
create or replace function public.get_competition_standings(target_competition_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  competition public.organization_competitions%rowtype;
  viewer_campus_id uuid;
  result jsonb;
begin
  select * into competition from public.organization_competitions
  where id = target_competition_id;
  if competition.id is null then
    raise exception using errcode = 'P0002', message = 'COMPETITION_NOT_FOUND';
  end if;
  select campus_id into viewer_campus_id from public.profiles
  where id = actor_id and banned_at is null and email_domain_verified_at is not null;
  if viewer_campus_id is null or viewer_campus_id <> competition.campus_id then
    raise exception using errcode = '42501', message = 'CAMPUS_MEMBER_REQUIRED';
  end if;

  select jsonb_build_object(
    'id', competition.id, 'name', competition.name, 'metric', competition.metric,
    'startsOn', competition.starts_on, 'endsOn', competition.ends_on,
    'standings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank', ranked.rank, 'organizationId', ranked.organization_id,
        'organizationName', ranked.name, 'score', ranked.score
      ) order by ranked.rank)
      from (
        select o.id as organization_id, o.name, scored.score,
          rank() over (order by scored.score desc, o.name) as rank
        from public.organizations o
        join lateral (
          select case competition.metric
            when 'verified_checkins' then (
              select count(*) from public.event_checkins c
              join public.events e on e.id = c.event_id
              where e.organization_id = o.id
                and c.verified_at::date between competition.starts_on and competition.ends_on)
            when 'events_hosted' then (
              select count(*) from public.events e
              where e.organization_id = o.id and e.status = 'completed'
                and e.starts_at::date between competition.starts_on and competition.ends_on)
            else (
              select count(*) from public.referrals r
              join public.referral_codes rc on rc.id = r.referral_code_id
              where rc.organization_id = o.id and r.status in ('qualified', 'rewarded')
                and r.qualified_at::date between competition.starts_on and competition.ends_on)
          end as score
        ) scored on true
        where o.campus_id = competition.campus_id and not o.is_restricted
      ) ranked
      where ranked.score > 0
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.get_campus_competitions(target_campus_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); viewer_campus_id uuid; result jsonb;
begin
  select campus_id into viewer_campus_id from public.profiles
  where id = actor_id and banned_at is null and email_domain_verified_at is not null;
  if viewer_campus_id is null or viewer_campus_id <> target_campus_id then
    raise exception using errcode = '42501', message = 'CAMPUS_MEMBER_REQUIRED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'metric', c.metric,
    'startsOn', c.starts_on, 'endsOn', c.ends_on,
    'isOpen', current_date between c.starts_on and c.ends_on
  ) order by c.ends_on desc), '[]'::jsonb) into result
  from public.organization_competitions c where c.campus_id = target_campus_id;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Growth analytics
-- ---------------------------------------------------------------------------

-- Campus-level growth reporting. Cohorts below the shared privacy threshold are
-- withheld rather than estimated, matching the campus administration overview.
create or replace function public.get_campus_growth_analytics(
  target_campus_id uuid, range_start date default (current_date - 30),
  range_end date default current_date
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  threshold constant integer := 5;
  new_students integer;
  result jsonb;
begin
  if not ruckus_private.has_campus_admin_role(target_campus_id, actor_id,
    array['analyst', 'administrator']::public.campus_admin_role[])
    or range_start > range_end or range_end > range_start + 400 then
    raise exception using errcode = '42501', message = 'CAMPUS_GROWTH_ACCESS_DENIED';
  end if;

  select count(*)::integer into new_students from public.profiles
  where campus_id = target_campus_id and created_at::date between range_start and range_end;

  select jsonb_build_object(
    'campusId', target_campus_id,
    'range', jsonb_build_object('start', range_start, 'end', range_end),
    'privacy', jsonb_build_object('smallCohortsSuppressed', true, 'minimumCohort', threshold),
    'counts', jsonb_build_object(
      'newStudents', case when new_students >= threshold then new_students else null end,
      'newStudentsSuppressed', new_students < threshold,
      'referralsAttributed', (
        select count(*) from public.referrals r
        join public.referral_codes rc on rc.id = r.referral_code_id
        where rc.campus_id = target_campus_id
          and r.created_at::date between range_start and range_end),
      'referralsQualified', (
        select count(*) from public.referrals r
        join public.referral_codes rc on rc.id = r.referral_code_id
        where rc.campus_id = target_campus_id and r.status in ('qualified', 'rewarded')
          and r.qualified_at::date between range_start and range_end),
      'activeAmbassadors', (
        select count(*) from public.ambassadors
        where campus_id = target_campus_id and status = 'active'),
      'campaignScans', (
        select coalesce(sum(d.scan_count), 0) from public.campaign_scan_daily d
        join public.campaign_assets a on a.id = d.asset_id
        join public.growth_campaigns c on c.id = a.campaign_id
        where c.campus_id = target_campus_id
          and d.scan_date between range_start and range_end),
      'openCompetitions', (
        select count(*) from public.organization_competitions
        where campus_id = target_campus_id and current_date between starts_on and ends_on)
    ),
    'referralFunnel', (
      select jsonb_build_object(
        'attributed', coalesce(count(*) filter (where true), 0),
        'qualified', coalesce(count(*) filter (where r.status in ('qualified', 'rewarded')), 0),
        'conversion', case when count(*) = 0 then null
          else round(count(*) filter (where r.status in ('qualified','rewarded'))::numeric
            / count(*), 4) end)
      from public.referrals r
      join public.referral_codes rc on rc.id = r.referral_code_id
      where rc.campus_id = target_campus_id
        and r.created_at::date between range_start and range_end
    )
  ) into result;
  return result;
end;
$$;

do $$
declare signature text;
begin
  foreach signature in array array[
    'create_growth_campaign(uuid,public.growth_campaign_kind,text,timestamptz,timestamptz)',
    'create_campaign_asset(uuid,public.campaign_asset_kind,text,text)',
    'record_campaign_scan(text,text)',
    'get_campus_campaigns(uuid)',
    'create_organization_competition(uuid,text,public.competition_metric,date,date)',
    'get_competition_standings(uuid)',
    'get_campus_competitions(uuid)',
    'get_campus_growth_analytics(uuid,date,date)'
  ] loop
    execute 'revoke all on function public.' || signature || ' from public, anon';
    execute 'grant execute on function public.' || signature || ' to authenticated';
  end loop;
end;
$$;
