-- Campus ambassador program and semester-scoped XP. Ambassador standing is granted
-- by campus administrators and never confers campus administration or platform
-- administration capability.

create type public.ambassador_application_status as enum (
  'submitted', 'under_review', 'approved', 'rejected', 'withdrawn'
);
create type public.ambassador_status as enum ('active', 'paused', 'retired');
create type public.ambassador_tier as enum ('rookie', 'builder', 'leader');

create table public.semesters (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (campus_id, name),
  constraint semesters_name_length check (char_length(name) between 3 and 60),
  constraint semesters_window check (starts_on < ends_on and ends_on <= starts_on + 400)
);

-- At most one current semester per campus keeps XP attribution unambiguous.
create unique index semesters_single_current_idx
  on public.semesters(campus_id) where is_current;

create table public.semester_xp (
  id uuid primary key default extensions.gen_random_uuid(),
  semester_id uuid not null references public.semesters(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  xp_total integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (semester_id, profile_id),
  constraint semester_xp_total check (xp_total >= 0)
);

create table public.ambassador_applications (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  motivation text not null,
  status public.ambassador_application_status not null default 'submitted',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ambassador_motivation_length check (char_length(motivation) between 40 and 2000),
  constraint ambassador_review_notes check (review_notes is null or char_length(review_notes) <= 2000),
  constraint ambassador_review_consistent check (
    (reviewed_by is null and reviewed_at is null)
    or (reviewed_by is not null and reviewed_at is not null)
  )
);

-- One open application per profile; resolved applications may be superseded.
create unique index ambassador_applications_open_idx
  on public.ambassador_applications(profile_id)
  where status in ('submitted', 'under_review');

create table public.ambassadors (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.ambassador_status not null default 'active',
  tier public.ambassador_tier not null default 'rookie',
  referral_code_id uuid references public.referral_codes(id) on delete set null,
  activated_by uuid not null references public.profiles(id) on delete restrict,
  activated_at timestamptz not null default now(),
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id),
  constraint ambassador_retirement check (
    (status = 'retired' and retired_at is not null)
    or (status <> 'retired' and retired_at is null)
  )
);

