-- Privacy-safe read models for discovery, event details, and paginated chat.

create or replace function ruckus_private.get_event_feed(
  search_text text default null,
  category_filter text default null,
  starts_after timestamptz default null,
  ends_before timestamptz default null,
  cursor_score integer default null,
  cursor_starts_at timestamptz default null,
  cursor_id uuid default null,
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
  end if;

  with scored as (
    select
      event.id,
      event.slug,
      event.title,
      event.description,
      event.category,
      event.cover_image_path,
      event.campus_id,
      campus.name as campus_name,
      event.organization_id,
      organization.name as organization_name,
      coalesce(organization.is_verified, false) as organization_verified,
      event.starts_at,
      event.ends_at,
      event.timezone,
      event.venue_name,
      event.location_description,
      event.capacity,
      event.waitlist_enabled,
      event.approval_required,
      event.visibility,
      event.accessibility_information,
      event.cost_information,
      event.cancellation_policy,
      count(rsvp.id) filter (where rsvp.status = 'confirmed')::integer as confirmed_count,
      (
        case when actor_id is not null and exists (
          select 1
          from public.profile_interests
          join public.interests on interests.id = profile_interests.interest_id
          where profile_interests.profile_id = actor_id
            and lower(interests.name) = lower(event.category)
        ) then 30 else 0 end
        + case when coalesce(organization.is_verified, false) then 10 else 0 end
        + case when event.starts_at <= now() + interval '7 days' then 8 else 0 end
        + least(
            count(rsvp.id) filter (where rsvp.status = 'confirmed')::integer,
            20
          )
        + case when count(rsvp.id) filter (where rsvp.status = 'confirmed') < event.capacity
          then 5 else 0 end
      )::integer as recommendation_score
    from public.events as event
    join public.campuses as campus on campus.id = event.campus_id
    left join public.organizations as organization on organization.id = event.organization_id
    left join public.event_rsvps as rsvp on rsvp.event_id = event.id
    where event.status = 'published'
      and not event.moderation_restricted
      and event.ends_at > now()
      and (
        (actor_id is null and event.visibility = 'public')
        or (
          actor_id is not null
          and event.visibility in ('public', 'campus')
          and (event.visibility = 'public' or event.campus_id = actor_campus_id)
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
          select 1 from public.event_rsvps as own_rsvp
          where own_rsvp.event_id = event.id
            and own_rsvp.profile_id = actor_id
            and own_rsvp.status = 'confirmed'
        )
      )
      and (
        actor_id is null
        or not exists (
          select 1 from public.event_discovery_decisions as decision
          where decision.event_id = event.id
            and decision.profile_id = actor_id
            and decision.decision = 'passed'
        )
      )
      and not exists (
        select 1
        from public.event_hosts
        join public.blocks
          on actor_id is not null
          and (
            (blocks.blocker_id = actor_id and blocks.blocked_id = event_hosts.profile_id)
            or (blocks.blocked_id = actor_id and blocks.blocker_id = event_hosts.profile_id)
          )
        where event_hosts.event_id = event.id
      )
    group by event.id, campus.name, organization.id
  ), page as (
    select *
    from scored
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
  ), next_item as (
    select * from page
    order by recommendation_score desc, starts_at, id
    offset safe_page_size limit 1
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
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
          'recommendationScore', recommendation_score
        ) order by recommendation_score desc, starts_at, id
      ) from visible_page
    ), '[]'::jsonb),
    'nextCursor', (
      select jsonb_build_object(
        'score', recommendation_score,
        'startsAt', starts_at,
        'id', id
      ) from next_item
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.get_event_feed(
  search_text text default null,
  category_filter text default null,
  starts_after timestamptz default null,
  ends_before timestamptz default null,
  cursor_score integer default null,
  cursor_starts_at timestamptz default null,
  cursor_id uuid default null,
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
    cursor_score,
    cursor_starts_at,
    cursor_id,
    page_size
  );
$$;

create or replace function ruckus_private.get_event_detail(target_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  event_record public.events%rowtype;
  actor_campus_id uuid;
  host_access boolean;
  own_rsvp public.event_rsvps%rowtype;
  confirmed_count integer;
begin
  select * into event_record from public.events where id = target_event_id;
  if event_record.id is null then
    raise exception using errcode = 'P0002', message = 'EVENT_NOT_FOUND';
  end if;

  host_access := actor_id is not null
    and ruckus_private.is_event_host(target_event_id, actor_id);

  if actor_id is not null then
    select campus_id into actor_campus_id from public.profiles where id = actor_id;
    select * into own_rsvp from public.event_rsvps
    where event_id = target_event_id and profile_id = actor_id;
  end if;

  if not host_access and not (
    event_record.status in ('published', 'cancelled', 'completed')
    and not event_record.moderation_restricted
    and (
      event_record.visibility = 'public'
      or (
        actor_id is not null
        and event_record.visibility = 'campus'
        and event_record.campus_id = actor_campus_id
      )
      or own_rsvp.id is not null
    )
  ) then
    raise exception using errcode = '42501', message = 'EVENT_ACCESS_DENIED';
  end if;

  select count(*) into confirmed_count from public.event_rsvps
  where event_id = target_event_id and status = 'confirmed';

  return (
    select jsonb_build_object(
      'id', event_record.id,
      'slug', event_record.slug,
      'title', event_record.title,
      'description', event_record.description,
      'category', event_record.category,
      'coverImagePath', event_record.cover_image_path,
      'campusId', event_record.campus_id,
      'campusName', campus.name,
      'organizationId', event_record.organization_id,
      'organizationName', organization.name,
      'organizationVerified', coalesce(organization.is_verified, false),
      'startsAt', event_record.starts_at,
      'endsAt', event_record.ends_at,
      'timezone', event_record.timezone,
      'venueName', event_record.venue_name,
      'locationDescription', event_record.location_description,
      'coordinates', case
        when event_record.latitude is not null
          and (
            not event_record.reveal_coordinates_after_confirmation
            or host_access
            or own_rsvp.status = 'confirmed'
          )
        then jsonb_build_object(
          'latitude', event_record.latitude,
          'longitude', event_record.longitude
        )
        else null
      end,
      'capacity', event_record.capacity,
      'confirmedCount', confirmed_count,
      'waitlistEnabled', event_record.waitlist_enabled,
      'approvalRequired', event_record.approval_required,
      'visibility', event_record.visibility,
      'minAge', event_record.min_age,
      'eligibilityRequirements', event_record.eligibility_requirements,
      'accessibilityInformation', event_record.accessibility_information,
      'costInformation', event_record.cost_information,
      'cancellationPolicy', event_record.cancellation_policy,
      'safetyRules', event_record.safety_rules,
      'status', event_record.status,
      'cancellationReason', event_record.cancellation_reason,
      'ownRsvp', case when own_rsvp.id is null then null else jsonb_build_object(
        'id', own_rsvp.id,
        'status', own_rsvp.status,
        'waitlistPosition', own_rsvp.waitlist_position,
        'joinedAt', own_rsvp.joined_at
      ) end,
      'isHost', host_access,
      'chatEnabled', host_access or own_rsvp.status = 'confirmed'
    )
    from public.campuses as campus
    left join public.organizations as organization on organization.id = event_record.organization_id
    where campus.id = event_record.campus_id
  );
end;
$$;

create or replace function public.get_event_detail(target_event_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select ruckus_private.get_event_detail(target_event_id);
$$;

create or replace function ruckus_private.get_event_messages(
  target_event_id uuid,
  before_created_at timestamptz default null,
  before_id uuid default null,
  page_size integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  safe_page_size integer := greatest(1, least(coalesce(page_size, 30), 100));
  result jsonb;
begin
  if not ruckus_private.can_access_event_chat(target_event_id, actor_id) then
    raise exception using errcode = '42501', message = 'EVENT_CHAT_ACCESS_DENIED';
  end if;

  with page as (
    select
      message.id,
      message.event_id,
      message.sender_id,
      message.kind,
      case when message.removed_at is null then message.body else 'Message removed' end as body,
      message.reply_to_id,
      message.client_id,
      message.removed_at,
      message.created_at,
      case
        when message.sender_id is null then 'Ruckus'
        when sender.deletion_requested_at is not null then 'Deleted user'
        else sender.display_name
      end as sender_name,
      case
        when message.sender_id is null or sender.deletion_requested_at is not null then null
        else sender.avatar_path
      end as sender_avatar_path
    from public.event_messages as message
    left join public.profiles as sender on sender.id = message.sender_id
    where message.event_id = target_event_id
      and (
        message.sender_id is null
        or not public.is_blocked_between(actor_id, message.sender_id)
      )
      and (
        before_created_at is null
        or (message.created_at, message.id) < (before_created_at, before_id)
      )
    order by message.created_at desc, message.id desc
    limit safe_page_size
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'eventId', event_id,
      'senderId', sender_id,
      'senderName', sender_name,
      'senderAvatarPath', sender_avatar_path,
      'kind', kind,
      'body', body,
      'replyToId', reply_to_id,
      'clientId', client_id,
      'removedAt', removed_at,
      'createdAt', created_at
    ) order by created_at desc, id desc
  ), '[]'::jsonb) into result from page;

  return result;
end;
$$;

create or replace function public.get_event_messages(
  target_event_id uuid,
  before_created_at timestamptz default null,
  before_id uuid default null,
  page_size integer default 30
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select ruckus_private.get_event_messages(
    target_event_id,
    before_created_at,
    before_id,
    page_size
  );
$$;

create or replace view public.public_event_pages
with (security_invoker = true)
as
select
  event.id,
  event.slug,
  event.title,
  event.description,
  event.category,
  event.cover_image_path,
  event.campus_id,
  campus.name as campus_name,
  event.organization_id,
  organization.name as organization_name,
  coalesce(organization.is_verified, false) as organization_verified,
  event.starts_at,
  event.ends_at,
  event.timezone,
  event.venue_name,
  event.location_description,
  event.capacity,
  event.waitlist_enabled,
  event.approval_required,
  event.accessibility_information,
  event.cost_information,
  event.cancellation_policy,
  event.status,
  event.cancellation_reason
from public.events as event
join public.campuses as campus on campus.id = event.campus_id
left join public.organizations as organization on organization.id = event.organization_id
where event.visibility = 'public'
  and event.status in ('published', 'cancelled', 'completed')
  and not event.moderation_restricted;

create or replace view public.public_organization_profiles
with (security_invoker = true)
as
select
  organization.id,
  organization.slug,
  organization.name,
  organization.description,
  organization.logo_path,
  organization.banner_path,
  organization.website_url,
  organization.social_links,
  organization.is_verified,
  organization.campus_id,
  campus.name as campus_name
from public.organizations as organization
join public.campuses as campus on campus.id = organization.campus_id
where not organization.is_restricted;
