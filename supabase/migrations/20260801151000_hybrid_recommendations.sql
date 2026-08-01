-- Explainable hybrid event recommendations. Deterministic ranking is always the
-- fallback; aggregate collaborative and embedding stages are separately gated.

create type public.recommendation_interaction_kind as enum (
  'impression',
  'details_opened',
  'passed',
  'saved',
  'joined',
  'waitlisted',
  'cancelled',
  'checked_in',
  'rated',
  'shared',
  'invited_friend',
  'followed_organizer'
);

create table public.organization_follows (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, organization_id)
);

create index organization_follows_organization_idx
  on public.organization_follows(organization_id, created_at desc);

create table public.recommendation_interactions (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  campus_id uuid not null references public.campuses(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  kind public.recommendation_interaction_kind not null,
  surface text not null default 'system',
  deduplication_key text not null unique,
  occurred_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '400 days'),
  created_at timestamptz not null default now(),
  constraint recommendation_interaction_target check (
    (kind = 'followed_organizer' and organization_id is not null)
    or (kind <> 'followed_organizer' and event_id is not null)
  ),
  constraint recommendation_interaction_surface check (
    surface ~ '^[a-z0-9_-]{2,40}$'
  ),
  constraint recommendation_interaction_deduplication check (
    char_length(deduplication_key) between 12 and 220
  ),
  constraint recommendation_interaction_retention check (
    expires_at > occurred_at and expires_at <= occurred_at + interval '401 days'
  )
);

create index recommendation_interactions_profile_idx
  on public.recommendation_interactions(profile_id, occurred_at desc);
create index recommendation_interactions_event_idx
  on public.recommendation_interactions(event_id, kind, occurred_at desc);
create index recommendation_interactions_retention_idx
  on public.recommendation_interactions(expires_at);

create table public.recommendation_feature_flags (
  campus_id uuid primary key references public.campuses(id) on delete cascade,
  collaborative_enabled boolean not null default false,
  embeddings_enabled boolean not null default false,
  embedding_provider text,
  embedding_model_version text,
  max_daily_embedding_jobs integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint recommendation_embedding_configuration check (
    (
      not embeddings_enabled
      and embedding_provider is null
      and embedding_model_version is null
      and max_daily_embedding_jobs = 0
    )
    or (
      embeddings_enabled
      and embedding_provider is not null
      and embedding_model_version is not null
      and max_daily_embedding_jobs between 1 and 10000
    )
  )
);

insert into public.recommendation_feature_flags (campus_id)
select id from public.campuses
on conflict (campus_id) do nothing;

create or replace function ruckus_private.initialize_recommendation_flags()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.recommendation_feature_flags (campus_id)
  values (new.id)
  on conflict (campus_id) do nothing;
  return new;
end;
$$;

create trigger initialize_recommendation_flags
after insert on public.campuses
for each row execute function ruckus_private.initialize_recommendation_flags();

create table public.event_collaborative_signals (
  event_id uuid not null references public.events(id) on delete cascade,
  similar_event_id uuid not null references public.events(id) on delete cascade,
  cohort_size integer not null,
  signal_strength integer not null,
  computed_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '8 days'),
  primary key (event_id, similar_event_id),
  constraint collaborative_signal_not_self check (event_id <> similar_event_id),
  constraint collaborative_signal_cohort check (cohort_size >= 5),
  constraint collaborative_signal_strength check (signal_strength between 1 and 100),
  constraint collaborative_signal_retention check (
    expires_at > computed_at and expires_at <= computed_at + interval '8 days'
  )
);

create index event_collaborative_signals_similar_idx
  on public.event_collaborative_signals(similar_event_id, signal_strength desc);

create table public.event_embedding_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  provider text not null,
  model_version text not null,
  content_digest text not null,
  status text not null default 'pending',
  attempts smallint not null default 0,
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, provider, model_version, content_digest),
  constraint event_embedding_job_status check (
    status in ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  constraint event_embedding_job_attempts check (attempts between 0 and 10),
  constraint event_embedding_job_fields check (
    provider ~ '^[a-z0-9_-]{2,40}$'
    and char_length(model_version) between 1 and 80
    and content_digest ~ '^[a-f0-9]{64}$'
    and (last_error_code is null or char_length(last_error_code) <= 100)
  )
);