create index semester_xp_leaderboard_idx on public.semester_xp(semester_id, xp_total desc);
create index ambassadors_campus_idx on public.ambassadors(campus_id, status);
create index ambassador_applications_campus_idx
  on public.ambassador_applications(campus_id, status, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'semesters', 'semester_xp', 'ambassador_applications', 'ambassadors'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Semester XP accrual
-- ---------------------------------------------------------------------------

-- Every XP ledger entry also accrues against the campus's current semester so a
-- semester leaderboard never has to re-scan the whole ledger. Negative XP is
-- clamped at zero rather than allowed to push a semester total below zero.
create or replace function ruckus_private.accrue_semester_xp()
returns trigger language plpgsql security definer set search_path = '' as $$
declare current_semester_id uuid;
begin
  select id into current_semester_id from public.semesters
  where campus_id = new.campus_id and is_current
    and new.created_at::date between starts_on and ends_on;
  if current_semester_id is null then return new; end if;
  insert into public.semester_xp (semester_id, profile_id, xp_total, updated_at)
  values (current_semester_id, new.profile_id, greatest(new.amount, 0), now())
  on conflict (semester_id, profile_id) do update
  set xp_total = greatest(public.semester_xp.xp_total + new.amount, 0), updated_at = now();
  return new;
end;
$$;

create trigger xp_ledger_accrue_semester
after insert on public.xp_ledger
for each row execute function ruckus_private.accrue_semester_xp();

create or replace function public.open_campus_semester(
  target_campus_id uuid, semester_name text, starts_on date, ends_on date
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); semester_id uuid;
begin
  if not ruckus_private.has_campus_admin_role(target_campus_id, actor_id,
    array['administrator']::public.campus_admin_role[]) then
    raise exception using errcode = '42501', message = 'CAMPUS_ADMINISTRATOR_REQUIRED';
  end if;
  update public.semesters set is_current = false
  where campus_id = target_campus_id and is_current;
  insert into public.semesters (campus_id, name, starts_on, ends_on, is_current)
  values (target_campus_id, trim(semester_name), starts_on, ends_on, true)
  returning id into semester_id;
  insert into public.campus_admin_audit_log (campus_id, actor_id, action, target_type, target_id)
  values (target_campus_id, actor_id, 'semester_opened', 'semester', semester_id);
  return semester_id;
end;
$$;

-- Rollover closes the current semester without deleting its standings, so past
-- semester leaderboards stay readable after a new semester begins.
create or replace function public.roll_over_campus_semester(
  target_campus_id uuid, next_name text, next_starts_on date, next_ends_on date
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); closed_id uuid; next_id uuid;
begin
  if not ruckus_private.has_campus_admin_role(target_campus_id, actor_id,
    array['administrator']::public.campus_admin_role[]) then
    raise exception using errcode = '42501', message = 'CAMPUS_ADMINISTRATOR_REQUIRED';
  end if;
  update public.semesters set is_current = false
  where campus_id = target_campus_id and is_current
  returning id into closed_id;
  insert into public.semesters (campus_id, name, starts_on, ends_on, is_current)
  values (target_campus_id, trim(next_name), next_starts_on, next_ends_on, true)
  returning id into next_id;
  insert into public.campus_admin_audit_log (
    campus_id, actor_id, action, target_type, target_id, metadata
  ) values (target_campus_id, actor_id, 'semester_rolled_over', 'semester', next_id,
    jsonb_build_object('closedSemesterId', closed_id));
  return next_id;
end;
$$;

-- Semester standings are opt-in: a profile appears only when it has chosen to be
-- discoverable, and the caller's own rank is always returned even when hidden.
create or replace function public.get_semester_leaderboard(page_size integer default 25)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  viewer public.profiles%rowtype;
  semester_record public.semesters%rowtype;
  result jsonb;
begin
  if page_size not between 1 and 100 then
    raise exception using errcode = '22023', message = 'INVALID_PAGE_SIZE';
  end if;
  select * into viewer from public.profiles where id = actor_id;
  if viewer.id is null or viewer.banned_at is not null
    or viewer.email_domain_verified_at is null then
    raise exception using errcode = '42501', message = 'CAMPUS_MEMBER_REQUIRED';
  end if;
  select * into semester_record from public.semesters
  where campus_id = viewer.campus_id and is_current;
  if semester_record.id is null then
    return jsonb_build_object('semester', null, 'entries', '[]'::jsonb, 'viewer', null);
  end if;

  select jsonb_build_object(
    'semester', jsonb_build_object(
      'id', semester_record.id, 'name', semester_record.name,
      'startsOn', semester_record.starts_on, 'endsOn', semester_record.ends_on
    ),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank', ranked.rank, 'profileId', ranked.profile_id,
        'displayName', ranked.display_name, 'avatarPath', ranked.avatar_path,
        'xpTotal', ranked.xp_total
      ) order by ranked.rank)
      from (
        select sx.profile_id, p.display_name, p.avatar_path, sx.xp_total,
          rank() over (order by sx.xp_total desc, sx.profile_id) as rank
        from public.semester_xp sx
        join public.profiles p on p.id = sx.profile_id
        join public.profile_preferences pp on pp.profile_id = sx.profile_id
        where sx.semester_id = semester_record.id
          and p.banned_at is null and p.deletion_requested_at is null
          and pp.leaderboard_visible
        limit page_size
      ) ranked
    ), '[]'::jsonb),
    'viewer', (
      select jsonb_build_object('xpTotal', sx.xp_total, 'rank', (
        select count(*) + 1 from public.semester_xp peer
        where peer.semester_id = semester_record.id and peer.xp_total > sx.xp_total
      ))
      from public.semester_xp sx
      where sx.semester_id = semester_record.id and sx.profile_id = actor_id
    )
  ) into result;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ambassador program
-- ---------------------------------------------------------------------------

create or replace function public.apply_for_ambassador_program(application_motivation text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); viewer public.profiles%rowtype; application_id uuid;
begin
  if not ruckus_private.profile_is_ready(actor_id) then
    raise exception using errcode = '42501', message = 'PROFILE_NOT_READY';
  end if;
  select * into viewer from public.profiles where id = actor_id;
  if exists (select 1 from public.ambassadors where profile_id = actor_id and status <> 'retired') then
    raise exception using errcode = '22023', message = 'ALREADY_AN_AMBASSADOR';
  end if;
  insert into public.ambassador_applications (campus_id, profile_id, motivation)
  values (viewer.campus_id, actor_id, trim(application_motivation))
  returning id into application_id;
  return application_id;
