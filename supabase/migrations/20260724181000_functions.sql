-- Shared trusted helpers, lifecycle triggers, and narrow client RPCs.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'campuses',
    'profiles',
    'interests',
    'activity_templates',
    'activity_sessions',
    'swipes',
    'waitlist_entries',
    'groups',
    'group_members',
    'messages',
    'attendance_confirmations',
    'checkin_tokens',
    'checkins',
    'push_tokens',
    'blocks',
    'reports',
    'admin_actions',
    'event_ratings'
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

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and deletion_requested_at is null
  );
$$;

create or replace function public.is_active_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and profile_id = (select auth.uid())
      and status = 'active'
  );
$$;

create or replace function public.is_blocked_between(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.blocks
    where (blocker_id = first_user_id and blocked_id = second_user_id)
       or (blocker_id = second_user_id and blocked_id = first_user_id)
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_campus_id uuid;
  requested_domain text;
begin
  requested_domain := split_part(lower(coalesce(new.email, '')), '@', 2);

  select campus.id
  into matched_campus_id
  from public.campuses as campus
  where lower(campus.email_domain::text) = requested_domain
    and campus.is_active
  limit 1;

  if matched_campus_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'UNIVERSITY_EMAIL_REQUIRED';
  end if;

  insert into public.profiles (
    id,
    campus_id,
    university_email,
    display_name,
    email_domain_verified_at
  )
  values (
    new.id,
    matched_campus_id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    case when new.email_confirmed_at is not null then now() else null end
  )
  on conflict (id) do update
  set university_email = excluded.university_email,
      campus_id = excluded.campus_id,
      email_domain_verified_at = coalesce(
        public.profiles.email_domain_verified_at,
        excluded.email_domain_verified_at
      );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create trigger on_auth_user_email_confirmed
after update of email, email_confirmed_at on auth.users
for each row
when (
  old.email is distinct from new.email
  or old.email_confirmed_at is distinct from new.email_confirmed_at
)
execute function public.handle_new_auth_user();

create or replace function public.enforce_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_count integer;
begin
  if new.kind <> 'text' then
    return new;
  end if;

  if new.sender_id is distinct from (select auth.uid()) then
    raise exception using errcode = '42501', message = 'INVALID_MESSAGE_SENDER';
  end if;

  select count(*)
  into recent_count
  from public.messages
  where sender_id = new.sender_id
    and created_at >= now() - interval '1 minute';

  if recent_count >= 20 then
    raise exception using errcode = 'P0001', message = 'MESSAGE_RATE_LIMITED';
  end if;

  return new;
end;
$$;

create trigger enforce_messages_rate_limit
before insert on public.messages
for each row execute function public.enforce_message_rate_limit();

create or replace function public.enforce_xp_ledger_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception using errcode = '42501', message = 'XP_LEDGER_IS_APPEND_ONLY';
end;
$$;

create trigger xp_ledger_no_update
before update on public.xp_ledger
for each row execute function public.enforce_xp_ledger_append_only();

create trigger xp_ledger_no_delete
before delete on public.xp_ledger
for each row execute function public.enforce_xp_ledger_append_only();

create or replace view public.activity_feed
with (security_invoker = true)
as
select
  session.id,
  session.activity_template_id,
  session.campus_id,
  template.title,
  template.description,
  template.category,
  template.duration_minutes,
  template.image_path,
  template.gradient_start,
  template.gradient_end,
  session.starts_at,
  session.ends_at,
  session.swipe_closes_at,
  session.capacity
from public.activity_sessions as session
join public.activity_templates as template
  on template.id = session.activity_template_id
join public.profiles as viewer
  on viewer.id = (select auth.uid())
  and viewer.campus_id = session.campus_id
where session.status = 'scheduled'
  and template.is_active
  and session.swipe_closes_at > now()
  and viewer.email_domain_verified_at is not null
  and viewer.onboarding_completed_at is not null
  and viewer.deletion_requested_at is null
  and not exists (
    select 1
    from public.swipes
    where profile_id = viewer.id
      and activity_session_id = session.id
  );

create or replace function public.get_group_lobby(target_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_active_group_member(target_group_id) then
    raise exception using errcode = '42501', message = 'GROUP_ACCESS_DENIED';
  end if;

  select jsonb_build_object(
    'id', group_record.id,
    'status', group_record.status,
    'confirmationDeadline', group_record.confirmation_deadline,
    'activitySessionId', session.id,
    'title', template.title,
    'startsAt', session.starts_at,
    'endsAt', session.ends_at,
    'venue',
      case
        when group_record.status in ('confirmed', 'completed') then
          jsonb_build_object(
            'name', session.public_venue_name,
            'address', session.public_venue_address,
            'notes', session.venue_notes
          )
        else null
      end,
    'members',
      (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', member_profile.id,
              'displayName', member_profile.display_name,
              'avatarPath', member_profile.avatar_path,
              'isHost', member.is_host,
              'confirmation', confirmation.status
            )
            order by member.joined_at
          ),
          '[]'::jsonb
        )
        from public.group_members as member
        join public.profiles as member_profile on member_profile.id = member.profile_id
        left join public.attendance_confirmations as confirmation
          on confirmation.group_id = member.group_id
          and confirmation.profile_id = member.profile_id
        where member.group_id = group_record.id
          and member.status = 'active'
          and not public.is_blocked_between((select auth.uid()), member.profile_id)
      )
  )
  into result
  from public.groups as group_record
  join public.activity_sessions as session on session.id = group_record.activity_session_id
  join public.activity_templates as template on template.id = session.activity_template_id
  where group_record.id = target_group_id;

  if result is null then
    raise exception using errcode = 'P0002', message = 'GROUP_NOT_FOUND';
  end if;

  return result;