create index event_embedding_jobs_claim_idx
  on public.event_embedding_jobs(status, available_at)
  where status in ('pending', 'failed');

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organization_follows',
    'recommendation_interactions',
    'recommendation_feature_flags',
    'event_collaborative_signals',
    'event_embedding_jobs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;

create or replace function ruckus_private.record_recommendation_interaction(
  actor_id uuid,
  target_event_id uuid,
  target_organization_id uuid,
  interaction_kind public.recommendation_interaction_kind,
  interaction_surface text,
  interaction_deduplication_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_campus_id uuid;
  target_campus_id uuid;
begin
  if actor_id is null
    or interaction_surface !~ '^[a-z0-9_-]{2,40}$'
    or char_length(interaction_deduplication_key) not between 12 and 220 then
    raise exception using errcode = '22023', message = 'INVALID_RECOMMENDATION_INTERACTION';
  end if;

  select campus_id into actor_campus_id
  from public.profiles
  where id = actor_id
    and email_domain_verified_at is not null
    and onboarding_completed_at is not null
    and deletion_requested_at is null
    and banned_at is null;

  if target_event_id is not null then
    select campus_id into target_campus_id from public.events where id = target_event_id;
  elsif target_organization_id is not null then
    select campus_id into target_campus_id
    from public.organizations where id = target_organization_id;
  end if;

  if actor_campus_id is null or target_campus_id is null
    or actor_campus_id <> target_campus_id then
    raise exception using errcode = '42501', message = 'RECOMMENDATION_TARGET_UNAVAILABLE';
  end if;

  insert into public.recommendation_interactions (
    profile_id,
    campus_id,
    event_id,
    organization_id,
    kind,
    surface,
    deduplication_key
  ) values (
    actor_id,
    actor_campus_id,
    target_event_id,
    target_organization_id,
    interaction_kind,
    interaction_surface,
    interaction_deduplication_key
  ) on conflict (deduplication_key) do update
  set occurred_at = greatest(
        public.recommendation_interactions.occurred_at,
        excluded.occurred_at
      ),
      expires_at = greatest(
        public.recommendation_interactions.expires_at,
        excluded.expires_at
      );
end;
$$;

create or replace function public.record_event_interaction(
  target_event_id uuid,
  interaction_kind public.recommendation_interaction_kind,
  interaction_surface text default 'event_detail'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  event_record public.events%rowtype;
begin
  if interaction_kind not in (
    'details_opened', 'shared', 'invited_friend'
  ) then
    raise exception using errcode = '22023', message = 'INTERACTION_KIND_NOT_CLIENT_RECORDABLE';
  end if;
  select * into event_record from public.events where id = target_event_id;
  if event_record.id is null
    or event_record.status not in ('published', 'completed')
    or event_record.moderation_restricted
    or not (
      event_record.visibility in ('public', 'campus')
      or ruckus_private.is_event_host(target_event_id, actor_id)
      or exists (
        select 1 from public.event_rsvps
        where event_id = target_event_id and profile_id = actor_id
      )
    ) then
    raise exception using errcode = '42501', message = 'RECOMMENDATION_TARGET_UNAVAILABLE';
  end if;
  perform ruckus_private.record_recommendation_interaction(
    actor_id,
    target_event_id,
    event_record.organization_id,
    interaction_kind,
    interaction_surface,
    actor_id::text || ':' || target_event_id::text || ':' || interaction_kind::text
      || ':' || to_char(now() at time zone 'UTC', 'YYYYMMDD')
      || ':' || interaction_surface
  );
end;
$$;

create or replace function public.record_event_impressions(
  target_event_ids uuid[],
  interaction_surface text default 'discover'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_event_id uuid;
  recorded integer := 0;
begin
  if actor_id is null or cardinality(target_event_ids) not between 1 and 50 then
    raise exception using errcode = '22023', message = 'INVALID_IMPRESSION_BATCH';
  end if;
  foreach target_event_id in array target_event_ids
  loop
    if exists (
      select 1 from public.events
      where id = target_event_id
        and status = 'published'
        and not moderation_restricted
        and visibility in ('public', 'campus')
    ) then
      perform ruckus_private.record_recommendation_interaction(
        actor_id,
        target_event_id,
        (select organization_id from public.events where id = target_event_id),
        'impression',
        interaction_surface,
        actor_id::text || ':' || target_event_id::text || ':impression:'
          || to_char(now() at time zone 'UTC', 'YYYYMMDD')
          || ':' || interaction_surface
      );
      recorded := recorded + 1;
    end if;
  end loop;
  return recorded;
end;
$$;

create or replace function public.follow_organization(target_organization_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_campus_id uuid;
begin
  select campus_id into target_campus_id
  from public.organizations
  where id = target_organization_id and not is_restricted;
  if not exists (
    select 1 from public.profiles
    where id = actor_id
      and campus_id = target_campus_id
      and email_domain_verified_at is not null
      and onboarding_completed_at is not null
      and deletion_requested_at is null
      and banned_at is null
  ) then
    raise exception using errcode = '42501', message = 'ORGANIZATION_FOLLOW_DENIED';
  end if;
  insert into public.organization_follows (profile_id, organization_id)
  values (actor_id, target_organization_id)
  on conflict (profile_id, organization_id) do nothing;
  perform ruckus_private.record_recommendation_interaction(
    actor_id,
    null,
    target_organization_id,
    'followed_organizer',
    'organization_profile',
    actor_id::text || ':' || target_organization_id::text || ':followed_organizer'
  );
  return true;
end;
$$;

create or replace function public.unfollow_organization(target_organization_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  affected integer;
begin
  delete from public.organization_follows
  where profile_id = actor_id and organization_id = target_organization_id;
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

create or replace function public.is_organization_followed(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_follows
    where profile_id = (select auth.uid())
      and organization_id = target_organization_id
  );
$$;

create or replace function ruckus_private.capture_event_decision_interaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform ruckus_private.record_recommendation_interaction(
    new.profile_id,
    new.event_id,
    (select organization_id from public.events where id = new.event_id),
    (case when new.decision = 'passed' then 'passed' else 'saved' end)
      ::public.recommendation_interaction_kind,
    'discover',
    new.profile_id::text || ':' || new.event_id::text || ':decision:' || new.decision::text
  );
  return new;
end;
$$;

create trigger capture_event_decision_interaction
after insert or update of decision on public.event_discovery_decisions
for each row execute function ruckus_private.capture_event_decision_interaction();

create or replace function ruckus_private.capture_event_rsvp_interaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  interaction_kind public.recommendation_interaction_kind;
begin
  if tg_op = 'UPDATE' and new.status = old.status then return new; end if;
  interaction_kind := case new.status
    when 'confirmed' then 'joined'::public.recommendation_interaction_kind
    when 'waitlisted' then 'waitlisted'::public.recommendation_interaction_kind
    when 'cancelled' then 'cancelled'::public.recommendation_interaction_kind
    else null
  end;
  if interaction_kind is not null then
    perform ruckus_private.record_recommendation_interaction(
      new.profile_id,
      new.event_id,
      (select organization_id from public.events where id = new.event_id),
      interaction_kind,
      'rsvp',
      new.profile_id::text || ':' || new.id::text || ':' || interaction_kind::text
    );
  end if;
  return new;
end;
$$;

create trigger capture_event_rsvp_interaction
after insert or update of status on public.event_rsvps
for each row execute function ruckus_private.capture_event_rsvp_interaction();

create or replace function ruckus_private.capture_event_checkin_interaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform ruckus_private.record_recommendation_interaction(
    new.profile_id,
    new.event_id,
    (select organization_id from public.events where id = new.event_id),
    'checked_in',
    'checkin',
    new.profile_id::text || ':' || new.id::text || ':checked_in'
  );
  return new;
end;
$$;

create trigger capture_event_checkin_interaction
after insert on public.event_checkins
for each row execute function ruckus_private.capture_event_checkin_interaction();

create or replace function public.refresh_event_collaborative_signals()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  delete from public.event_collaborative_signals;
  with positive_profile_events as (
    select distinct profile_id, campus_id, event_id
    from public.recommendation_interactions
    where event_id is not null
      and kind in ('saved', 'joined', 'checked_in', 'rated')
      and occurred_at >= now() - interval '180 days'
      and expires_at > now()
  ), pairs as (
    select
      first.event_id,
      second.event_id as similar_event_id,
      count(distinct first.profile_id)::integer as cohort_size
    from positive_profile_events as first
    join positive_profile_events as second
      on second.profile_id = first.profile_id
     and second.campus_id = first.campus_id
     and second.event_id <> first.event_id
    group by first.event_id, second.event_id
    having count(distinct first.profile_id) >= 5
  )
  insert into public.event_collaborative_signals (
    event_id, similar_event_id, cohort_size, signal_strength
  )
  select
    event_id,
    similar_event_id,
    cohort_size,
    least(100, 20 + cohort_size * 5)
  from pairs;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function public.cleanup_recommendation_data(batch_size integer default 5000)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  with expired as (
    select id from public.recommendation_interactions
    where expires_at <= now()
    order by expires_at
    limit greatest(1, least(coalesce(batch_size, 5000), 20000))
  )
  delete from public.recommendation_interactions
  where id in (select id from expired);
  get diagnostics affected = row_count;
  delete from public.event_collaborative_signals where expires_at <= now();
  return affected;
end;
$$;

create or replace function public.queue_event_embedding_jobs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  with configured_events as (
    select
      event.id as event_id,
      event.campus_id,
      flag.embedding_provider as provider,
      flag.embedding_model_version as model_version,
      flag.max_daily_embedding_jobs,
      pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
        jsonb_build_object(
          'title', event.title,
          'description', event.description,
          'category', event.category,
          'tags', coalesce((
            select jsonb_agg(tag.name order by tag.name)
            from public.event_tags
            join public.tags as tag on tag.id = event_tags.tag_id
            where event_tags.event_id = event.id
          ), '[]'::jsonb),
          'organization', organization.name
        )::text,
        'UTF8'
      ), 'sha256'), 'hex') as content_digest,
      row_number() over (
        partition by event.campus_id order by event.updated_at desc, event.id
      ) as campus_position,
      (
        select count(*)::integer from public.event_embedding_jobs as existing_today
        join public.events as existing_event on existing_event.id = existing_today.event_id
        where existing_event.campus_id = event.campus_id
          and existing_today.created_at >= date_trunc('day', now())
      ) as jobs_today
    from public.events as event
    join public.recommendation_feature_flags as flag on flag.campus_id = event.campus_id
    left join public.organizations as organization on organization.id = event.organization_id
    where event.status = 'published'
      and not event.moderation_restricted
      and flag.embeddings_enabled
  )
  insert into public.event_embedding_jobs (
    event_id, provider, model_version, content_digest
  )
  select event_id, provider, model_version, content_digest
  from configured_events
  where campus_position <= greatest(max_daily_embedding_jobs - jobs_today, 0)
  on conflict (event_id, provider, model_version, content_digest) do nothing;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Replace the score-exposing feed with an explainable response and an opaque
-- pagination token. The score remains server-internal.
drop function public.get_event_feed(
  text, text, timestamptz, timestamptz, integer, timestamptz, uuid, integer
);
drop function ruckus_private.get_event_feed(
  text, text, timestamptz, timestamptz, integer, timestamptz, uuid, integer
);

create or replace function ruckus_private.get_event_feed(
  search_text text default null,
  category_filter text default null,
  starts_after timestamptz default null,
  ends_before timestamptz default null,
  cursor_token text default null,
  page_size integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_campus_id uuid;
  safe_page_size integer := greatest(1, least(coalesce(page_size, 20), 50));
  cursor_payload jsonb;
  cursor_score integer;
  cursor_starts_at timestamptz;
  cursor_id uuid;
  collaborative_enabled boolean := false;
  result jsonb;
begin
  if actor_id is not null then
    select campus_id into actor_campus_id
    from public.profiles
    where id = actor_id
      and email_domain_verified_at is not null
      and onboarding_completed_at is not null
      and deletion_requested_at is null
      and banned_at is null;
    if actor_campus_id is null then
      raise exception using errcode = '42501', message = 'PROFILE_NOT_ELIGIBLE';
    end if;
    select coalesce(flag.collaborative_enabled, false)
    into collaborative_enabled
    from public.recommendation_feature_flags as flag
    where flag.campus_id = actor_campus_id;
  end if;

  if cursor_token is not null then
    begin
      cursor_payload := convert_from(
        pg_catalog.decode(cursor_token, 'base64'), 'UTF8'
      )::jsonb;
      if cursor_payload ->> 'v' <> '1' then raise exception 'version'; end if;
      cursor_score := (cursor_payload ->> 's')::integer;
      cursor_starts_at := (cursor_payload ->> 't')::timestamptz;
      cursor_id := (cursor_payload ->> 'i')::uuid;
    exception when others then
      raise exception using errcode = '22023', message = 'INVALID_RECOMMENDATION_CURSOR';
    end;
  end if;

  with features as (
    select
      event.*,
      campus.name as campus_name,
      organization.name as organization_name,
      coalesce(organization.is_verified, false) as organization_verified,
      (select count(*)::integer from public.event_rsvps
       where event_id = event.id and status = 'confirmed') as confirmed_count,
      actor_id is not null and exists (
        select 1
        from public.profile_interests
        join public.interests on interests.id = profile_interests.interest_id
        where profile_interests.profile_id = actor_id
          and lower(interests.name) = lower(event.category)
      ) as interest_match,
      actor_id is not null and exists (
        select 1 from public.organization_follows
        where profile_id = actor_id and organization_id = event.organization_id
      ) as organization_followed,
      actor_id is not null and exists (
        select 1 from public.event_hosts
        join public.user_follows
          on user_follows.followed_id = event_hosts.profile_id
         and user_follows.follower_id = actor_id
         and user_follows.status = 'active'
        where event_hosts.event_id = event.id
      ) as host_followed,
      case when actor_id is null then 0 else (
        select count(*)::integer
        from public.event_rsvps as friend_rsvp
        join public.profile_preferences as friend_preference
          on friend_preference.profile_id = friend_rsvp.profile_id
         and friend_preference.attendance_visibility = 'friends'
        where friend_rsvp.event_id = event.id
          and friend_rsvp.status = 'confirmed'
          and ruckus_private.are_friends(actor_id, friend_rsvp.profile_id)
          and not public.is_blocked_between(actor_id, friend_rsvp.profile_id)
      ) end as friends_attending,
      case when actor_id is null then 0 else (
        select count(*)::integer
        from public.event_checkins as prior_checkin
        join public.events as prior_event on prior_event.id = prior_checkin.event_id
        where prior_checkin.profile_id = actor_id
          and lower(prior_event.category) = lower(event.category)
      ) end as prior_category_checkins,
      case when actor_id is null or not collaborative_enabled then 0 else coalesce((
        select sum(signal.signal_strength)::integer
        from public.event_collaborative_signals as signal
        join public.event_checkins as prior_checkin
          on prior_checkin.event_id = signal.similar_event_id
         and prior_checkin.profile_id = actor_id
        where signal.event_id = event.id
          and signal.cohort_size >= 5
          and signal.expires_at > now()
      ), 0) end as collaborative_affinity,
      actor_id is not null and exists (
        select 1 from public.event_checkins as prior_checkin
        join public.events as prior_event on prior_event.id = prior_checkin.event_id
        where prior_checkin.profile_id = actor_id
          and lower(prior_event.title) = lower(event.title)
      ) as repeated_event,
      actor_id is not null
        and mod(abs(pg_catalog.hashtextextended(
          actor_id::text || ':' || event.id::text || ':' || current_date::text, 0
        )), 10) < 2 as exploration_pick
    from public.events as event
    join public.campuses as campus on campus.id = event.campus_id
    left join public.organizations as organization on organization.id = event.organization_id
    where event.status = 'published'
      and not event.moderation_restricted
      and event.ends_at > now()
      and (
        (actor_id is null and event.visibility = 'public')
        or (
          actor_id is not null
          and event.campus_id = actor_campus_id
          and event.visibility in ('public', 'campus')
        )
      )
      and (starts_after is null or event.starts_at >= starts_after)
      and (ends_before is null or event.starts_at < ends_before)
      and (category_filter is null or lower(event.category) = lower(category_filter))
      and (
        nullif(trim(coalesce(search_text, '')), '') is null
        or event.title ilike '%' || trim(search_text) || '%'
        or event.description ilike '%' || trim(search_text) || '%'
        or organization.name ilike '%' || trim(search_text) || '%'
      )
      and (
        actor_id is null
        or not exists (
          select 1 from public.event_rsvps
          where event_id = event.id and profile_id = actor_id and status = 'confirmed'
        )
      )
      and (
        actor_id is null
        or not exists (
          select 1 from public.event_discovery_decisions
          where event_id = event.id and profile_id = actor_id and decision = 'passed'
        )
      )
      and (
        actor_id is null
        or not exists (
          select 1 from public.event_rsvps as own_schedule
          join public.events as scheduled_event on scheduled_event.id = own_schedule.event_id
          where own_schedule.profile_id = actor_id
            and own_schedule.status = 'confirmed'
            and scheduled_event.id <> event.id
            and scheduled_event.starts_at < event.ends_at
            and scheduled_event.ends_at > event.starts_at
        )
      )
      and not exists (
        select 1 from public.event_hosts
        join public.blocks on actor_id is not null and (
          (blocks.blocker_id = actor_id and blocks.blocked_id = event_hosts.profile_id)
          or (blocks.blocked_id = actor_id and blocks.blocker_id = event_hosts.profile_id)
        )
        where event_hosts.event_id = event.id
      )
  ), raw_scores as (
    select *, (
      case when interest_match then 30 else 0 end
      + least(prior_category_checkins, 4) * 6
      + case when organization_followed then 22 else 0 end
      + case when host_followed then 15 else 0 end
      + least(friends_attending, 4) * 14
      + case when created_at >= now() - interval '7 days' then 8 else 0 end
      + floor(20.0 * confirmed_count / (confirmed_count + 10))::integer
      + case when confirmed_count < capacity then 5 else -8 end
      + case when organization_verified then 8 else 0 end
      + case when starts_at <= now() + interval '1 day' then 9 else 0 end
      + least(collaborative_affinity / 10, 18)
      + case when exploration_pick then 6 else 0 end
      - case when repeated_event then 24 else 0 end
    )::integer as raw_score
    from features
  ), diversified as (
    select *,
      row_number() over (
        partition by category order by raw_score desc, starts_at, id
      ) as category_position
    from raw_scores
  ), scored as (
    select *, (raw_score - least((category_position - 1)::integer, 4) * 7)::integer
      as recommendation_score
    from diversified
  ), page as (
    select * from scored
    where cursor_score is null
      or recommendation_score < cursor_score
      or (
        recommendation_score = cursor_score
        and (starts_at, id) > (cursor_starts_at, cursor_id)
      )
    order by recommendation_score desc, starts_at, id
    limit safe_page_size + 1
  ), visible_page as (
    select * from page
    order by recommendation_score desc, starts_at, id
    limit safe_page_size
  ), has_more as (
    select exists(select 1 from page offset safe_page_size) as value
  ), cursor_item as (
    select * from visible_page
    order by recommendation_score desc, starts_at, id
    offset greatest(safe_page_size - 1, 0) limit 1
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'slug', slug,
        'title', title,
        'description', description,
        'category', category,
        'coverImagePath', cover_image_path,
        'campusId', campus_id,
        'campusName', campus_name,
        'organizationId', organization_id,
        'organizationName', organization_name,
        'organizationVerified', organization_verified,
        'organizationFollowed', organization_followed,
        'startsAt', starts_at,
        'endsAt', ends_at,
        'timezone', timezone,
        'venueName', venue_name,
        'locationDescription', location_description,
        'capacity', capacity,
        'confirmedCount', confirmed_count,
        'availability', case
          when confirmed_count < capacity then 'available'
          when waitlist_enabled then 'waitlist'
          else 'full'
        end,
        'waitlistEnabled', waitlist_enabled,
        'approvalRequired', approval_required,
        'visibility', visibility,
        'accessibilityInformation', accessibility_information,
        'costInformation', cost_information,
        'cancellationPolicy', cancellation_policy,
        'friendsAttendingCount', friends_attending,
        'recommendationReasons', array_remove(array[
          case when friends_attending = 1 then 'A friend is going'
            when friends_attending > 1 then friends_attending || ' friends are going' end,
          case when organization_followed then 'From an organization you follow' end,
          case when host_followed then 'From a host you follow' end,
          case when interest_match then 'Matches your ' || lower(category) || ' interests' end,
          case when prior_category_checkins > 0
            then 'Similar to events you attended' end,
          case when starts_at <= now() + interval '1 day' then 'Happening soon' end,
          case when confirmed_count >= 5 then 'Popular at your campus' end,
          case when collaborative_affinity > 0 then 'People also enjoyed related events' end,
          case when created_at >= now() - interval '7 days' then 'New on Ruckus' end,
          case when exploration_pick then 'Something different for you' end
        ]::text[], null)
      ) order by recommendation_score desc, starts_at, id)
      from visible_page
    ), '[]'::jsonb),
    'nextCursor', case when (select value from has_more) then (
      select replace(pg_catalog.encode(pg_catalog.convert_to(
        jsonb_build_object(
          'v', 1,
          's', recommendation_score,
          't', starts_at,
          'i', id
        )::text,
        'UTF8'
      ), 'base64'), E'\n', '') from cursor_item
    ) else null end
  ) into result;
  return result;