end;
$$;

create or replace function public.get_campus_ambassador_applications(target_campus_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); result jsonb;
begin
  if not ruckus_private.has_campus_admin_role(target_campus_id, actor_id,
    array['administrator']::public.campus_admin_role[]) then
    raise exception using errcode = '42501', message = 'CAMPUS_ADMINISTRATOR_REQUIRED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'profileId', a.profile_id, 'displayName', p.display_name,
    'motivation', a.motivation, 'status', a.status, 'createdAt', a.created_at
  ) order by a.created_at), '[]'::jsonb) into result
  from public.ambassador_applications a
  join public.profiles p on p.id = a.profile_id
  where a.campus_id = target_campus_id and a.status in ('submitted', 'under_review');
  return result;
end;
$$;

-- Approval activates the ambassador and issues a dedicated ambassador referral
-- code, so ambassador-driven signups are attributable separately from ordinary
-- peer referrals.
create or replace function public.review_ambassador_application(
  target_application_id uuid, approve boolean, notes text
)
returns public.ambassador_application_status
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  application public.ambassador_applications%rowtype;
  next_status public.ambassador_application_status;
  new_code text;
  new_code_id uuid;
  attempt integer := 0;
begin
  select * into application from public.ambassador_applications
  where id = target_application_id for update;
  if application.id is null or not ruckus_private.has_campus_admin_role(
    application.campus_id, actor_id, array['administrator']::public.campus_admin_role[]) then
    raise exception using errcode = '42501', message = 'CAMPUS_ADMINISTRATOR_REQUIRED';
  end if;
  if application.status not in ('submitted', 'under_review')
    or char_length(trim(notes)) not between 3 and 2000 then
    raise exception using errcode = '22023', message = 'INVALID_AMBASSADOR_REVIEW';
  end if;

  next_status := case when approve then 'approved'::public.ambassador_application_status
                      else 'rejected'::public.ambassador_application_status end;
  update public.ambassador_applications
  set status = next_status, reviewed_by = actor_id, reviewed_at = now(),
      review_notes = trim(notes), updated_at = now()
  where id = target_application_id;

  if approve then
    while attempt < 10 loop
      attempt := attempt + 1;
      new_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 10));
      begin
        insert into public.referral_codes (code, kind, owner_profile_id, campus_id)
        values (new_code, 'ambassador', application.profile_id, application.campus_id)
        returning id into new_code_id;
        exit;
      exception when unique_violation then
        new_code_id := null;
      end;
    end loop;
    if new_code_id is null then
      raise exception using errcode = 'P0001', message = 'AMBASSADOR_CODE_GENERATION_FAILED';
    end if;
    insert into public.ambassadors (campus_id, profile_id, referral_code_id, activated_by)
    values (application.campus_id, application.profile_id, new_code_id, actor_id)
    on conflict (profile_id) do update
    set status = 'active', retired_at = null, referral_code_id = excluded.referral_code_id,
        activated_by = actor_id, activated_at = now(), updated_at = now();
    insert into public.notification_jobs (profile_id, kind, deduplication_key, payload)
    values (application.profile_id, 'ambassador_application_outcome',
      'ambassador-application:' || target_application_id,
      jsonb_build_object('status', next_status))
    on conflict (deduplication_key) do nothing;
  end if;

  insert into public.campus_admin_audit_log (
    campus_id, actor_id, action, target_type, target_id, metadata
  ) values (application.campus_id, actor_id,
    case when approve then 'ambassador_approved' else 'ambassador_rejected' end,
    'profile', application.profile_id, jsonb_build_object('applicationId', target_application_id));
  return next_status;
end;
$$;

