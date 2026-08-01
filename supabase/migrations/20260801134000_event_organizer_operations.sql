-- Organizer read models and trusted moderation/announcement operations.

create or replace function ruckus_private.get_event_attendees(target_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  result jsonb;
begin
  if not ruckus_private.is_event_host(target_event_id, actor_id) then
    raise exception using errcode = '42501', message = 'EVENT_HOST_REQUIRED';
  end if;

  select jsonb_build_object(
    'attendees', coalesce(jsonb_agg(
      jsonb_build_object(
        'rsvpId', rsvp.id,
        'profileId', rsvp.profile_id,
        'displayName', coalesce(profile.display_name, 'Ruckus member'),
        'avatarPath', profile.avatar_path,
        'status', rsvp.status,
        'waitlistPosition', rsvp.waitlist_position,
        'joinedAt', rsvp.joined_at,
        'checkedInAt', checkin.verified_at
      ) order by
        case rsvp.status
          when 'pending' then 1
          when 'confirmed' then 2
          when 'waitlisted' then 3
          else 4
        end,
        rsvp.waitlist_position nulls first,
        rsvp.joined_at,
        rsvp.id
    ), '[]'::jsonb),
    'counts', jsonb_build_object(
      'confirmed', count(*) filter (where rsvp.status = 'confirmed'),
      'pending', count(*) filter (where rsvp.status = 'pending'),
      'waitlisted', count(*) filter (where rsvp.status = 'waitlisted'),
      'checkedIn', count(checkin.id)
    )
  ) into result
  from public.event_rsvps as rsvp
  join public.profiles as profile on profile.id = rsvp.profile_id
  left join public.event_checkins as checkin
    on checkin.event_id = rsvp.event_id and checkin.profile_id = rsvp.profile_id
  where rsvp.event_id = target_event_id
    and rsvp.status in ('confirmed', 'pending', 'waitlisted');

  return result;
end;
$$;

create or replace function public.get_event_attendees(target_event_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select ruckus_private.get_event_attendees(target_event_id);
$$;

create or replace function ruckus_private.create_event_announcement(
  target_event_id uuid,
  announcement_title text,
  announcement_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  event_record public.events%rowtype;
  announcement_id uuid;
begin
  select * into event_record
  from public.events where id = target_event_id for update;

  if not ruckus_private.is_event_host(target_event_id, actor_id) then
    raise exception using errcode = '42501', message = 'EVENT_HOST_REQUIRED';
  end if;

  if event_record.status <> 'published' or event_record.ends_at <= now() then
    raise exception using errcode = 'P0001', message = 'ANNOUNCEMENT_NOT_ALLOWED';
  end if;

  insert into public.event_announcements (event_id, author_id, title, body, sent_at)
  values (
    target_event_id,
    actor_id,
    trim(announcement_title),
    trim(announcement_body),
    now()
  ) returning id into announcement_id;

  insert into public.event_messages (event_id, sender_id, kind, body)
  values (
    target_event_id,
    actor_id,
    'announcement',
    trim(announcement_title) || E'\n' || trim(announcement_body)
  );

  insert into public.notification_jobs (
    profile_id,
    event_id,
    kind,
    deduplication_key,
    payload
  )
  select
    rsvp.profile_id,
    target_event_id,
    'event_announcement',
    'announcement:' || announcement_id::text || ':' || rsvp.profile_id::text,
    jsonb_build_object(
      'announcementId', announcement_id,
      'title', left(trim(announcement_title), 120)
    )
  from public.event_rsvps as rsvp
  join public.profile_preferences as preferences on preferences.profile_id = rsvp.profile_id
  where rsvp.event_id = target_event_id
    and rsvp.status = 'confirmed'
    and rsvp.profile_id <> actor_id
    and preferences.announcement_notifications
  on conflict (deduplication_key) do nothing;

  return announcement_id;
end;
$$;

create or replace function public.create_event_announcement(
  target_event_id uuid,
  announcement_title text,
  announcement_body text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.create_event_announcement(
    target_event_id,
    announcement_title,
    announcement_body
  );
$$;

create or replace function ruckus_private.archive_event(target_event_id uuid)
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
  if event_record.status not in ('draft', 'cancelled', 'completed') then
    raise exception using errcode = 'P0001', message = 'EVENT_ARCHIVE_NOT_ALLOWED';
  end if;

  update public.events
  set status = 'archived', archived_at = now()
  where id = target_event_id;
end;
$$;

create or replace function public.archive_event(target_event_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.archive_event(target_event_id);
$$;

create or replace function ruckus_private.report_event_or_organization(
  target_event_id uuid,
  target_organization_id uuid,
  report_reason text,
  report_details text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  report_id uuid;
  recent_count integer;
begin
  if actor_id is null or num_nonnulls(target_event_id, target_organization_id) <> 1 then
    raise exception using errcode = '22023', message = 'INVALID_REPORT_TARGET';
  end if;

  if char_length(trim(report_reason)) not between 3 and 100
    or char_length(coalesce(report_details, '')) > 2000
  then
    raise exception using errcode = '22023', message = 'INVALID_REPORT_DETAILS';
  end if;

  if target_event_id is not null and not exists (
    select 1 from public.events
    where id = target_event_id
      and (
        status = 'published'
        or ruckus_private.is_event_host(id, actor_id)
        or exists (
          select 1 from public.event_rsvps
          where event_id = events.id and profile_id = actor_id
        )
      )
  ) then
    raise exception using errcode = '42501', message = 'REPORT_TARGET_UNAVAILABLE';
  end if;

  if target_organization_id is not null and not exists (
    select 1 from public.organizations where id = target_organization_id
  ) then
    raise exception using errcode = 'P0002', message = 'ORGANIZATION_NOT_FOUND';
  end if;

  select count(*) into recent_count
  from public.reports
  where reporter_id = actor_id and created_at >= now() - interval '1 hour';
  if recent_count >= 10 then
    raise exception using errcode = 'P0001', message = 'REPORT_RATE_LIMITED';
  end if;

  insert into public.reports (
    reporter_id,
    target_type,
    target_event_id,
    target_organization_id,
    reason,
    details
  ) values (
    actor_id,
    case when target_event_id is not null then 'event'::public.report_target
      else 'organization'::public.report_target end,
    target_event_id,
    target_organization_id,
    trim(report_reason),
    nullif(trim(coalesce(report_details, '')), '')
  ) returning id into report_id;

  return report_id;
end;
$$;

create or replace function public.report_event(
  target_event_id uuid,
  report_reason text,
  report_details text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.report_event_or_organization(
    target_event_id,
    null,
    report_reason,
    report_details
  );
$$;

create or replace function public.report_organization(
  target_organization_id uuid,
  report_reason text,
  report_details text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.report_event_or_organization(
    null,
    target_organization_id,
    report_reason,
    report_details
  );
$$;

grant execute on function ruckus_private.get_event_attendees(uuid) to authenticated;
grant execute on function ruckus_private.create_event_announcement(uuid, text, text)
to authenticated;
grant execute on function ruckus_private.archive_event(uuid) to authenticated;
grant execute on function ruckus_private.report_event_or_organization(uuid, uuid, text, text)
to authenticated;
grant execute on function public.get_event_attendees(uuid) to authenticated;
grant execute on function public.create_event_announcement(uuid, text, text) to authenticated;
grant execute on function public.archive_event(uuid) to authenticated;
grant execute on function public.report_event(uuid, text, text) to authenticated;
grant execute on function public.report_organization(uuid, text, text) to authenticated;
