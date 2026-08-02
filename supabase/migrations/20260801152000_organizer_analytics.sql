-- Privacy-preserving organizer analytics. Raw interaction, attendance, chat, and
-- attribution records remain inaccessible; organizers receive cached aggregates only.

create extension if not exists btree_gist with schema extensions;

create type public.event_attribution_source as enum (
  'direct',
  'event_share_link',
  'user_referral',
  'ambassador',
  'organization_page',
  'campus_campaign',
  'qr_poster',
  'public_search',
  'internal_recommendation',
  'welcome_week'
);

create table public.campus_semesters (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campus_id, name),
  constraint campus_semesters_name check (char_length(name) between 2 and 80),
  constraint campus_semesters_dates check (
    starts_on <= ends_on and ends_on <= starts_on + 220
  ),
  exclude using gist (
    campus_id with =,
    daterange(starts_on, ends_on, '[]') with &&
  )
);

create table public.event_attribution_tokens (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  source public.event_attribution_source not null,
  token_digest text not null unique,
  campaign_key text,
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null,
  max_uses integer not null default 10000,
  use_count integer not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint event_attribution_token_digest check (token_digest ~ '^[a-f0-9]{64}$'),
  constraint event_attribution_token_campaign check (
    campaign_key is null or campaign_key ~ '^[a-z0-9][a-z0-9_-]{1,79}$'
  ),
  constraint event_attribution_token_expiry check (
    expires_at > created_at and expires_at <= created_at + interval '400 days'
  ),
  constraint event_attribution_token_uses check (
    max_uses between 1 and 1000000 and use_count between 0 and max_uses
  ),
  constraint event_attribution_token_not_direct check (source <> 'direct')
);

create table public.event_attribution_visits (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  source public.event_attribution_source not null,
  attribution_token_id uuid references public.event_attribution_tokens(id) on delete set null,
  visitor_digest text not null,
  visited_on date not null,
  occurred_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '120 days'),
  unique (event_id, source, visitor_digest, visited_on),
  constraint event_attribution_visit_digest check (visitor_digest ~ '^[a-f0-9]{64}$'),
  constraint event_attribution_visit_retention check (
    expires_at > occurred_at and expires_at <= occurred_at + interval '121 days'
  )
);

create table public.event_feedback (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, profile_id),
  constraint event_feedback_rating check (rating between 1 and 5)
);

create table public.event_analytics_daily (
  event_id uuid not null references public.events(id) on delete cascade,
  metric_date date not null,
  feed_impressions integer not null default 0,
  event_card_opens integer not null default 0,
  join_attempts integer not null default 0,
  confirmed_rsvps integer not null default 0,
  pending_requests integer not null default 0,
  waitlist_additions integer not null default 0,
  cancellations integer not null default 0,
  waitlist_promotions integer not null default 0,
  shares integer not null default 0,
  referral_visits integer not null default 0,
  chat_participants integer not null default 0,
  checkins integer not null default 0,
  no_shows integer not null default 0,
  ratings integer not null default 0,
  rating_total integer not null default 0,
  repeat_attendees integer not null default 0,
  unique_participants integer not null default 0,
  attribution_sources jsonb not null default '{}'::jsonb,
  refreshed_at timestamptz not null default now(),
  primary key (event_id, metric_date),
  constraint event_analytics_nonnegative check (
    feed_impressions >= 0 and event_card_opens >= 0 and join_attempts >= 0
    and confirmed_rsvps >= 0 and pending_requests >= 0
    and waitlist_additions >= 0 and cancellations >= 0
    and waitlist_promotions >= 0 and shares >= 0 and referral_visits >= 0
    and chat_participants >= 0 and checkins >= 0 and no_shows >= 0
    and ratings >= 0 and rating_total >= 0 and repeat_attendees >= 0
    and unique_participants >= 0
  ),
  constraint event_analytics_sources check (
    jsonb_typeof(attribution_sources) = 'object'
    and pg_column_size(attribution_sources) <= 4096
  )
);