end;
$$;

create or replace function public.get_event_feed(
  search_text text default null,
  category_filter text default null,
  starts_after timestamptz default null,
  ends_before timestamptz default null,
  cursor_token text default null,
  page_size integer default 20
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select ruckus_private.get_event_feed(
    search_text,
    category_filter,
    starts_after,
    ends_before,
    cursor_token,
    page_size
  );
$$;

revoke execute on function ruckus_private.record_recommendation_interaction(
  uuid, uuid, uuid, public.recommendation_interaction_kind, text, text
) from public, anon, authenticated;
revoke execute on function ruckus_private.capture_event_decision_interaction()
from public, anon, authenticated;
revoke execute on function ruckus_private.capture_event_rsvp_interaction()
from public, anon, authenticated;
revoke execute on function ruckus_private.capture_event_checkin_interaction()
from public, anon, authenticated;
revoke execute on function ruckus_private.initialize_recommendation_flags()
from public, anon, authenticated;

revoke execute on function public.record_event_interaction(
  uuid, public.recommendation_interaction_kind, text
) from public, anon;
revoke execute on function public.record_event_impressions(uuid[], text)
from public, anon;
revoke execute on function public.follow_organization(uuid) from public, anon;
revoke execute on function public.unfollow_organization(uuid) from public, anon;
revoke execute on function public.is_organization_followed(uuid) from public, anon;
revoke execute on function public.refresh_event_collaborative_signals()
from public, anon, authenticated;
revoke execute on function public.cleanup_recommendation_data(integer)
from public, anon, authenticated;
revoke execute on function public.queue_event_embedding_jobs()
from public, anon, authenticated;
revoke execute on function ruckus_private.get_event_feed(
  text, text, timestamptz, timestamptz, text, integer
) from public;
revoke execute on function public.get_event_feed(
  text, text, timestamptz, timestamptz, text, integer
) from public;

grant execute on function public.record_event_interaction(
  uuid, public.recommendation_interaction_kind, text
) to authenticated;
grant execute on function public.record_event_impressions(uuid[], text)
to authenticated;
grant execute on function public.follow_organization(uuid) to authenticated;
grant execute on function public.unfollow_organization(uuid) to authenticated;
grant execute on function public.is_organization_followed(uuid) to authenticated;
grant execute on function public.refresh_event_collaborative_signals() to service_role;
grant execute on function public.cleanup_recommendation_data(integer) to service_role;
grant execute on function public.queue_event_embedding_jobs() to service_role;
grant execute on function ruckus_private.get_event_feed(
  text, text, timestamptz, timestamptz, text, integer
) to anon, authenticated;
grant execute on function public.get_event_feed(
  text, text, timestamptz, timestamptz, text, integer
) to anon, authenticated;

comment on table public.recommendation_interactions is
  'Minimal event interaction stream with no message bodies, report contents, precise locations, or private profile fields; rows expire after 400 days.';
comment on table public.event_collaborative_signals is
  'Aggregate event similarity available only when at least five profiles contribute.';
comment on table public.event_embedding_jobs is
  'Disabled-by-default provider abstraction. No paid provider is activated by this migration.';
