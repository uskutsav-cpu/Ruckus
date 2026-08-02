-- Admin-only moderation queue, event-message reporting, and audited enforcement.

alter table public.reports
  add column target_event_message_id uuid
    references public.event_messages(id) on delete set null;

alter table public.messages
  add column removed_at timestamptz,
  add column removed_by uuid references public.profiles(id) on delete set null;
alter table public.messages add constraint messages_removal check (
  (removed_at is null and removed_by is null)
  or (removed_at is not null and removed_by is not null)
);

alter table public.reports drop constraint reports_exact_target;
alter table public.reports add constraint reports_exact_target check (
  num_nonnulls(
    target_user_id,
    target_message_id,
    target_group_id,
    target_event_id,
    target_organization_id,
    target_event_message_id
  ) = 1
  and (
    (target_type = 'user' and target_user_id is not null)
    or (target_type = 'message' and (target_message_id is not null or target_event_message_id is not null))
    or (target_type = 'group' and target_group_id is not null)
    or (target_type = 'event' and target_event_id is not null)
    or (target_type = 'organization' and target_organization_id is not null)
  )
);

create or replace function ruckus_private.create_moderation_case_for_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.moderation_cases (report_id, severity)
  values (
    new.id,
    case
      when lower(new.reason) ~ '(immediate|threat|violence|weapon|self-harm)' then 4
      when lower(new.reason) ~ '(harass|hate|sexual|stalk|danger)' then 3
      when lower(new.reason) ~ '(spam|impersonat|scam)' then 2
      else 1
    end
  );
  return new;
end;
$$;

create trigger create_moderation_case_for_report
after insert on public.reports
for each row execute function ruckus_private.create_moderation_case_for_report();