create table public.event_analytics_hourly (
  event_id uuid not null references public.events(id) on delete cascade,
  day_of_week smallint not null,
  hour_of_day smallint not null,
  impressions integer not null default 0,
  opens integer not null default 0,
  join_attempts integer not null default 0,
  unique_participants integer not null default 0,
  refreshed_at timestamptz not null default now(),
  primary key (event_id, day_of_week, hour_of_day),
  constraint event_analytics_hourly_bucket check (
    day_of_week between 0 and 6 and hour_of_day between 0 and 23
  ),
  constraint event_analytics_hourly_nonnegative check (
    impressions >= 0 and opens >= 0 and join_attempts >= 0
    and unique_participants >= 0
  )
);

create table public.analytics_export_audit (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  event_id uuid not null references public.events(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  period_key text not null,
  row_count integer not null,
  exported_at timestamptz not null default now(),
  constraint analytics_export_period check (
    period_key in ('daily', 'weekly', 'monthly', 'semester', 'lifecycle')
  ),
  constraint analytics_export_rows check (row_count between 0 and 10000)
);

create index event_attribution_tokens_event_idx
  on public.event_attribution_tokens(event_id, expires_at);
create index event_attribution_visits_retention_idx
  on public.event_attribution_visits(expires_at);
create index event_attribution_visits_event_idx
  on public.event_attribution_visits(event_id, occurred_at);
create index event_feedback_event_idx on public.event_feedback(event_id, created_at);
create index event_analytics_daily_date_idx on public.event_analytics_daily(metric_date);
create index analytics_export_audit_event_idx
  on public.analytics_export_audit(event_id, exported_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'campus_semesters',
    'event_attribution_tokens',
    'event_attribution_visits',
    'event_feedback',
    'event_analytics_daily',
    'event_analytics_hourly',
    'analytics_export_audit'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;

create or replace function ruckus_private.issue_event_attribution_token(
  target_event_id uuid,
  attribution_source public.event_attribution_source,
  token_expires_at timestamptz,
  token_max_uses integer,
  token_campaign_key text,
  token_creator uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if attribution_source = 'direct'
    or token_expires_at <= now()
    or token_expires_at > now() + interval '400 days'
    or token_max_uses not between 1 and 1000000
    or (token_campaign_key is not null and token_campaign_key !~ '^[a-z0-9][a-z0-9_-]{1,79}$') then
    raise exception using errcode = '22023', message = 'INVALID_ATTRIBUTION_TOKEN';
  end if;

  if not exists (select 1 from public.events where id = target_event_id) then
    raise exception using errcode = '42501', message = 'EVENT_UNAVAILABLE';
  end if;

  insert into public.event_attribution_tokens (
    event_id, source, token_digest, campaign_key, created_by, expires_at, max_uses
  ) values (
    target_event_id,
    attribution_source,
    encode(extensions.digest(raw_token, 'sha256'), 'hex'),
    token_campaign_key,
    token_creator,
    token_expires_at,
    token_max_uses
  );
  return raw_token;
end;
$$;

revoke all on function ruckus_private.issue_event_attribution_token(
  uuid, public.event_attribution_source, timestamptz, integer, text, uuid
) from public, anon, authenticated;

create or replace function public.create_event_attribution_token(
  target_event_id uuid,
  attribution_source public.event_attribution_source,
  token_expires_at timestamptz default (now() + interval '30 days'),
  token_max_uses integer default 10000,
  token_campaign_key text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null
    or not ruckus_private.is_event_host(target_event_id, actor_id)
    or attribution_source not in ('event_share_link', 'organization_page', 'qr_poster') then
    raise exception using errcode = '42501', message = 'ATTRIBUTION_TOKEN_FORBIDDEN';
  end if;
  return ruckus_private.issue_event_attribution_token(
    target_event_id,
    attribution_source,
    token_expires_at,
    token_max_uses,
    token_campaign_key,
    actor_id
  );
end;
$$;

create or replace function public.record_event_attribution_visit(
  target_event_id uuid,
  attribution_token text default null,
  anonymous_visitor_key text default null
)
returns public.event_attribution_source
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  event_record public.events%rowtype;
  token_record public.event_attribution_tokens%rowtype;
  resolved_source public.event_attribution_source := 'direct'::public.event_attribution_source;
  visitor_seed text;
  visitor_hash text;
  visit_date date;
  inserted_count integer;
begin
  select * into event_record
  from public.events
  where id = target_event_id
    and status in ('published', 'completed')
    and visibility <> 'private';

  if event_record.id is null then
    raise exception using errcode = '42501', message = 'EVENT_UNAVAILABLE';
  end if;
  if event_record.visibility = 'campus' and (
    actor_id is null
    or not exists (
      select 1 from public.profiles
      where id = actor_id and campus_id = event_record.campus_id
        and email_domain_verified_at is not null and deletion_requested_at is null
    )
  ) then
    raise exception using errcode = '42501', message = 'EVENT_UNAVAILABLE';
  end if;

  if attribution_token is not null then
    if attribution_token !~ '^[a-f0-9]{64}$' then
      raise exception using errcode = '22023', message = 'INVALID_ATTRIBUTION_TOKEN';
    end if;
    select * into token_record
    from public.event_attribution_tokens
    where token_digest = encode(extensions.digest(attribution_token, 'sha256'), 'hex')
      and event_id = target_event_id
      and revoked_at is null
      and expires_at > now()
      and use_count < max_uses
    for update;
    if token_record.id is null then
      raise exception using errcode = '22023', message = 'INVALID_ATTRIBUTION_TOKEN';
    end if;
    resolved_source := token_record.source;
  end if;

  if actor_id is not null then
    visitor_seed := actor_id::text;
  elsif anonymous_visitor_key is not null
    and char_length(anonymous_visitor_key) between 16 and 200 then
    visitor_seed := anonymous_visitor_key;
  else
    raise exception using errcode = '22023', message = 'VISITOR_KEY_REQUIRED';
  end if;

  visit_date := (now() at time zone event_record.timezone)::date;
  visitor_hash := encode(
    extensions.digest(target_event_id::text || ':' || visit_date::text || ':' || visitor_seed, 'sha256'),
    'hex'
  );
  insert into public.event_attribution_visits (
    event_id, source, attribution_token_id, visitor_digest, visited_on
  ) values (
    target_event_id, resolved_source, token_record.id, visitor_hash, visit_date
  ) on conflict do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 1 and token_record.id is not null then
    update public.event_attribution_tokens
    set use_count = use_count + 1
    where id = token_record.id;
  end if;
  return resolved_source;
end;
$$;

create or replace function public.submit_event_feedback(
  target_event_id uuid,
  rating_value smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null or rating_value not between 1 and 5 or not exists (
    select 1 from public.event_checkins
    where event_id = target_event_id and profile_id = actor_id
  ) then
    raise exception using errcode = '42501', message = 'EVENT_FEEDBACK_FORBIDDEN';
  end if;
  insert into public.event_feedback (event_id, profile_id, rating)
  values (target_event_id, actor_id, rating_value)
  on conflict (event_id, profile_id) do update
  set rating = excluded.rating, updated_at = now();
end;
$$;

create or replace function ruckus_private.refresh_event_analytics(
  target_event_id uuid default null,
  refresh_from date default (current_date - 400)
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  refreshed_count integer;
begin
  delete from public.event_analytics_daily d
  where (target_event_id is null or d.event_id = target_event_id)
    and d.metric_date >= refresh_from;
  delete from public.event_analytics_hourly h
  where target_event_id is null or h.event_id = target_event_id;

  with eligible_events as (
    select e.id, e.organization_id, e.timezone, e.ends_at
    from public.events e
    where target_event_id is null or e.id = target_event_id
  ),
  metric_days as (
    select event_id, metric_date
    from (
      select r.event_id, (r.occurred_at at time zone e.timezone)::date metric_date
      from public.recommendation_interactions r join eligible_events e on e.id = r.event_id
      union
      select h.event_id, (h.created_at at time zone e.timezone)::date
      from public.event_rsvp_status_history h join eligible_events e on e.id = h.event_id
      union
      select m.event_id, (m.created_at at time zone e.timezone)::date
      from public.event_messages m join eligible_events e on e.id = m.event_id
      union
      select c.event_id, (c.verified_at at time zone e.timezone)::date
      from public.event_checkins c join eligible_events e on e.id = c.event_id
      union
      select v.event_id, v.visited_on
      from public.event_attribution_visits v join eligible_events e on e.id = v.event_id
      union
      select f.event_id, (f.created_at at time zone e.timezone)::date
      from public.event_feedback f join eligible_events e on e.id = f.event_id
      union
      select e.id, (e.ends_at at time zone e.timezone)::date
      from eligible_events e where e.ends_at < now()
    ) source_days
    where metric_date >= refresh_from
  ),
  interactions as (
    select r.event_id, (r.occurred_at at time zone e.timezone)::date metric_date,
      count(*) filter (where r.kind = 'impression')::integer feed_impressions,
      count(*) filter (where r.kind = 'details_opened')::integer event_card_opens,
      count(*) filter (where r.kind = 'shared')::integer shares,
      count(distinct r.profile_id)::integer unique_participants
    from public.recommendation_interactions r join eligible_events e on e.id = r.event_id
    where (r.occurred_at at time zone e.timezone)::date >= refresh_from
    group by r.event_id, metric_date
  ),
  rsvp_history as (
    select h.event_id, (h.created_at at time zone e.timezone)::date metric_date,
      count(*) filter (
        where h.to_status in ('confirmed', 'pending', 'waitlisted')
          and (h.from_status is null or h.from_status in ('cancelled', 'rejected'))
      )::integer join_attempts,
      count(*) filter (where h.to_status = 'confirmed')::integer confirmed_rsvps,
      count(*) filter (where h.to_status = 'pending')::integer pending_requests,
      count(*) filter (where h.to_status = 'waitlisted')::integer waitlist_additions,
      count(*) filter (where h.to_status = 'cancelled')::integer cancellations,
      count(*) filter (
        where h.from_status = 'waitlisted' and h.to_status = 'confirmed'
      )::integer waitlist_promotions,
      count(distinct h.profile_id)::integer unique_participants
    from public.event_rsvp_status_history h join eligible_events e on e.id = h.event_id
    where (h.created_at at time zone e.timezone)::date >= refresh_from
    group by h.event_id, metric_date
  ),
  chat as (
    select m.event_id, (m.created_at at time zone e.timezone)::date metric_date,
      count(distinct m.sender_id)::integer chat_participants
    from public.event_messages m join eligible_events e on e.id = m.event_id
    where m.sender_id is not null
      and (m.created_at at time zone e.timezone)::date >= refresh_from
    group by m.event_id, metric_date
  ),
  attendance as (
    select c.event_id, (c.verified_at at time zone e.timezone)::date metric_date,
      count(*)::integer checkins,
      count(*) filter (where e.organization_id is not null and exists (
        select 1
        from public.event_checkins prior
        join public.events prior_event on prior_event.id = prior.event_id
        where prior.profile_id = c.profile_id
          and prior_event.organization_id = e.organization_id
          and prior.verified_at < c.verified_at
          and prior.event_id <> c.event_id
      ))::integer repeat_attendees,
      count(distinct c.profile_id)::integer unique_participants
    from public.event_checkins c join eligible_events e on e.id = c.event_id
    where (c.verified_at at time zone e.timezone)::date >= refresh_from
    group by c.event_id, metric_date
  ),
  no_show as (
    select e.id event_id, (e.ends_at at time zone e.timezone)::date metric_date,
      count(*)::integer no_shows
    from eligible_events e
    join public.event_rsvps r on r.event_id = e.id and r.status = 'confirmed'
    left join public.event_checkins c
      on c.event_id = r.event_id and c.profile_id = r.profile_id
    where e.ends_at < now() and c.id is null
    group by e.id, metric_date
  ),
  feedback as (
    select f.event_id, (f.created_at at time zone e.timezone)::date metric_date,
      count(*)::integer ratings, sum(f.rating)::integer rating_total
    from public.event_feedback f join eligible_events e on e.id = f.event_id
    where (f.created_at at time zone e.timezone)::date >= refresh_from
    group by f.event_id, metric_date
  ),
  attribution as (
    select v.event_id, v.visited_on metric_date,
      count(*) filter (where v.source <> 'direct')::integer referral_visits,
      jsonb_object_agg(v.source::text, v.source_count order by v.source::text) attribution_sources
    from (
      select event_id, visited_on, source, count(*)::integer source_count
      from public.event_attribution_visits
      where visited_on >= refresh_from
      group by event_id, visited_on, source
    ) v join eligible_events e on e.id = v.event_id
    group by v.event_id, v.visited_on
  )
  insert into public.event_analytics_daily (
    event_id, metric_date, feed_impressions, event_card_opens, join_attempts,
    confirmed_rsvps, pending_requests, waitlist_additions, cancellations,
    waitlist_promotions, shares, referral_visits, chat_participants, checkins,
    no_shows, ratings, rating_total, repeat_attendees, unique_participants,
    attribution_sources, refreshed_at
  )
  select d.event_id, d.metric_date,
    coalesce(i.feed_impressions, 0), coalesce(i.event_card_opens, 0),
    coalesce(r.join_attempts, 0), coalesce(r.confirmed_rsvps, 0),
    coalesce(r.pending_requests, 0), coalesce(r.waitlist_additions, 0),
    coalesce(r.cancellations, 0), coalesce(r.waitlist_promotions, 0),
    coalesce(i.shares, 0), coalesce(a.referral_visits, 0),
    coalesce(ch.chat_participants, 0), coalesce(att.checkins, 0),
    coalesce(n.no_shows, 0), coalesce(f.ratings, 0), coalesce(f.rating_total, 0),
    coalesce(att.repeat_attendees, 0),
    greatest(
      coalesce(i.unique_participants, 0), coalesce(r.unique_participants, 0),
      coalesce(att.unique_participants, 0)
    ),
    coalesce(a.attribution_sources, '{}'::jsonb), now()
  from metric_days d
  left join interactions i using (event_id, metric_date)
  left join rsvp_history r using (event_id, metric_date)
  left join chat ch using (event_id, metric_date)
  left join attendance att using (event_id, metric_date)
  left join no_show n using (event_id, metric_date)
  left join feedback f using (event_id, metric_date)
  left join attribution a using (event_id, metric_date);
  get diagnostics refreshed_count = row_count;

  with eligible_events as (
    select id, timezone from public.events
    where target_event_id is null or id = target_event_id
  ), buckets as (
    select r.event_id,
      extract(dow from r.occurred_at at time zone e.timezone)::smallint day_of_week,
      extract(hour from r.occurred_at at time zone e.timezone)::smallint hour_of_day,
      count(*) filter (where r.kind = 'impression')::integer impressions,
      count(*) filter (where r.kind = 'details_opened')::integer opens,
      0::integer join_attempts,
      count(distinct r.profile_id)::integer unique_participants
    from public.recommendation_interactions r join eligible_events e on e.id = r.event_id
    where (r.occurred_at at time zone e.timezone)::date >= refresh_from
    group by r.event_id, day_of_week, hour_of_day
    union all
    select h.event_id,
      extract(dow from h.created_at at time zone e.timezone)::smallint,
      extract(hour from h.created_at at time zone e.timezone)::smallint,
      0, 0,
      count(*) filter (
        where h.to_status in ('confirmed', 'pending', 'waitlisted')
          and (h.from_status is null or h.from_status in ('cancelled', 'rejected'))
      )::integer,
      count(distinct h.profile_id)::integer
    from public.event_rsvp_status_history h join eligible_events e on e.id = h.event_id
    where (h.created_at at time zone e.timezone)::date >= refresh_from
    group by h.event_id, 2, 3
  )
  insert into public.event_analytics_hourly (
    event_id, day_of_week, hour_of_day, impressions, opens, join_attempts,
    unique_participants, refreshed_at
  )
  select event_id, day_of_week, hour_of_day, sum(impressions)::integer,
    sum(opens)::integer, sum(join_attempts)::integer,
    max(unique_participants)::integer, now()
  from buckets
  group by event_id, day_of_week, hour_of_day;

  return refreshed_count;
end;
$$;

revoke all on function ruckus_private.refresh_event_analytics(uuid, date)
  from public, anon, authenticated;

create or replace function ruckus_private.analytics_range(
  target_event_id uuid,
  period_key text,
  anchor_date date
)
returns table(range_start date, range_end date)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  event_record public.events%rowtype;
begin
  select * into event_record from public.events where id = target_event_id;
  if period_key = 'daily' then
    return query select anchor_date, anchor_date;
  elsif period_key = 'weekly' then
    return query select date_trunc('week', anchor_date)::date,
      (date_trunc('week', anchor_date)::date + 6);
  elsif period_key = 'monthly' then
    return query select date_trunc('month', anchor_date)::date,
      (date_trunc('month', anchor_date) + interval '1 month - 1 day')::date;
  elsif period_key = 'semester' then
    return query
      select s.starts_on, s.ends_on from public.campus_semesters s
      where s.campus_id = event_record.campus_id
        and anchor_date between s.starts_on and s.ends_on;
    if not found then
      raise exception using errcode = '22023', message = 'SEMESTER_NOT_CONFIGURED';
    end if;
  elsif period_key = 'lifecycle' then
    return query select
      (event_record.created_at at time zone event_record.timezone)::date,
      greatest(
        (event_record.created_at at time zone event_record.timezone)::date,
        (coalesce(event_record.archived_at, event_record.completed_at,
          event_record.cancelled_at, now()) at time zone event_record.timezone)::date
      );
  else
    raise exception using errcode = '22023', message = 'INVALID_ANALYTICS_PERIOD';
  end if;
end;
$$;

revoke all on function ruckus_private.analytics_range(uuid, text, date)
  from public, anon, authenticated;

create or replace function ruckus_private.analytics_rate(
  numerator_value bigint,
  denominator_value bigint
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'numerator', numerator_value,
    'denominator', denominator_value,
    'value', case when denominator_value > 0
      then round(numerator_value::numeric / denominator_value, 4)
      else null end
  );
$$;

create or replace function public.get_event_analytics(
  target_event_id uuid,
  period_key text default 'lifecycle',
  anchor_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  range_record record;
  totals record;
  event_record public.events%rowtype;
  timeline jsonb;
  heatmap jsonb;
  sources jsonb;
begin
  if actor_id is null or not ruckus_private.is_event_host(target_event_id, actor_id) then
    raise exception using errcode = '42501', message = 'EVENT_ANALYTICS_FORBIDDEN';
  end if;
  select * into event_record from public.events where id = target_event_id;
  select * into range_record
  from ruckus_private.analytics_range(target_event_id, period_key, anchor_date);
  perform ruckus_private.refresh_event_analytics(target_event_id, range_record.range_start);

  select
    coalesce(sum(feed_impressions), 0)::bigint feed_impressions,
    coalesce(sum(event_card_opens), 0)::bigint event_card_opens,
    coalesce(sum(join_attempts), 0)::bigint join_attempts,
    coalesce(sum(confirmed_rsvps), 0)::bigint confirmed_rsvps,
    coalesce(sum(pending_requests), 0)::bigint pending_requests,
    coalesce(sum(waitlist_additions), 0)::bigint waitlist_additions,
    coalesce(sum(cancellations), 0)::bigint cancellations,
    coalesce(sum(waitlist_promotions), 0)::bigint waitlist_promotions,
    coalesce(sum(shares), 0)::bigint shares,
    coalesce(sum(referral_visits), 0)::bigint referral_visits,
    coalesce(sum(chat_participants), 0)::bigint chat_participants,
    coalesce(sum(checkins), 0)::bigint checkins,
    coalesce(sum(no_shows), 0)::bigint no_shows,
    coalesce(sum(ratings), 0)::bigint ratings,
    coalesce(sum(rating_total), 0)::bigint rating_total,
    coalesce(sum(repeat_attendees), 0)::bigint repeat_attendees
  into totals
  from public.event_analytics_daily
  where event_id = target_event_id
    and metric_date between range_record.range_start and range_record.range_end;

  select coalesce(jsonb_agg(jsonb_build_object(
    'date', metric_date,
    'rsvpVelocity', confirmed_rsvps + pending_requests + waitlist_additions,
    'cancellations', cancellations,
    'checkins', checkins,
    'chatParticipants', chat_participants,
    'referralVisits', referral_visits
  ) order by metric_date), '[]'::jsonb) into timeline
  from public.event_analytics_daily
  where event_id = target_event_id
    and metric_date between range_record.range_start and range_record.range_end;

  select coalesce(jsonb_agg(jsonb_build_object(
    'dayOfWeek', day_of_week,
    'hourOfDay', hour_of_day,
    'impressions', case when unique_participants >= 3 then impressions else null end,
    'opens', case when unique_participants >= 3 then opens else null end,
    'joinAttempts', case when unique_participants >= 3 then join_attempts else null end,
    'suppressed', unique_participants < 3
  ) order by day_of_week, hour_of_day), '[]'::jsonb) into heatmap
  from public.event_analytics_hourly where event_id = target_event_id;

  select coalesce(jsonb_object_agg(source, source_total), '{}'::jsonb) into sources
  from (
    select key as source, sum(value::integer)::bigint source_total
    from public.event_analytics_daily d,
      lateral jsonb_each_text(d.attribution_sources)
    where d.event_id = target_event_id
      and d.metric_date between range_record.range_start and range_record.range_end
    group by key
  ) source_totals;

  return jsonb_build_object(
    'eventId', target_event_id,
    'timezone', event_record.timezone,
    'period', period_key,
    'range', jsonb_build_object('start', range_record.range_start, 'end', range_record.range_end),
    'counts', jsonb_build_object(
      'feedImpressions', totals.feed_impressions,
      'eventCardOpens', totals.event_card_opens,
      'joinAttempts', totals.join_attempts,
      'confirmedRsvps', totals.confirmed_rsvps,
      'pendingRequests', totals.pending_requests,
      'waitlistAdditions', totals.waitlist_additions,
      'cancellations', totals.cancellations,
      'waitlistPromotions', totals.waitlist_promotions,
      'shares', totals.shares,
      'referralVisits', totals.referral_visits,
      'chatParticipants', totals.chat_participants,
      'checkins', totals.checkins,
      'noShows', totals.no_shows,
      'ratings', totals.ratings,
      'ratingAverage', case when totals.ratings > 0
        then round(totals.rating_total::numeric / totals.ratings, 2) else null end,
      'repeatAttendees', totals.repeat_attendees
    ),
    'rates', jsonb_build_object(
      'detailView', ruckus_private.analytics_rate(totals.event_card_opens, totals.feed_impressions),
      'rsvpConversion', ruckus_private.analytics_rate(totals.join_attempts, totals.event_card_opens),
      'attendanceConversion', ruckus_private.analytics_rate(totals.checkins, totals.confirmed_rsvps),
      'cancellation', ruckus_private.analytics_rate(totals.cancellations, totals.confirmed_rsvps + totals.cancellations),
      'noShow', ruckus_private.analytics_rate(totals.no_shows, totals.checkins + totals.no_shows),
      'waitlistConversion', ruckus_private.analytics_rate(totals.waitlist_promotions, totals.waitlist_additions),
      'shareConversion', ruckus_private.analytics_rate(totals.referral_visits, totals.shares),
      'repeatAttendee', ruckus_private.analytics_rate(totals.repeat_attendees, totals.checkins)
    ),
    'attributionSources', sources,
    'timeline', timeline,
    'timeAndDayFunnel', heatmap,
    'privacy', jsonb_build_object(
      'eventCellThreshold', 3,
      'heatmapMeaning', 'Time-and-day funnel activity; never a movement or location map.'
    )
  );
end;
$$;

create or replace function public.get_organization_analytics(
  target_organization_id uuid,
  range_start date,
  range_end date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  cohort_threshold constant integer := 5;
  result jsonb;
begin
  if actor_id is null
    or not ruckus_private.can_manage_organization(target_organization_id, actor_id)
    or range_start > range_end or range_end > range_start + 400 then
    raise exception using errcode = '42501', message = 'ORGANIZATION_ANALYTICS_FORBIDDEN';
  end if;
  select jsonb_build_object(
    'organizationId', target_organization_id,
    'range', jsonb_build_object('start', range_start, 'end', range_end),
    'privacyThreshold', cohort_threshold,
    'events', coalesce(jsonb_agg(jsonb_build_object(
      'eventId', event_id,
      'date', metric_date,
      'participantCohort', case when unique_participants >= cohort_threshold
        then unique_participants else null end,
      'impressions', case when unique_participants >= cohort_threshold
        then feed_impressions else null end,
      'opens', case when unique_participants >= cohort_threshold
        then event_card_opens else null end,
      'confirmedRsvps', case when unique_participants >= cohort_threshold
        then confirmed_rsvps else null end,
      'checkins', case when unique_participants >= cohort_threshold
        then checkins else null end,
      'suppressed', unique_participants < cohort_threshold
    ) order by metric_date, event_id), '[]'::jsonb)
  ) into result
  from public.event_analytics_daily d
  join public.events e on e.id = d.event_id
  where e.organization_id = target_organization_id
    and d.metric_date between range_start and range_end;
  return result;
end;
$$;

create or replace function ruckus_private.csv_cell(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select '"' || replace(coalesce(value, ''), '"', '""') || '"';
$$;

revoke all on function ruckus_private.analytics_rate(bigint, bigint)
  from public, anon, authenticated;
revoke all on function ruckus_private.csv_cell(text)
  from public, anon, authenticated;

create or replace function public.export_event_analytics_csv(
  target_event_id uuid,
  period_key text default 'lifecycle',
  anchor_date date default current_date
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  range_record record;
  event_record public.events%rowtype;
  csv text;
  exported_rows integer;
begin
  if actor_id is null or not ruckus_private.is_event_host(target_event_id, actor_id) then
    raise exception using errcode = '42501', message = 'EVENT_ANALYTICS_EXPORT_FORBIDDEN';
  end if;
  select * into event_record from public.events where id = target_event_id;
  select * into range_record
  from ruckus_private.analytics_range(target_event_id, period_key, anchor_date);
  perform ruckus_private.refresh_event_analytics(target_event_id, range_record.range_start);

  select count(*)::integer into exported_rows
  from public.event_analytics_daily
  where event_id = target_event_id
    and metric_date between range_record.range_start and range_record.range_end;

  select 'date,feed_impressions,event_card_opens,join_attempts,confirmed_rsvps,pending_requests,waitlist_additions,cancellations,waitlist_promotions,shares,referral_visits,chat_participants,checkins,no_shows,ratings,rating_average,repeat_attendees' || chr(10)
    || coalesce(string_agg(
      ruckus_private.csv_cell(metric_date::text) || ',' ||
      feed_impressions || ',' || event_card_opens || ',' || join_attempts || ',' ||
      confirmed_rsvps || ',' || pending_requests || ',' || waitlist_additions || ',' ||
      cancellations || ',' || waitlist_promotions || ',' || shares || ',' ||
      referral_visits || ',' || chat_participants || ',' || checkins || ',' ||
      no_shows || ',' || ratings || ',' ||
      coalesce(round(rating_total::numeric / nullif(ratings, 0), 2)::text, '') || ',' ||
      repeat_attendees,
      chr(10) order by metric_date
    ), '') into csv
  from public.event_analytics_daily
  where event_id = target_event_id
    and metric_date between range_record.range_start and range_record.range_end;

  insert into public.analytics_export_audit (
    actor_id, event_id, organization_id, period_key, row_count
  ) values (
    actor_id, target_event_id, event_record.organization_id, period_key, exported_rows
  );
  return csv;
end;
$$;

create or replace function public.refresh_event_analytics()
returns integer
language sql
security definer
set search_path = ''
as $$
  select ruckus_private.refresh_event_analytics(null, current_date - 400);
$$;

create or replace function public.cleanup_event_analytics(batch_size integer default 5000)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if batch_size not between 1 and 20000 then
    raise exception using errcode = '22023', message = 'INVALID_BATCH_SIZE';
  end if;
  with expired as (
    select id from public.event_attribution_visits
    where expires_at <= now() order by expires_at limit batch_size
  )
  delete from public.event_attribution_visits v using expired
  where v.id = expired.id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.create_event_attribution_token(
  uuid, public.event_attribution_source, timestamptz, integer, text
) from public, anon;
revoke all on function public.record_event_attribution_visit(uuid, text, text) from public;
revoke all on function public.submit_event_feedback(uuid, smallint) from public, anon;
revoke all on function public.get_event_analytics(uuid, text, date) from public, anon;
revoke all on function public.get_organization_analytics(uuid, date, date) from public, anon;
revoke all on function public.export_event_analytics_csv(uuid, text, date) from public, anon;
revoke all on function public.refresh_event_analytics() from public, anon, authenticated;
revoke all on function public.cleanup_event_analytics(integer) from public, anon, authenticated;

grant execute on function public.create_event_attribution_token(
  uuid, public.event_attribution_source, timestamptz, integer, text
) to authenticated;
grant execute on function public.record_event_attribution_visit(uuid, text, text)
  to anon, authenticated;
grant execute on function public.submit_event_feedback(uuid, smallint) to authenticated;
grant execute on function public.get_event_analytics(uuid, text, date) to authenticated;
grant execute on function public.get_organization_analytics(uuid, date, date) to authenticated;
grant execute on function public.export_event_analytics_csv(uuid, text, date) to authenticated;
grant execute on function public.refresh_event_analytics() to service_role;
grant execute on function public.cleanup_event_analytics(integer) to service_role;
