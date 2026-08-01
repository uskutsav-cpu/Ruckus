-- Host-authorized event duplication creates a clean draft without attendance or chat.

create or replace function ruckus_private.duplicate_event(target_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  source public.events%rowtype;
  duplicate_id uuid := extensions.gen_random_uuid();
  duplicate_start timestamptz;
begin
  select * into source from public.events where id = target_event_id;
  if source.id is null then
    raise exception using errcode = 'P0002', message = 'EVENT_NOT_FOUND';
  end if;
  if not ruckus_private.is_event_host(target_event_id, actor_id) then
    raise exception using errcode = '42501', message = 'EVENT_HOST_REQUIRED';
  end if;

  duplicate_start := greatest(source.starts_at + interval '7 days', now() + interval '1 day');
  insert into public.events (
    id, campus_id, organization_id, created_by, slug, title, description, category,
    cover_image_path, starts_at, ends_at, timezone, venue_name, location_description,
    latitude, longitude, reveal_coordinates_after_confirmation, capacity,
    waitlist_enabled, approval_required, visibility, min_age,
    eligibility_requirements, accessibility_information, cost_information,
    cancellation_policy, safety_rules, attendee_list_visible, status
  ) values (
    duplicate_id, source.campus_id, source.organization_id, actor_id,
    left(regexp_replace(source.slug, '-[0-9a-f]{8}$', ''), 80) || '-' || left(duplicate_id::text, 8),
    left(source.title || ' copy', 120), source.description, source.category,
    source.cover_image_path, duplicate_start,
    duplicate_start + (source.ends_at - source.starts_at), source.timezone,
    source.venue_name, source.location_description, source.latitude, source.longitude,
    source.reveal_coordinates_after_confirmation, source.capacity,
    source.waitlist_enabled, source.approval_required, source.visibility, source.min_age,
    source.eligibility_requirements, source.accessibility_information,
    source.cost_information, source.cancellation_policy, source.safety_rules,
    source.attendee_list_visible, 'draft'
  );

  insert into public.event_tags (event_id, tag_id)
  select duplicate_id, tag_id from public.event_tags where event_id = target_event_id
  on conflict do nothing;
  return duplicate_id;
end;
$$;

create or replace function public.duplicate_event(target_event_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.duplicate_event(target_event_id);
$$;

grant execute on function ruckus_private.duplicate_event(uuid) to authenticated;
grant execute on function public.duplicate_event(uuid) to authenticated;