create or replace function ruckus_private.report_event_message(
  target_message_id uuid,
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
  message_record public.event_messages%rowtype;
  report_id uuid;
  recent_count integer;
begin
  select * into message_record from public.event_messages where id = target_message_id;
  if actor_id is null
    or message_record.id is null
    or message_record.sender_id is null
    or message_record.sender_id = actor_id
    or not ruckus_private.can_access_event_chat(message_record.event_id, actor_id)
  then
    raise exception using errcode = '42501', message = 'EVENT_MESSAGE_REPORT_NOT_ALLOWED';
  end if;
  if char_length(trim(report_reason)) not between 3 and 100
    or char_length(coalesce(report_details, '')) > 2000
  then
    raise exception using errcode = '22023', message = 'INVALID_REPORT_DETAILS';
  end if;
  select count(*) into recent_count from public.reports
  where reporter_id = actor_id and created_at >= now() - interval '1 hour';
  if recent_count >= 10 then
    raise exception using errcode = 'P0001', message = 'REPORT_RATE_LIMITED';
  end if;

  insert into public.reports (
    reporter_id, target_type, target_event_message_id, reason, details
  ) values (
    actor_id, 'message', target_message_id, trim(report_reason),
    nullif(trim(coalesce(report_details, '')), '')
  ) returning id into report_id;
  return report_id;
end;
$$;

create or replace function public.report_event_message(
  target_message_id uuid,
  report_reason text,
  report_details text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.report_event_message(
    target_message_id, report_reason, report_details
  );
$$;

create or replace function ruckus_private.get_moderation_queue(
  status_filter public.moderation_case_status,
  severity_filter smallint,
  search_text text,
  page_size integer,
  page_offset integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if page_size not between 1 and 100 or page_offset < 0 then
    raise exception using errcode = '22023', message = 'INVALID_PAGINATION';
  end if;

  select jsonb_build_object(
    'items', coalesce(jsonb_agg(item order by
      (item->>'severity')::integer desc,
      item->>'createdAt',
      item->>'id'
    ), '[]'::jsonb),
    'total', (
      select count(*)
      from public.moderation_cases as count_case
      join public.reports as count_report on count_report.id = count_case.report_id
      where (status_filter is null or count_case.status = status_filter)
        and (severity_filter is null or count_case.severity = severity_filter)
        and (
          nullif(trim(coalesce(search_text, '')), '') is null
          or count_report.reason ilike '%' || trim(search_text) || '%'
          or coalesce(count_report.details, '') ilike '%' || trim(search_text) || '%'
        )
    )
  ) into result
  from (
    select jsonb_build_object(
      'id', moderation_case.id,
      'reportId', report.id,
      'status', moderation_case.status,
      'severity', moderation_case.severity,
      'assignedTo', moderation_case.assigned_to,
      'resolutionNotes', moderation_case.resolution_notes,
      'createdAt', moderation_case.created_at,
      'targetType', report.target_type,
      'targetId', coalesce(
        report.target_user_id,
        report.target_message_id,
        report.target_group_id,
        report.target_event_id,
        report.target_organization_id,
        report.target_event_message_id
      ),
      'reason', report.reason,
      'details', report.details,
      'reporterId', report.reporter_id,
      'targetLabel', case report.target_type
        when 'user' then (select display_name from public.profiles where id = report.target_user_id)
        when 'group' then 'Activity group'
        when 'event' then (select title from public.events where id = report.target_event_id)
        when 'organization' then (select name from public.organizations where id = report.target_organization_id)
        when 'message' then 'Chat message'
      end,
      'priorActionCount', (
        select count(*) from public.moderation_actions
        where target_id = coalesce(
          report.target_user_id,
          report.target_message_id,
          report.target_group_id,
          report.target_event_id,
          report.target_organization_id,
          report.target_event_message_id
        )
      )
    ) as item
    from public.moderation_cases as moderation_case
    join public.reports as report on report.id = moderation_case.report_id
    where (status_filter is null or moderation_case.status = status_filter)
      and (severity_filter is null or moderation_case.severity = severity_filter)
      and (
        nullif(trim(coalesce(search_text, '')), '') is null
        or report.reason ilike '%' || trim(search_text) || '%'
        or coalesce(report.details, '') ilike '%' || trim(search_text) || '%'
      )
    order by moderation_case.severity desc, moderation_case.created_at, moderation_case.id
    limit page_size offset page_offset
  ) as queue;
  return result;
end;
$$;

create or replace function public.get_moderation_queue(
  status_filter public.moderation_case_status default null,
  severity_filter smallint default null,
  search_text text default null,
  page_size integer default 25,
  page_offset integer default 0
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select ruckus_private.get_moderation_queue(
    status_filter, severity_filter, search_text, page_size, page_offset
  );
$$;

create or replace function ruckus_private.update_moderation_case(
  target_case_id uuid,
  next_status public.moderation_case_status,
  severity_value smallint,
  notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  report_id uuid;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if severity_value not between 1 and 4 or char_length(coalesce(notes, '')) > 4000 then
    raise exception using errcode = '22023', message = 'INVALID_MODERATION_UPDATE';
  end if;
  update public.moderation_cases
  set status = next_status,
      severity = severity_value,
      assigned_to = case when next_status = 'under_review' then actor_id else assigned_to end,
      resolution_notes = nullif(trim(coalesce(notes, '')), ''),
      updated_at = now()
  where id = target_case_id
  returning moderation_cases.report_id into report_id;
  if report_id is null then
    raise exception using errcode = 'P0002', message = 'MODERATION_CASE_NOT_FOUND';
  end if;
  update public.reports
  set status = case
        when next_status in ('resolved') then 'resolved'::public.report_status
        when next_status in ('dismissed') then 'dismissed'::public.report_status
        else 'under_review'::public.report_status
      end,
      reviewed_by = actor_id,
      reviewed_at = case when next_status in ('resolved', 'dismissed') then now() else reviewed_at end,
      resolution_notes = nullif(trim(coalesce(notes, '')), ''),
      updated_at = now()
  where id = report_id;
end;
$$;

create or replace function public.update_moderation_case(
  target_case_id uuid,
  next_status public.moderation_case_status,
  severity_value smallint,
  notes text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.update_moderation_case(
    target_case_id, next_status, severity_value, notes
  );
$$;

create or replace function ruckus_private.apply_moderation_action(
  target_case_id uuid,
  action_value public.moderation_action_kind,
  action_reason text,
  expiration timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  report_record public.reports%rowtype;
  target_id uuid;
  action_id uuid;
  target_type text;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if char_length(trim(action_reason)) not between 3 and 2000 then
    raise exception using errcode = '22023', message = 'ACTION_REASON_REQUIRED';
  end if;
  select report.* into report_record
  from public.moderation_cases as moderation_case
  join public.reports as report on report.id = moderation_case.report_id
  where moderation_case.id = target_case_id
  for update of moderation_case;
  if report_record.id is null then
    raise exception using errcode = 'P0002', message = 'MODERATION_CASE_NOT_FOUND';
  end if;

  if action_value in ('warn_user', 'suspend_user', 'ban_user') then
    target_id := coalesce(
      report_record.target_user_id,
      (select sender_id from public.messages where id = report_record.target_message_id),
      (select sender_id from public.event_messages where id = report_record.target_event_message_id)
    );
    target_type := 'user';
    if target_id is null then
      raise exception using errcode = '22023', message = 'USER_TARGET_REQUIRED';
    end if;
    if action_value = 'suspend_user' then
      if expiration is null or expiration <= now() or expiration > now() + interval '1 year' then
        raise exception using errcode = '22023', message = 'VALID_SUSPENSION_EXPIRY_REQUIRED';
      end if;
      update public.profiles set suspended_until = expiration where id = target_id;
    elsif action_value = 'ban_user' then
      update public.profiles set banned_at = now(), suspended_until = null where id = target_id;
    end if;
  elsif action_value = 'cancel_event' then
    target_id := report_record.target_event_id;
    target_type := 'event';
    if target_id is null then
      raise exception using errcode = '22023', message = 'EVENT_TARGET_REQUIRED';
    end if;
    update public.events
    set status = 'cancelled', cancelled_at = now(),
        cancellation_reason = 'Cancelled after moderation review'
    where id = target_id and status in ('draft', 'published');
    update public.event_rsvps
    set status = 'cancelled', cancelled_at = now(), status_reason = action_reason,
        waitlist_position = null, updated_at = now()
    where event_id = target_id and status in ('confirmed', 'pending', 'waitlisted');
    update public.event_chat_members set is_active = false, revoked_at = now()
    where event_id = target_id and revoked_at is null;
  elsif action_value = 'restrict_organization' then
    target_id := report_record.target_organization_id;
    target_type := 'organization';
    if target_id is null then
      raise exception using errcode = '22023', message = 'ORGANIZATION_TARGET_REQUIRED';
    end if;
    update public.organizations set is_restricted = true, updated_at = now() where id = target_id;
  elsif action_value = 'remove_content' then
    target_id := coalesce(
      report_record.target_event_id,
      report_record.target_organization_id,
      report_record.target_event_message_id,
      report_record.target_message_id
    );
    target_type := report_record.target_type::text;
    if report_record.target_event_id is not null then
      update public.events set status = 'removed', moderation_restricted = true where id = target_id;
    elsif report_record.target_organization_id is not null then
      update public.organizations set is_restricted = true where id = target_id;
    elsif report_record.target_event_message_id is not null then
      update public.event_messages
      set removed_at = now(), removed_by = actor_id, body = '[Message removed]'
      where id = target_id and removed_at is null;
    elsif report_record.target_message_id is not null then
      update public.messages
      set removed_at = now(), removed_by = actor_id, body = '[Message removed]'
      where id = target_id and removed_at is null;
    else
      raise exception using errcode = '22023', message = 'CONTENT_TARGET_REQUIRED';
    end if;
  elsif action_value = 'restore_content' then
    target_id := coalesce(report_record.target_event_id, report_record.target_organization_id);
    target_type := report_record.target_type::text;
    if report_record.target_event_id is not null then
      update public.events set status = 'published', moderation_restricted = false where id = target_id and status = 'removed';
    elsif report_record.target_organization_id is not null then
      update public.organizations set is_restricted = false where id = target_id;
    else
      raise exception using errcode = '22023', message = 'RESTORABLE_TARGET_REQUIRED';
    end if;
  end if;

  insert into public.moderation_actions (
    case_id, moderator_id, action, target_type, target_id, reason, expires_at
  ) values (
    target_case_id, actor_id, action_value, target_type, target_id,
    trim(action_reason), expiration
  ) returning id into action_id;
  perform ruckus_private.update_moderation_case(
    target_case_id,
    'resolved'::public.moderation_case_status,
    1::smallint,
    'Enforcement action: ' || action_value::text
  );
  return action_id;
end;
$$;

create or replace function public.apply_moderation_action(
  target_case_id uuid,
  action_value public.moderation_action_kind,
  action_reason text,
  expiration timestamptz default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.apply_moderation_action(
    target_case_id, action_value, action_reason, expiration
  );
$$;

grant execute on function ruckus_private.report_event_message(uuid, text, text)
to authenticated;
grant execute on function ruckus_private.get_moderation_queue(
  public.moderation_case_status, smallint, text, integer, integer
) to authenticated;
grant execute on function ruckus_private.update_moderation_case(
  uuid, public.moderation_case_status, smallint, text
) to authenticated;
grant execute on function ruckus_private.apply_moderation_action(
  uuid, public.moderation_action_kind, text, timestamptz
) to authenticated;
grant execute on function public.report_event_message(uuid, text, text) to authenticated;
grant execute on function public.get_moderation_queue(
  public.moderation_case_status, smallint, text, integer, integer
) to authenticated;
grant execute on function public.update_moderation_case(
  uuid, public.moderation_case_status, smallint, text
) to authenticated;
grant execute on function public.apply_moderation_action(
  uuid, public.moderation_action_kind, text, timestamptz
) to authenticated;