end;
$$;

create or replace function public.confirm_attendance(target_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  confirmation_record public.attendance_confirmations%rowtype;
  group_record public.groups%rowtype;
  confirmed_count integer;
  became_confirmed boolean := false;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  select *
  into group_record
  from public.groups
  where id = target_group_id
  for update;

  if group_record.id is null
    or not public.is_active_group_member(target_group_id)
    or group_record.status not in ('pending_confirmation', 'confirmed')
  then
    raise exception using errcode = '42501', message = 'CONFIRMATION_NOT_ALLOWED';
  end if;

  select *
  into confirmation_record
  from public.attendance_confirmations
  where group_id = target_group_id and profile_id = actor_id
  for update;

  if confirmation_record.id is null then
    raise exception using errcode = '42501', message = 'CONFIRMATION_NOT_ALLOWED';
  end if;

  if confirmation_record.status = 'confirmed' then
    return jsonb_build_object(
      'status', 'confirmed',
      'groupStatus', group_record.status,
      'alreadyConfirmed', true
    );
  end if;

  if now() > confirmation_record.deadline then
    raise exception using errcode = 'P0001', message = 'CONFIRMATION_DEADLINE_PASSED';
  end if;

  update public.attendance_confirmations
  set status = 'confirmed', responded_at = now()
  where id = confirmation_record.id;

  insert into public.xp_ledger (
    profile_id,
    campus_id,
    amount,
    reason,
    source_type,
    source_id
  )
  values (
    actor_id,
    group_record.campus_id,
    5,
    'attendance_confirmed',
    'group',
    target_group_id
  )
  on conflict (profile_id, reason, source_type, source_id) do nothing;

  select count(*)
  into confirmed_count
  from public.attendance_confirmations
  where group_id = target_group_id and status = 'confirmed';

  if confirmed_count >= group_record.min_size
    and group_record.status = 'pending_confirmation'
  then
    update public.groups
    set status = 'confirmed', venue_revealed_at = now()
    where id = target_group_id and status = 'pending_confirmation';

    became_confirmed := found;
    if became_confirmed then
      insert into public.messages (group_id, kind, body)
      values (
        target_group_id,
        'system',
        'The crew is confirmed. Your public meeting spot is now unlocked.'
      );
    end if;
  end if;

  return jsonb_build_object(
    'status', 'confirmed',
    'groupStatus',
      case when became_confirmed or group_record.status = 'confirmed'
        then 'confirmed'
        else 'pending_confirmation'
      end,
    'confirmedCount', confirmed_count,
    'alreadyConfirmed', false
  );
end;
$$;

create or replace function public.leave_group(
  target_group_id uuid,
  apply_late_penalty boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  group_record public.groups%rowtype;
  session_start timestamptz;
begin
  select *
  into group_record
  from public.groups
  where id = target_group_id
  for update;

  select starts_at
  into session_start
  from public.activity_sessions
  where id = group_record.activity_session_id;

  if group_record.id is null
    or not public.is_active_group_member(target_group_id)
  then
    raise exception using errcode = '42501', message = 'GROUP_ACCESS_DENIED';
  end if;

  update public.group_members
  set status = 'left', left_at = now()
  where group_id = target_group_id
    and profile_id = actor_id
    and status = 'active';

  update public.attendance_confirmations
  set status = 'declined', responded_at = now()
  where group_id = target_group_id
    and profile_id = actor_id
    and status = 'pending';

  if apply_late_penalty
    and session_start > now()
    and session_start <= now() + interval '24 hours'
  then
    insert into public.xp_ledger (
      profile_id,
      campus_id,
      amount,
      reason,
      source_type,
      source_id
    )
    values (
      actor_id,
      group_record.campus_id,
      -15,
      'late_cancellation',
      'group',
      target_group_id
    )
    on conflict (profile_id, reason, source_type, source_id) do nothing;
  end if;

  insert into public.messages (group_id, kind, body)
  values (target_group_id, 'system', 'A member left this crew.');
end;
$$;

create or replace function public.block_user(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  shared_group record;
begin
  if actor_id is null or actor_id = target_profile_id then
    raise exception using errcode = '22023', message = 'INVALID_BLOCK_TARGET';
  end if;

  if not exists (select 1 from public.profiles where id = target_profile_id) then
    raise exception using errcode = 'P0002', message = 'PROFILE_NOT_FOUND';
  end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (actor_id, target_profile_id)
  on conflict (blocker_id, blocked_id) do nothing;

  update public.waitlist_entries
  set status = 'withdrawn'
  where profile_id = actor_id and status = 'waiting';

  for shared_group in
    select actor_member.group_id
    from public.group_members as actor_member
    join public.group_members as target_member
      on target_member.group_id = actor_member.group_id
      and target_member.profile_id = target_profile_id
      and target_member.status = 'active'
    where actor_member.profile_id = actor_id
      and actor_member.status = 'active'
  loop
    update public.group_members
    set status = 'left', left_at = now()
    where group_id = shared_group.group_id
      and profile_id = actor_id
      and status = 'active';

    update public.attendance_confirmations
    set status = 'declined', responded_at = now()
    where group_id = shared_group.group_id
      and profile_id = actor_id
      and status = 'pending';
  end loop;
end;
$$;

create or replace function public.report_message(
  target_message_id uuid,
  report_reason text,
  report_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  message_group_id uuid;
  report_id uuid;
begin
  select group_id
  into message_group_id
  from public.messages
  where id = target_message_id;

  if message_group_id is null
    or not public.is_active_group_member(message_group_id)
  then
    raise exception using errcode = '42501', message = 'MESSAGE_ACCESS_DENIED';
  end if;

  insert into public.reports (
    reporter_id,
    target_type,
    target_message_id,
    reason,
    details
  )
  values (
    actor_id,
    'message',
    target_message_id,
    trim(report_reason),
    nullif(trim(coalesce(report_details, '')), '')
  )
  returning id into report_id;

  return report_id;
end;
$$;

create or replace function public.submit_event_rating(
  target_session_id uuid,
  rating_value smallint,
  feedback_value text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_campus_id uuid;
  result_id uuid;
begin
  select campus_id into actor_campus_id from public.profiles where id = actor_id;

  if rating_value not between 1 and 5
    or not exists (
      select 1 from public.checkins
      where profile_id = actor_id and activity_session_id = target_session_id
    )
  then
    raise exception using errcode = '42501', message = 'RATING_NOT_ALLOWED';
  end if;

  insert into public.event_ratings (
    profile_id,
    activity_session_id,
    rating,
    feedback
  )
  values (
    actor_id,
    target_session_id,
    rating_value,
    nullif(trim(coalesce(feedback_value, '')), '')
  )
  on conflict (profile_id, activity_session_id) do update
  set rating = excluded.rating, feedback = excluded.feedback
  returning id into result_id;

  insert into public.xp_ledger (
    profile_id,
    campus_id,
    amount,
    reason,
    source_type,
    source_id
  )
  values (
    actor_id,
    actor_campus_id,
    10,
    'post_event_rating',
    'activity_session',
    target_session_id
  )
  on conflict (profile_id, reason, source_type, source_id) do nothing;

  return result_id;
end;
$$;

create or replace function public.get_xp_total(target_profile_id uuid default null)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(amount), 0)::bigint
  from public.xp_ledger
  where profile_id = coalesce(target_profile_id, (select auth.uid()))
    and (
      profile_id = (select auth.uid())
      or public.is_admin()
    );
$$;

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
  ),
  totals as (
    select
      ledger.profile_id,
      sum(ledger.amount)::bigint as xp
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
      dense_rank() over (order by totals.xp desc, totals.profile_id) as rank
    from totals
    join public.profiles as profile on profile.id = totals.profile_id
    join viewer on true
    where profile.onboarding_completed_at is not null
      and profile.deletion_requested_at is null
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

create or replace function public.register_push_token(
  token_value text,
  platform_value public.notification_platform,
  device_value text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  token_id uuid;
begin
  if (select auth.uid()) is null or token_value !~ '^Expo(nent)?PushToken\[' then
    raise exception using errcode = '22023', message = 'INVALID_PUSH_TOKEN';
  end if;

  insert into public.push_tokens (
    profile_id,
    expo_push_token,
    platform,
    device_id
  )
  values (
    (select auth.uid()),
    token_value,
    platform_value,
    device_value
  )
  on conflict (profile_id, device_id) do update
  set expo_push_token = excluded.expo_push_token,
      platform = excluded.platform,
      invalidated_at = null,
      last_seen_at = now()
  returning id into token_id;

  return token_id;
end;
$$;

create or replace function public.request_account_deletion()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set deletion_requested_at = now()
  where id = (select auth.uid())
    and deletion_requested_at is null;
$$;

comment on function public.handle_new_auth_user() is
  'Restricts launch access to the configured campus domain. Domain access is not identity proof.';
comment on function public.get_group_lobby(uuid) is
  'Returns public member fields and reveals a public venue only to active members after confirmation.';
