-- Concurrency-safe matching and trusted check-in/XP operations.

create or replace function public.record_activity_pass(target_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_profile public.profiles%rowtype;
  session_record public.activity_sessions%rowtype;
  existing_decision public.swipe_decision;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  select * into actor_profile from public.profiles where id = actor_id;
  select * into session_record from public.activity_sessions where id = target_session_id;

  if actor_profile.email_domain_verified_at is null
    or actor_profile.onboarding_completed_at is null
    or not actor_profile.age_attested
    or actor_profile.deletion_requested_at is not null
    or session_record.id is null
    or session_record.campus_id <> actor_profile.campus_id
    or session_record.status <> 'scheduled'
    or session_record.swipe_closes_at <= now()
  then
    raise exception using errcode = '42501', message = 'SWIPE_NOT_ALLOWED';
  end if;

  select decision
  into existing_decision
  from public.swipes
  where profile_id = actor_id and activity_session_id = target_session_id;

  if existing_decision is not null then
    return jsonb_build_object(
      'decision', existing_decision,
      'duplicate', true
    );
  end if;

  insert into public.swipes (profile_id, activity_session_id, decision)
  values (actor_id, target_session_id, 'pass');

  return jsonb_build_object('decision', 'pass', 'duplicate', false);
end;
$$;

create or replace function public.process_swipe_and_match(target_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_profile public.profiles%rowtype;
  session_record public.activity_sessions%rowtype;
  campus_record public.campuses%rowtype;
  existing_decision public.swipe_decision;
  existing_group_id uuid;
  candidate record;
  candidate_ids uuid[] := array[]::uuid[];
  filtered_ids uuid[] := array[]::uuid[];
  candidate_id uuid;
  created_group_id uuid;
  deadline timestamptz;
  member_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  -- Serializes formation within a session. Cross-session overlap is protected by
  -- deterministic profile row locks below.
  perform pg_advisory_xact_lock(
    hashtextextended('campus-clash-session:' || target_session_id::text, 0)
  );

  select * into actor_profile from public.profiles where id = actor_id;
  select * into session_record
  from public.activity_sessions
  where id = target_session_id
  for update;
  select * into campus_record
  from public.campuses
  where id = actor_profile.campus_id;

  if actor_profile.id is null
    or actor_profile.email_domain_verified_at is null
    or actor_profile.onboarding_completed_at is null
    or not actor_profile.age_attested
    or actor_profile.deletion_requested_at is not null
    or session_record.id is null
    or session_record.campus_id <> actor_profile.campus_id
    or session_record.status <> 'scheduled'
    or session_record.swipe_closes_at <= now()
    or session_record.starts_at <= now() + interval '10 minutes'
  then
    raise exception using errcode = '42501', message = 'MATCHING_NOT_ALLOWED';
  end if;

  select decision
  into existing_decision
  from public.swipes
  where profile_id = actor_id and activity_session_id = target_session_id;

  if existing_decision is not null then
    select matched_group_id
    into existing_group_id
    from public.waitlist_entries
    where profile_id = actor_id and activity_session_id = target_session_id;

    return jsonb_build_object(
      'decision', existing_decision,
      'duplicate', true,
      'state',
        case
          when existing_decision = 'pass' then 'passed'
          when existing_group_id is null then 'waiting'
          else 'matched'
        end,
      'groupId', existing_group_id
    );
  end if;

  select member.group_id
  into existing_group_id
  from public.group_members as member
  join public.groups as group_record on group_record.id = member.group_id
  join public.activity_sessions as assigned_session
    on assigned_session.id = group_record.activity_session_id
  where member.profile_id = actor_id
    and member.status = 'active'
    and group_record.status in ('forming', 'pending_confirmation', 'confirmed')
    and tstzrange(assigned_session.starts_at, assigned_session.ends_at, '[)')
      && tstzrange(session_record.starts_at, session_record.ends_at, '[)')
  limit 1;

  if existing_group_id is not null then
    raise exception using errcode = 'P0001', message = 'OVERLAPPING_GROUP_EXISTS';
  end if;

  insert into public.swipes (profile_id, activity_session_id, decision)
  values (actor_id, target_session_id, 'interested');

  insert into public.waitlist_entries (profile_id, activity_session_id)
  values (actor_id, target_session_id);

  -- Start with the actor, then add oldest eligible waiters. Pairwise block checks
  -- keep every selected member compatible with the whole provisional crew.
  for candidate in
    select waitlist.profile_id, waitlist.joined_at
    from public.waitlist_entries as waitlist
    join public.profiles as profile on profile.id = waitlist.profile_id
    where waitlist.activity_session_id = target_session_id
      and waitlist.status = 'waiting'
      and profile.campus_id = session_record.campus_id
      and profile.email_domain_verified_at is not null
      and profile.onboarding_completed_at is not null
      and profile.age_attested
      and profile.deletion_requested_at is null
      and not exists (
        select 1
        from public.group_members as member
        join public.groups as group_record on group_record.id = member.group_id
        join public.activity_sessions as assigned_session
          on assigned_session.id = group_record.activity_session_id
        where member.profile_id = waitlist.profile_id
          and member.status = 'active'
          and group_record.status in ('forming', 'pending_confirmation', 'confirmed')
          and tstzrange(assigned_session.starts_at, assigned_session.ends_at, '[)')
            && tstzrange(session_record.starts_at, session_record.ends_at, '[)')
      )
    order by
      case when waitlist.profile_id = actor_id then 0 else 1 end,
      waitlist.joined_at,
      waitlist.profile_id
    for update of waitlist skip locked
  loop
    exit when cardinality(candidate_ids) >= campus_record.target_group_size;

    if not exists (
      select 1
      from unnest(candidate_ids) as chosen(id)
      where public.is_blocked_between(candidate.profile_id, chosen.id)
    ) then
      candidate_ids := array_append(candidate_ids, candidate.profile_id);
    end if;
  end loop;

  if cardinality(candidate_ids) < campus_record.min_group_size then
    return jsonb_build_object(
      'decision', 'interested',
      'duplicate', false,
      'state', 'waiting',
      'waitlistSize', cardinality(candidate_ids)
    );
  end if;

  -- Lock all candidate profiles in UUID order. Any match for an overlapping
  -- session must acquire the same rows, preventing double assignment.
  perform profile.id
  from public.profiles as profile
  where profile.id = any(candidate_ids)
  order by profile.id
  for update;

  foreach candidate_id in array candidate_ids
  loop
    if not exists (
      select 1
      from public.group_members as member
      join public.groups as group_record on group_record.id = member.group_id
      join public.activity_sessions as assigned_session
        on assigned_session.id = group_record.activity_session_id
      where member.profile_id = candidate_id
        and member.status = 'active'
        and group_record.status in ('forming', 'pending_confirmation', 'confirmed')
        and tstzrange(assigned_session.starts_at, assigned_session.ends_at, '[)')
          && tstzrange(session_record.starts_at, session_record.ends_at, '[)')
    ) then
      filtered_ids := array_append(filtered_ids, candidate_id);
    end if;
  end loop;

  candidate_ids := filtered_ids;

  if not actor_id = any(candidate_ids) then
    update public.waitlist_entries
    set status = 'withdrawn'
    where profile_id = actor_id
      and activity_session_id = target_session_id
      and status = 'waiting';

    raise exception using errcode = 'P0001', message = 'OVERLAPPING_GROUP_EXISTS';
  end if;

  if cardinality(candidate_ids) < campus_record.min_group_size then
    return jsonb_build_object(
      'decision', 'interested',
      'duplicate', false,
      'state', 'waiting',
      'waitlistSize', cardinality(candidate_ids)
    );
  end if;

  deadline := least(
    now() + interval '12 hours',
    session_record.starts_at - interval '30 minutes'
  );

  insert into public.groups (
    activity_session_id,
    campus_id,
    status,
    min_size,
    target_size,
    max_size,
    confirmation_deadline
  )
  values (
    target_session_id,
    session_record.campus_id,
    'pending_confirmation',
    campus_record.min_group_size,
    campus_record.target_group_size,
    campus_record.max_group_size,
    deadline
  )
  returning id into created_group_id;

  insert into public.group_members (group_id, profile_id, is_host)
  select
    created_group_id,
    selected.profile_id,
    profile.role in ('host', 'admin')
  from unnest(candidate_ids) with ordinality as selected(profile_id, position)
  join public.profiles as profile on profile.id = selected.profile_id
  order by selected.position;

  insert into public.attendance_confirmations (
    group_id,
    profile_id,
    deadline
  )
  select created_group_id, unnest(candidate_ids), deadline;

  update public.waitlist_entries
  set
    status = 'matched',
    matched_group_id = created_group_id,
    matched_at = now()
  where activity_session_id = target_session_id
    and profile_id = any(candidate_ids)
    and status = 'waiting';

  insert into public.messages (group_id, kind, body)
  values (
    created_group_id,
    'system',
    'Crew assembled! Confirm before the countdown ends to unlock the public meeting spot.'
  );

  member_count := cardinality(candidate_ids);

  return jsonb_build_object(
    'decision', 'interested',
    'duplicate', false,
    'state', 'matched',
    'groupId', created_group_id,
    'memberCount', member_count,
    'confirmationDeadline', deadline,
    'memberIds', to_jsonb(candidate_ids)
  );
end;
$$;

create or replace function public.create_checkin_token_digest(
  target_group_id uuid,
  digest_value text,
  lifetime_seconds integer default 120
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  group_record public.groups%rowtype;
  session_record public.activity_sessions%rowtype;
  token_id uuid;
  actor_is_host boolean;
begin
  if digest_value !~ '^[0-9a-f]{64}$'
    or lifetime_seconds not between 30 and 300
  then
    raise exception using errcode = '22023', message = 'INVALID_TOKEN_CONFIGURATION';
  end if;

  select * into group_record
  from public.groups
  where id = target_group_id
  for update;

  select * into session_record
  from public.activity_sessions
  where id = group_record.activity_session_id;

  select exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and profile_id = actor_id
      and status = 'active'
      and is_host
  )
  into actor_is_host;

  if group_record.id is null
    or group_record.status <> 'confirmed'
    or not (actor_is_host or public.is_admin())
    or now() < coalesce(session_record.checkin_opens_at, session_record.starts_at - interval '15 minutes')
    or now() > coalesce(session_record.checkin_closes_at, session_record.ends_at)
  then
    raise exception using errcode = '42501', message = 'TOKEN_GENERATION_NOT_ALLOWED';
  end if;

  update public.checkin_tokens
  set revoked_at = now()
  where group_id = target_group_id and revoked_at is null and expires_at > now();

  insert into public.checkin_tokens (
    group_id,
    activity_session_id,
    created_by,
    token_digest,
    valid_from,
    expires_at
  )
  values (
    target_group_id,
    group_record.activity_session_id,
    actor_id,
    digest_value,
    now() - interval '5 seconds',
    now() + make_interval(secs => lifetime_seconds)
  )
  returning id into token_id;

  return token_id;
end;
$$;

create or replace function public.redeem_checkin_token_digest(digest_value text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  token_record public.checkin_tokens%rowtype;
  session_record public.activity_sessions%rowtype;
  group_record public.groups%rowtype;
  checkin_id uuid;
  already_checked_in boolean := false;
begin
  if actor_id is null or digest_value !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'INVALID_CHECKIN_TOKEN';
  end if;

  select *
  into token_record
  from public.checkin_tokens
  where token_digest = digest_value
  for update;

  select * into group_record
  from public.groups
  where id = token_record.group_id;

  select * into session_record
  from public.activity_sessions
  where id = token_record.activity_session_id;

  if token_record.id is null
    or token_record.revoked_at is not null
    or now() not between token_record.valid_from and token_record.expires_at
    or group_record.status <> 'confirmed'
    or now() < coalesce(session_record.checkin_opens_at, session_record.starts_at - interval '15 minutes')
    or now() > coalesce(session_record.checkin_closes_at, session_record.ends_at)
    or not exists (
      select 1 from public.group_members
      where group_id = token_record.group_id
        and profile_id = actor_id
        and status = 'active'
    )
    or not exists (
      select 1 from public.attendance_confirmations
      where group_id = token_record.group_id
        and profile_id = actor_id
        and status = 'confirmed'
    )
  then
    raise exception using errcode = '42501', message = 'CHECKIN_NOT_ALLOWED';
  end if;

  insert into public.checkins (
    group_id,
    activity_session_id,
    profile_id,
    checkin_token_id
  )
  values (
    token_record.group_id,
    token_record.activity_session_id,
    actor_id,
    token_record.id
  )
  on conflict (activity_session_id, profile_id) do nothing
  returning id into checkin_id;

  if checkin_id is null then
    already_checked_in := true;
    select id into checkin_id
    from public.checkins
    where activity_session_id = token_record.activity_session_id
      and profile_id = actor_id;
  end if;

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
    50,
    'verified_checkin',
    'checkin',
    checkin_id
  )
  on conflict (profile_id, reason, source_type, source_id) do nothing;

  return jsonb_build_object(
    'success', true,
    'alreadyCheckedIn', already_checked_in,
    'checkinId', checkin_id,
    'xpAwarded', case when already_checked_in then 0 else 50 end
  );
end;
$$;

create or replace function public.finalize_group_attendance(target_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  group_record public.groups%rowtype;
  session_record public.activity_sessions%rowtype;
  actor_is_host boolean;
  no_show_count integer := 0;
  checked_in_count integer := 0;
begin
  select * into group_record
  from public.groups
  where id = target_group_id
  for update;
  select * into session_record
  from public.activity_sessions
  where id = group_record.activity_session_id;

  select exists (
    select 1 from public.group_members
    where group_id = target_group_id
      and profile_id = actor_id
      and status = 'active'
      and is_host
  )
  into actor_is_host;

  if group_record.id is null
    or group_record.status not in ('confirmed', 'completed')
    or not (actor_is_host or public.is_admin())
    or now() <= coalesce(session_record.checkin_closes_at, session_record.ends_at)
  then
    raise exception using errcode = '42501', message = 'FINALIZATION_NOT_ALLOWED';
  end if;

  select count(*) into checked_in_count
  from public.checkins
  where group_id = target_group_id;

  with inserted as (
    insert into public.xp_ledger (
      profile_id,
      campus_id,
      amount,
      reason,
      source_type,
      source_id
    )
    select
      confirmation.profile_id,
      group_record.campus_id,
      -40,
      'no_show',
      'group',
      target_group_id
    from public.attendance_confirmations as confirmation
    where confirmation.group_id = target_group_id
      and confirmation.status = 'confirmed'
      and not exists (
        select 1 from public.checkins
        where group_id = target_group_id
          and profile_id = confirmation.profile_id
      )
    on conflict (profile_id, reason, source_type, source_id) do nothing
    returning 1
  )
  select count(*) into no_show_count from inserted;

  if actor_is_host and checked_in_count >= group_record.min_size then
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
      25,
      'host_completion',
      'group',
      target_group_id
    )
    on conflict (profile_id, reason, source_type, source_id) do nothing;
  end if;

  update public.groups set status = 'completed' where id = target_group_id;
  update public.activity_sessions set status = 'completed'
  where id = group_record.activity_session_id and status = 'scheduled';

  return jsonb_build_object(
    'checkedInCount', checked_in_count,
    'noShowCount', no_show_count,
    'completed', true
  );
end;
$$;

comment on function public.process_swipe_and_match(uuid) is
  'Atomic right-swipe, waitlist, pairwise block filtering, and overlap-safe group formation.';
comment on function public.redeem_checkin_token_digest(text) is
  'Idempotently inserts one verified check-in and one 50 XP ledger entry in the same transaction.';