create or replace function public.retire_ambassador(target_ambassador_id uuid, reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); ambassador public.ambassadors%rowtype;
begin
  select * into ambassador from public.ambassadors where id = target_ambassador_id for update;
  if ambassador.id is null or not ruckus_private.has_campus_admin_role(
    ambassador.campus_id, actor_id, array['administrator']::public.campus_admin_role[])
    or char_length(trim(reason)) not between 3 and 1000 then
    raise exception using errcode = '42501', message = 'CAMPUS_ADMINISTRATOR_REQUIRED';
  end if;
  update public.ambassadors
  set status = 'retired', retired_at = now(), updated_at = now()
  where id = target_ambassador_id;
  -- Retiring an ambassador deactivates their ambassador code so no further
  -- signups are attributed to a programme they have left.
  update public.referral_codes set is_active = false
  where id = ambassador.referral_code_id;
  insert into public.campus_admin_audit_log (
    campus_id, actor_id, action, target_type, target_id, metadata
  ) values (ambassador.campus_id, actor_id, 'ambassador_retired', 'profile',
    ambassador.profile_id, jsonb_build_object('reason', trim(reason)));
end;
$$;

-- The ambassador's own dashboard. Referred students are reported as counts only;
-- an ambassador never sees who used their code.
create or replace function public.get_my_ambassador_dashboard()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  ambassador public.ambassadors%rowtype;
  code_record public.referral_codes%rowtype;
  qualified_count integer;
  result jsonb;
begin
  select * into ambassador from public.ambassadors where profile_id = actor_id;
  if ambassador.id is null then
    return jsonb_build_object('isAmbassador', false);
  end if;
  select * into code_record from public.referral_codes where id = ambassador.referral_code_id;
  select count(*)::integer into qualified_count
  from public.referrals r
  where r.referral_code_id = ambassador.referral_code_id
    and r.status in ('qualified', 'rewarded');

  select jsonb_build_object(
    'isAmbassador', true,
    'status', ambassador.status,
    'tier', ambassador.tier,
    'activatedAt', ambassador.activated_at,
    'referralCode', case when code_record.is_active then code_record.code else null end,
    'counts', jsonb_build_object(
      'attributed', (select count(*) from public.referrals
        where referral_code_id = ambassador.referral_code_id),
      'qualified', qualified_count
    ),
    'nextTier', case
      when ambassador.tier = 'rookie' then jsonb_build_object('tier', 'builder', 'qualifiedNeeded', greatest(5 - qualified_count, 0))
      when ambassador.tier = 'builder' then jsonb_build_object('tier', 'leader', 'qualifiedNeeded', greatest(20 - qualified_count, 0))
      else null end,
    'privacy', 'Referral counts are aggregate. Ambassadors never see who used their code.'
  ) into result;
  return result;
end;
$$;

-- Tiers are recomputed from qualified referrals only, so unqualified signups can
-- never inflate standing.
create or replace function public.recompute_ambassador_tiers()
returns integer language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  with qualified as (
    select a.id, count(r.id) as qualified_count
    from public.ambassadors a
    left join public.referrals r on r.referral_code_id = a.referral_code_id
      and r.status in ('qualified', 'rewarded')
    where a.status = 'active'
    group by a.id
  )
  update public.ambassadors a
  set tier = case
      when q.qualified_count >= 20 then 'leader'::public.ambassador_tier
      when q.qualified_count >= 5 then 'builder'::public.ambassador_tier
      else 'rookie'::public.ambassador_tier end,
    updated_at = now()
  from qualified q
  where q.id = a.id and a.tier <> case
      when q.qualified_count >= 20 then 'leader'::public.ambassador_tier
      when q.qualified_count >= 5 then 'builder'::public.ambassador_tier
      else 'rookie'::public.ambassador_tier end;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

do $$
declare signature text;
begin
  foreach signature in array array[
    'open_campus_semester(uuid,text,date,date)',
    'roll_over_campus_semester(uuid,text,date,date)',
    'get_semester_leaderboard(integer)',
    'apply_for_ambassador_program(text)',
    'get_campus_ambassador_applications(uuid)',
    'review_ambassador_application(uuid,boolean,text)',
    'retire_ambassador(uuid,text)',
    'get_my_ambassador_dashboard()'
  ] loop
    execute 'revoke all on function public.' || signature || ' from public, anon';
    execute 'grant execute on function public.' || signature || ' to authenticated';
  end loop;
end;
$$;
revoke all on function public.recompute_ambassador_tiers() from public, anon, authenticated;
grant execute on function public.recompute_ambassador_tiers() to service_role;
