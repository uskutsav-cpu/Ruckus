-- Trusted event operations. Privileged implementations live outside the exposed
-- API schema; public functions are narrow security-invoker adapters.

create or replace function ruckus_private.profile_is_ready(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_profile_id
      and email_domain_verified_at is not null
      and onboarding_completed_at is not null
      and age_attested
      and deletion_requested_at is null
      and banned_at is null
      and (suspended_until is null or suspended_until <= now())
  );
$$;

create or replace function ruckus_private.is_event_host(
  target_event_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_hosts
    where event_id = target_event_id
      and profile_id = target_profile_id
  ) or exists (
    select 1
    from public.events
    where id = target_event_id
      and created_by = target_profile_id
  ) or exists (
    select 1
    from public.events
    join public.organization_members
      on organization_members.organization_id = events.organization_id
    where events.id = target_event_id
      and organization_members.profile_id = target_profile_id
      and organization_members.status = 'active'
      and organization_members.role in ('owner', 'admin', 'event_manager')
  ) or exists (
    select 1 from public.profiles
    where id = target_profile_id and role = 'admin' and banned_at is null
  );
$$;

create or replace function ruckus_private.is_event_moderator(
  target_event_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select ruckus_private.is_event_host(target_event_id, target_profile_id)
  or exists (
    select 1
    from public.events
    join public.organization_members
      on organization_members.organization_id = events.organization_id
    where events.id = target_event_id
      and organization_members.profile_id = target_profile_id
      and organization_members.status = 'active'
      and organization_members.role = 'moderator'
  );
$$;

create or replace function ruckus_private.can_manage_organization(
  target_organization_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and profile_id = target_profile_id
      and status = 'active'
      and role in ('owner', 'admin')
  ) or exists (
    select 1 from public.profiles
    where id = target_profile_id and role = 'admin' and banned_at is null
  );
$$;

create or replace function ruckus_private.can_access_event_chat(
  target_event_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select ruckus_private.is_event_host(target_event_id, target_profile_id)
  or exists (
    select 1
    from public.event_chat_members
    join public.event_rsvps
      on event_rsvps.event_id = event_chat_members.event_id
      and event_rsvps.profile_id = event_chat_members.profile_id
    where event_chat_members.event_id = target_event_id
      and event_chat_members.profile_id = target_profile_id
      and event_chat_members.is_active
      and event_rsvps.status = 'confirmed'
  );
$$;

create or replace function public.is_event_host(target_event_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select ruckus_private.is_event_host(target_event_id, (select auth.uid()));
$$;

create or replace function public.is_event_moderator(target_event_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select ruckus_private.is_event_moderator(target_event_id, (select auth.uid()));
$$;

create or replace function public.can_manage_organization(target_organization_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select ruckus_private.can_manage_organization(
    target_organization_id,
    (select auth.uid())
  );
$$;

create or replace function public.can_access_event_chat(target_event_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select ruckus_private.can_access_event_chat(target_event_id, (select auth.uid()));
$$;

create or replace function ruckus_private.record_rsvp_history(
  target_rsvp_id uuid,
  target_event_id uuid,
  target_profile_id uuid,
  previous_status public.rsvp_status,
  next_status public.rsvp_status,
  transition_reason text,
  transition_actor uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  history_id uuid;
begin
  insert into public.event_rsvp_status_history (
    rsvp_id,
    event_id,
    profile_id,
    from_status,
    to_status,
    reason,
    actor_id
  ) values (
    target_rsvp_id,
    target_event_id,
    target_profile_id,
    previous_status,
    next_status,
    nullif(left(trim(coalesce(transition_reason, '')), 500), ''),
    transition_actor
  )
  returning id into history_id;

  return history_id;
end;
$$;

create or replace function ruckus_private.queue_event_notification(
  target_profile_id uuid,
  target_event_id uuid,
  notification_kind text,
  target_deduplication_key text,
  notification_payload jsonb default '{}'::jsonb,
  target_scheduled_for timestamptz default now()
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notification_jobs (
    profile_id,
    event_id,
    kind,
    deduplication_key,
    payload,
    scheduled_for
  ) values (
    target_profile_id,
    target_event_id,
    left(notification_kind, 80),
    left(target_deduplication_key, 300),
    notification_payload,
    target_scheduled_for
  )
  on conflict (deduplication_key) do nothing;
$$;

create or replace function ruckus_private.join_event(
  target_event_id uuid,
  request_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_profile public.profiles%rowtype;
  event_record public.events%rowtype;
  existing_rsvp public.event_rsvps%rowtype;
  rsvp_record public.event_rsvps%rowtype;
  assigned_status public.rsvp_status;
  assigned_position bigint;
  confirmed_count integer;
  history_id uuid;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  select * into actor_profile from public.profiles where id = actor_id;
  if actor_profile.id is null or not ruckus_private.profile_is_ready(actor_id) then
    raise exception using errcode = '42501', message = 'PROFILE_NOT_ELIGIBLE';
  end if;

  select * into event_record
  from public.events
  where id = target_event_id
  for update;

  if event_record.id is null then
    raise exception using errcode = 'P0002', message = 'EVENT_NOT_FOUND';
  end if;

  if ruckus_private.is_event_host(target_event_id, actor_id) then
    return jsonb_build_object(
      'eventId', target_event_id,
      'status', 'hosting',
      'alreadyJoined', true
    );
  end if;

  if event_record.status <> 'published'
    or event_record.moderation_restricted
    or event_record.ends_at <= now()
  then
    raise exception using errcode = 'P0001', message = 'EVENT_NOT_JOINABLE';
  end if;

  if event_record.visibility = 'private'
    or (
      event_record.visibility = 'campus'
      and event_record.campus_id <> actor_profile.campus_id
    )
  then
    raise exception using errcode = '42501', message = 'EVENT_NOT_ELIGIBLE';
  end if;

  if event_record.min_age > 18 or not actor_profile.age_attested then
    raise exception using errcode = '42501', message = 'AGE_ELIGIBILITY_NOT_VERIFIED';
  end if;

  if exists (
    select 1
    from public.event_hosts
    join public.blocks
      on (
        blocks.blocker_id = actor_id
        and blocks.blocked_id = event_hosts.profile_id
      ) or (
        blocks.blocked_id = actor_id
        and blocks.blocker_id = event_hosts.profile_id
      )
    where event_hosts.event_id = target_event_id
  ) then
    raise exception using errcode = '42501', message = 'EVENT_NOT_ELIGIBLE';
  end if;

  select * into existing_rsvp
  from public.event_rsvps
  where event_id = target_event_id and profile_id = actor_id
  for update;

  if existing_rsvp.id is not null
    and existing_rsvp.status in ('confirmed', 'waitlisted', 'pending')
  then
    return jsonb_build_object(
      'rsvpId', existing_rsvp.id,
      'eventId', target_event_id,
      'status', existing_rsvp.status,
      'waitlistPosition', existing_rsvp.waitlist_position,
      'alreadyJoined', true,
      'chatEnabled', existing_rsvp.status = 'confirmed'
    );
  end if;

  if event_record.approval_required then
    assigned_status := 'pending';
  else
    select count(*) into confirmed_count
    from public.event_rsvps
    where event_id = target_event_id and status = 'confirmed';

    if confirmed_count < event_record.capacity then
      assigned_status := 'confirmed';
    elsif event_record.waitlist_enabled then
      assigned_status := 'waitlisted';
      update public.events
      set waitlist_sequence = waitlist_sequence + 1
      where id = target_event_id
      returning waitlist_sequence into assigned_position;
    else
      raise exception using errcode = 'P0001', message = 'EVENT_AT_CAPACITY';
    end if;
  end if;

  insert into public.event_rsvps (
    event_id,
    profile_id,
    status,
    waitlist_position,
    joined_at,
    responded_at,
    cancelled_at,
    promoted_at,
    status_reason,
    idempotency_key
  ) values (
    target_event_id,
    actor_id,
    assigned_status,
    assigned_position,
    now(),
    case when assigned_status = 'confirmed' then now() else null end,
    null,
    null,
    null,
    request_key
  )
  on conflict (event_id, profile_id) do update
  set status = excluded.status,
      waitlist_position = excluded.waitlist_position,
      joined_at = now(),
      responded_at = excluded.responded_at,
      cancelled_at = null,
      promoted_at = null,
      status_reason = null,
      idempotency_key = excluded.idempotency_key
  where event_rsvps.status in ('cancelled', 'rejected')
  returning * into rsvp_record;

  if rsvp_record.id is null then
    raise exception using errcode = 'P0001', message = 'RSVP_CONFLICT';
  end if;

  history_id := ruckus_private.record_rsvp_history(
    rsvp_record.id,
    target_event_id,
    actor_id,
    case when existing_rsvp.id is null then null else existing_rsvp.status end,
    assigned_status,
    'user_join',
    actor_id
  );

  if assigned_status = 'confirmed' then
    insert into public.event_chat_members (event_id, profile_id, is_active)
    values (target_event_id, actor_id, true)
    on conflict (event_id, profile_id) do update
    set is_active = true, revoked_at = null, joined_at = now();
  elsif existing_rsvp.id is not null then
    update public.event_chat_members
    set is_active = false, revoked_at = now()
    where event_id = target_event_id and profile_id = actor_id and is_active;
  end if;

  perform ruckus_private.queue_event_notification(
    actor_id,
    target_event_id,
    'rsvp_' || assigned_status::text,
    'rsvp:' || history_id::text,
    jsonb_build_object('rsvpId', rsvp_record.id, 'status', assigned_status)
  );

  return jsonb_build_object(
    'rsvpId', rsvp_record.id,
    'eventId', target_event_id,
    'status', assigned_status,
    'waitlistPosition', assigned_position,
    'alreadyJoined', false,
    'chatEnabled', assigned_status = 'confirmed'
  );
end;
$$;

create or replace function ruckus_private.promote_event_waitlist(target_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_record public.events%rowtype;
  candidate public.event_rsvps%rowtype;
  history_id uuid;
  confirmed_count integer;
begin
  select * into event_record
  from public.events where id = target_event_id for update;

  if event_record.id is null
    or event_record.status <> 'published'
    or event_record.ends_at <= now()
  then
    return null;
  end if;

  select count(*) into confirmed_count
  from public.event_rsvps
  where event_id = target_event_id and status = 'confirmed';

  if confirmed_count >= event_record.capacity then
    return null;
  end if;

  select rsvp.* into candidate
  from public.event_rsvps as rsvp
  join public.profiles as profile on profile.id = rsvp.profile_id
  where rsvp.event_id = target_event_id
    and rsvp.status = 'waitlisted'
    and ruckus_private.profile_is_ready(rsvp.profile_id)
    and not exists (
      select 1
      from public.event_hosts
      join public.blocks
        on (
          blocks.blocker_id = rsvp.profile_id
          and blocks.blocked_id = event_hosts.profile_id
        ) or (
          blocks.blocked_id = rsvp.profile_id
          and blocks.blocker_id = event_hosts.profile_id
        )
      where event_hosts.event_id = target_event_id
    )
  order by rsvp.waitlist_position, rsvp.joined_at, rsvp.id
  limit 1
  for update of rsvp skip locked;

  if candidate.id is null then
    return null;
  end if;

  update public.event_rsvps
  set status = 'confirmed',
      waitlist_position = null,
      promoted_at = now(),
      responded_at = now(),
      status_reason = 'waitlist_promoted'
  where id = candidate.id and status = 'waitlisted';

  if not found then
    return null;
  end if;

  history_id := ruckus_private.record_rsvp_history(
    candidate.id,
    target_event_id,
    candidate.profile_id,
    'waitlisted',
    'confirmed',
    'capacity_opened',
    null
  );

  insert into public.event_chat_members (event_id, profile_id, is_active)
  values (target_event_id, candidate.profile_id, true)
  on conflict (event_id, profile_id) do update
  set is_active = true, revoked_at = null, joined_at = now();

  perform ruckus_private.queue_event_notification(
    candidate.profile_id,
    target_event_id,
    'waitlist_promoted',
    'rsvp:' || history_id::text,
    jsonb_build_object('rsvpId', candidate.id, 'status', 'confirmed')
  );

  return candidate.id;
end;
$$;

create or replace function ruckus_private.cancel_event_rsvp(
  target_event_id uuid,
  cancellation_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  rsvp_record public.event_rsvps%rowtype;
  prior_status public.rsvp_status;
  promoted_rsvp_id uuid;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  perform 1 from public.events where id = target_event_id for update;

  select * into rsvp_record
  from public.event_rsvps
  where event_id = target_event_id and profile_id = actor_id
  for update;

  if rsvp_record.id is null then
    raise exception using errcode = 'P0002', message = 'RSVP_NOT_FOUND';
  end if;

  if rsvp_record.status = 'cancelled' then
    return jsonb_build_object(
      'rsvpId', rsvp_record.id,
      'status', 'cancelled',
      'alreadyCancelled', true,
      'promotedRsvpId', null
    );
  end if;

  prior_status := rsvp_record.status;
  update public.event_rsvps
  set status = 'cancelled',
      waitlist_position = null,
      cancelled_at = now(),
      status_reason = nullif(left(trim(coalesce(cancellation_reason, '')), 500), '')
  where id = rsvp_record.id;

  update public.event_chat_members
  set is_active = false, revoked_at = now()
  where event_id = target_event_id and profile_id = actor_id and is_active;

  perform ruckus_private.record_rsvp_history(
    rsvp_record.id,
    target_event_id,
    actor_id,
    prior_status,
    'cancelled',
    cancellation_reason,
    actor_id
  );

  if prior_status = 'confirmed' then
    promoted_rsvp_id := ruckus_private.promote_event_waitlist(target_event_id);
  end if;

  return jsonb_build_object(
    'rsvpId', rsvp_record.id,
    'status', 'cancelled',
    'alreadyCancelled', false,
    'promotedRsvpId', promoted_rsvp_id
  );
end;
$$;

create or replace function ruckus_private.review_event_rsvp(
  target_rsvp_id uuid,
  approve boolean,
  review_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  rsvp_record public.event_rsvps%rowtype;
  event_record public.events%rowtype;
  next_status public.rsvp_status;
  assigned_position bigint;
  confirmed_count integer;
  history_id uuid;
begin
  select * into rsvp_record
  from public.event_rsvps where id = target_rsvp_id;

  if rsvp_record.id is null then
    raise exception using errcode = 'P0002', message = 'RSVP_NOT_FOUND';
  end if;

  select * into event_record
  from public.events where id = rsvp_record.event_id for update;

  select * into rsvp_record
  from public.event_rsvps where id = target_rsvp_id for update;

  if not ruckus_private.is_event_host(rsvp_record.event_id, actor_id) then
    raise exception using errcode = '42501', message = 'EVENT_HOST_REQUIRED';
  end if;

  if rsvp_record.status <> 'pending' then
    return jsonb_build_object(
      'rsvpId', rsvp_record.id,
      'status', rsvp_record.status,
      'alreadyReviewed', true
    );
  end if;

  if not approve then
    next_status := 'rejected';
  else
    select count(*) into confirmed_count
    from public.event_rsvps
    where event_id = event_record.id and status = 'confirmed';

    if confirmed_count < event_record.capacity then
      next_status := 'confirmed';
    elsif event_record.waitlist_enabled then
      next_status := 'waitlisted';
      update public.events
      set waitlist_sequence = waitlist_sequence + 1
      where id = event_record.id
      returning waitlist_sequence into assigned_position;
    else
      next_status := 'rejected';
    end if;
  end if;

  update public.event_rsvps
  set status = next_status,
      waitlist_position = assigned_position,
      responded_at = now(),
      status_reason = nullif(left(trim(coalesce(review_reason, '')), 500), '')
  where id = rsvp_record.id;

  history_id := ruckus_private.record_rsvp_history(
    rsvp_record.id,
    rsvp_record.event_id,
    rsvp_record.profile_id,
    'pending',
    next_status,
    review_reason,
    actor_id
  );

  if next_status = 'confirmed' then
    insert into public.event_chat_members (event_id, profile_id, is_active)
    values (rsvp_record.event_id, rsvp_record.profile_id, true)
    on conflict (event_id, profile_id) do update
    set is_active = true, revoked_at = null, joined_at = now();
  end if;

  perform ruckus_private.queue_event_notification(
    rsvp_record.profile_id,
    rsvp_record.event_id,
    'rsvp_' || next_status::text,
    'rsvp:' || history_id::text,
    jsonb_build_object('rsvpId', rsvp_record.id, 'status', next_status)
  );

  return jsonb_build_object(
    'rsvpId', rsvp_record.id,
    'status', next_status,
    'waitlistPosition', assigned_position,
    'alreadyReviewed', false
  );
end;
$$;

create or replace function ruckus_private.publish_event(target_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  event_record public.events%rowtype;
begin
  select * into event_record
  from public.events where id = target_event_id for update;

  if event_record.id is null then
    raise exception using errcode = 'P0002', message = 'EVENT_NOT_FOUND';
  end if;

  if not ruckus_private.is_event_host(target_event_id, actor_id) then
    raise exception using errcode = '42501', message = 'EVENT_HOST_REQUIRED';
  end if;

  if event_record.status not in ('draft', 'archived')
    or event_record.starts_at <= now()
    or event_record.min_age <> 18
    or not exists (
      select 1 from public.legal_acceptances
      where profile_id = actor_id and document_type = 'terms'
    )
    or not exists (
      select 1 from public.legal_acceptances
      where profile_id = actor_id and document_type = 'community_guidelines'
    )
  then
    raise exception using errcode = 'P0001', message = 'EVENT_PUBLISH_REQUIREMENTS_NOT_MET';
  end if;

  update public.events
  set status = 'published', published_at = now(), archived_at = null
  where id = target_event_id;
end;
$$;

create or replace function ruckus_private.cancel_event(
  target_event_id uuid,
  cancellation_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  event_record public.events%rowtype;
  affected_count integer;
begin
  select * into event_record
  from public.events where id = target_event_id for update;

  if event_record.id is null then
    raise exception using errcode = 'P0002', message = 'EVENT_NOT_FOUND';
  end if;

  if not ruckus_private.is_event_host(target_event_id, actor_id) then
    raise exception using errcode = '42501', message = 'EVENT_HOST_REQUIRED';
  end if;

  if event_record.status = 'cancelled' then
    return 0;
  end if;

  if event_record.status not in ('draft', 'published') then
    raise exception using errcode = 'P0001', message = 'EVENT_CANCELLATION_NOT_ALLOWED';
  end if;

  update public.events
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = nullif(left(trim(coalesce(cancellation_reason, '')), 1000), '')
  where id = target_event_id;

  update public.event_chat_members
  set is_active = false, revoked_at = now()
  where event_id = target_event_id and is_active;

  update public.notification_jobs
  set status = 'cancelled'
  where event_id = target_event_id and status = 'pending';

  insert into public.notification_jobs (
    profile_id,
    event_id,
    kind,
    deduplication_key,
    payload
  )
  select
    profile_id,
    target_event_id,
    'event_cancelled',
    'event-cancelled:' || target_event_id::text || ':' || profile_id::text,
    jsonb_build_object('reason', left(coalesce(cancellation_reason, ''), 500))
  from public.event_rsvps
  where event_id = target_event_id
    and status in ('confirmed', 'waitlisted', 'pending')
  on conflict (deduplication_key) do nothing;

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

create or replace function public.join_event(
  target_event_id uuid,
  request_key uuid default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.join_event(target_event_id, request_key);
$$;

create or replace function public.cancel_event_rsvp(
  target_event_id uuid,
  cancellation_reason text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.cancel_event_rsvp(target_event_id, cancellation_reason);
$$;

create or replace function public.review_event_rsvp(
  target_rsvp_id uuid,
  approve boolean,
  review_reason text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.review_event_rsvp(target_rsvp_id, approve, review_reason);
$$;

create or replace function public.publish_event(target_event_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.publish_event(target_event_id);
$$;

create or replace function public.cancel_event(
  target_event_id uuid,
  cancellation_reason text
)
returns integer
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.cancel_event(target_event_id, cancellation_reason);
$$;

create or replace function ruckus_private.create_event_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_count integer;
begin
  if new.created_by is distinct from (select auth.uid())
    or new.status <> 'draft'
    or not ruckus_private.profile_is_ready(new.created_by)
  then
    raise exception using errcode = '42501', message = 'EVENT_CREATION_NOT_ALLOWED';
  end if;

  if new.organization_id is null then
    if not exists (
      select 1 from public.profiles
      where id = new.created_by and (role in ('host', 'admin') or trust_level >= 1)
    ) then
      raise exception using errcode = '42501', message = 'EVENT_CREATION_NOT_ALLOWED';
    end if;
  elsif not exists (
    select 1 from public.organization_members
    where organization_id = new.organization_id
      and profile_id = new.created_by
      and status = 'active'
      and role in ('owner', 'admin', 'event_manager')
  ) then
    raise exception using errcode = '42501', message = 'ORGANIZATION_EVENT_ACCESS_DENIED';
  end if;

  select count(*) into recent_count
  from public.events
  where created_by = new.created_by
    and created_at >= now() - interval '1 hour';

  if recent_count >= 10 then
    raise exception using errcode = 'P0001', message = 'EVENT_CREATION_RATE_LIMITED';
  end if;

  return new;
end;
$$;

create trigger validate_event_creation
before insert on public.events
for each row execute function ruckus_private.create_event_owner();

create or replace function ruckus_private.attach_event_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.event_hosts (event_id, profile_id, role, added_by)
  values (new.id, new.created_by, 'owner', new.created_by);
  return new;
end;
$$;

create trigger attach_event_owner
after insert on public.events
for each row execute function ruckus_private.attach_event_owner();

create or replace function ruckus_private.create_organization_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_count integer;
begin
  if new.created_by is distinct from (select auth.uid())
    or not ruckus_private.profile_is_ready(new.created_by)
  then
    raise exception using errcode = '42501', message = 'ORGANIZATION_CREATION_NOT_ALLOWED';
  end if;

  select count(*) into recent_count
  from public.organizations
  where created_by = new.created_by
    and created_at >= now() - interval '1 day';

  if recent_count >= 3 then
    raise exception using errcode = 'P0001', message = 'ORGANIZATION_CREATION_RATE_LIMITED';
  end if;

  return new;
end;
$$;

create trigger validate_organization_creation
before insert on public.organizations
for each row execute function ruckus_private.create_organization_owner();

create or replace function ruckus_private.attach_organization_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organization_members (
    organization_id,
    profile_id,
    role,
    status,
    invited_by,
    accepted_at
  ) values (
    new.id,
    new.created_by,
    'owner',
    'active',
    new.created_by,
    now()
  );

  insert into public.organization_audit_log (
    organization_id,
    actor_id,
    action,
    target_profile_id
  ) values (new.id, new.created_by, 'organization_created', new.created_by);

  return new;
end;
$$;

create trigger attach_organization_owner
after insert on public.organizations
for each row execute function ruckus_private.attach_organization_owner();

create or replace function ruckus_private.enforce_event_message_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_record public.events%rowtype;
  recent_count integer;
begin
  if new.kind = 'system' then
    if (select auth.uid()) is not null then
      raise exception using errcode = '42501', message = 'SYSTEM_MESSAGE_FORBIDDEN';
    end if;
    return new;
  end if;

  if new.sender_id is distinct from (select auth.uid())
    or not ruckus_private.can_access_event_chat(new.event_id, new.sender_id)
  then
    raise exception using errcode = '42501', message = 'EVENT_CHAT_ACCESS_DENIED';
  end if;

  select * into event_record from public.events where id = new.event_id;
  if event_record.status in ('cancelled', 'completed', 'archived', 'removed')
    or event_record.ends_at <= now()
  then
    raise exception using errcode = 'P0001', message = 'EVENT_CHAT_READ_ONLY';
  end if;

  if new.kind = 'announcement'
    and not ruckus_private.is_event_host(new.event_id, new.sender_id)
  then
    raise exception using errcode = '42501', message = 'EVENT_HOST_REQUIRED';
  end if;

  if new.reply_to_id is not null and not exists (
    select 1 from public.event_messages
    where id = new.reply_to_id and event_id = new.event_id
  ) then
    raise exception using errcode = '22023', message = 'INVALID_MESSAGE_REPLY';
  end if;

  select count(*) into recent_count
  from public.event_messages
  where sender_id = new.sender_id
    and created_at >= now() - interval '1 minute';

  if recent_count >= 20 then
    raise exception using errcode = 'P0001', message = 'MESSAGE_RATE_LIMITED';
  end if;

  return new;
end;
$$;

create trigger enforce_event_message_rules
before insert on public.event_messages
for each row execute function ruckus_private.enforce_event_message_rules();

create or replace function ruckus_private.create_event_checkin_token_digest(
  target_event_id uuid,
  target_digest text,
  ttl_seconds integer default 60
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  token_id uuid;
begin
  if not ruckus_private.is_event_host(target_event_id, actor_id)
    or ttl_seconds not between 15 and 900
    or target_digest !~ '^[0-9a-f]{64}$'
  then
    raise exception using errcode = '42501', message = 'CHECKIN_TOKEN_NOT_ALLOWED';
  end if;

  update public.event_checkin_tokens
  set revoked_at = now()
  where event_id = target_event_id and revoked_at is null;

  insert into public.event_checkin_tokens (
    event_id,
    created_by,
    token_digest,
    valid_from,
    expires_at
  ) values (
    target_event_id,
    actor_id,
    target_digest,
    now(),
    now() + make_interval(secs => ttl_seconds)
  ) returning id into token_id;

  return token_id;
end;
$$;

create or replace function ruckus_private.redeem_event_checkin_token_digest(target_digest text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  token_record public.event_checkin_tokens%rowtype;
  event_record public.events%rowtype;
  checkin_record public.event_checkins%rowtype;
  actor_campus_id uuid;
begin
  select * into token_record
  from public.event_checkin_tokens
  where token_digest = target_digest
    and revoked_at is null
    and valid_from <= now()
    and expires_at >= now()
  for update;

  if token_record.id is null then
    raise exception using errcode = 'P0001', message = 'CHECKIN_TOKEN_INVALID';
  end if;

  select * into event_record from public.events where id = token_record.event_id;
  if event_record.checkin_opens_at is null
    or now() not between event_record.checkin_opens_at and event_record.checkin_closes_at
    or not exists (
      select 1 from public.event_rsvps
      where event_id = event_record.id
        and profile_id = actor_id
        and status = 'confirmed'
    )
  then
    raise exception using errcode = '42501', message = 'CHECKIN_NOT_ALLOWED';
  end if;

  insert into public.event_checkins (event_id, profile_id, checkin_token_id)
  values (event_record.id, actor_id, token_record.id)
  on conflict (event_id, profile_id) do nothing
  returning * into checkin_record;

  if checkin_record.id is null then
    select * into checkin_record from public.event_checkins
    where event_id = event_record.id and profile_id = actor_id;
    return jsonb_build_object(
      'eventId', event_record.id,
      'verifiedAt', checkin_record.verified_at,
      'alreadyCheckedIn', true
    );
  end if;

  select campus_id into actor_campus_id from public.profiles where id = actor_id;
  insert into public.xp_ledger (
    profile_id,
    campus_id,
    amount,
    reason,
    source_type,
    source_id
  ) values (
    actor_id,
    actor_campus_id,
    50,
    'verified_event_checkin',
    'event',
    event_record.id
  ) on conflict (profile_id, reason, source_type, source_id) do nothing;

  return jsonb_build_object(
    'eventId', event_record.id,
    'verifiedAt', checkin_record.verified_at,
    'alreadyCheckedIn', false
  );
end;
$$;

create or replace function public.create_event_checkin_token_digest(
  target_event_id uuid,
  target_digest text,
  ttl_seconds integer default 60
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.create_event_checkin_token_digest(
    target_event_id,
    target_digest,
    ttl_seconds
  );
$$;

create or replace function public.redeem_event_checkin_token_digest(target_digest text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.redeem_event_checkin_token_digest(target_digest);
$$;

-- The public leaderboard now honors explicit opt-out while preserving stable ties.
create or replace function public.get_leaderboard(period text default 'week')
returns table (
  profile_id uuid,
  display_name text,
  avatar_path text,
  xp bigint,
  rank bigint,
  is_current_user boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (
    select id, campus_id
    from public.profiles
    where id = (select auth.uid())
      and deletion_requested_at is null
      and banned_at is null
  ),
  totals as (
    select ledger.profile_id, sum(ledger.amount)::bigint as xp
    from public.xp_ledger as ledger
    join viewer on viewer.campus_id = ledger.campus_id
    where case period
      when 'week' then ledger.created_at >= date_trunc('week', now())
      when 'month' then ledger.created_at >= date_trunc('month', now())
      when 'all' then true
      else false
    end
    group by ledger.profile_id
  ),
  ranked as (
    select
      totals.profile_id,
      profile.display_name,
      profile.avatar_path,
      totals.xp,
      dense_rank() over (order by totals.xp desc) as rank
    from totals
    join public.profiles as profile on profile.id = totals.profile_id
    join public.profile_preferences as preferences on preferences.profile_id = profile.id
    join viewer on true
    where profile.onboarding_completed_at is not null
      and profile.deletion_requested_at is null
      and profile.banned_at is null
      and preferences.leaderboard_visible
      and not public.is_blocked_between(viewer.id, profile.id)
  )
  select
    ranked.profile_id,
    ranked.display_name,
    ranked.avatar_path,
    ranked.xp,
    ranked.rank,
    ranked.profile_id = (select auth.uid())
  from ranked
  where ranked.rank <= 100 or ranked.profile_id = (select auth.uid())
  order by ranked.rank, ranked.profile_id;
$$;

-- New profiles receive private-by-default preferences.
create or replace function ruckus_private.attach_profile_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile_preferences (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

create trigger attach_profile_preferences
after insert on public.profiles
for each row execute function ruckus_private.attach_profile_preferences();

insert into public.profile_preferences (profile_id)
select id from public.profiles
on conflict (profile_id) do nothing;

insert into public.badge_definitions (id, name, description, icon)
values
  ('first_checkin', 'First check-in', 'Verified attendance at a first Ruckus event.', 'sparkles'),
  ('campus_explorer', 'Campus explorer', 'Verified attendance across several event categories.', 'map'),
  ('trusted_host', 'Trusted host', 'Hosted completed events with verified attendance.', 'megaphone')
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    is_active = true;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profile_preferences',
    'organizations',
    'organization_members',
    'organization_verification_requests',
    'events',
    'event_hosts',
    'event_media',
    'event_discovery_decisions',
    'event_rsvps',
    'event_chat_members',
    'event_messages',
    'event_announcements',
    'notification_jobs',
    'referrals',
    'data_export_requests',
    'partnership_leads',
    'moderation_cases'
  ]
  loop
    execute format(
      'create trigger set_%I_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

comment on function public.join_event(uuid, uuid) is
  'Concurrency-safe, idempotent RSVP assignment. No participation XP is awarded.';
comment on function public.cancel_event_rsvp(uuid, text) is
  'Revokes chat access and promotes at most one eligible waitlisted attendee under event lock.';
