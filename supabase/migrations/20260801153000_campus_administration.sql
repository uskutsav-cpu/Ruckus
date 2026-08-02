-- Campus-scoped university administration. Platform administration remains the
-- server-controlled profiles.role = admin capability and is never assignable here.

create type public.campus_admin_role as enum (
  'viewer', 'analyst', 'organization_verifier', 'moderator',
  'announcement_manager', 'administrator'
);
create type public.campus_announcement_status as enum (
  'draft', 'pending_approval', 'approved', 'scheduled', 'published',
  'expired', 'rejected', 'cancelled'
);
create type public.campus_announcement_audience as enum (
  'all', 'students', 'organizers'
);

create table public.campus_admin_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.campus_admin_role not null,
  granted_by uuid not null references public.profiles(id) on delete restrict,
  revoked_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campus_id, profile_id, role),
  constraint campus_assignment_revocation check (
    (revoked_at is null and revoked_by is null)
    or (revoked_at is not null and revoked_by is not null)
  )
);

create table public.campus_admin_audit_log (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint campus_admin_audit_action check (char_length(action) between 3 and 100),
  constraint campus_admin_audit_target check (target_type ~ '^[a-z_]{3,60}$'),
  constraint campus_admin_audit_metadata check (
    jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 8192
  )
);

create table public.campus_announcements (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  title text not null,
  body text not null,
  audience public.campus_announcement_audience not null default 'all',
  deep_link text,
  status public.campus_announcement_status not null default 'draft',
  scheduled_for timestamptz,
  expires_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campus_announcement_title check (char_length(title) between 3 and 120),
  constraint campus_announcement_body check (char_length(body) between 10 and 3000),
  constraint campus_announcement_deep_link check (
    deep_link is null or deep_link ~ '^ruckus://[a-zA-Z0-9/_?=&.-]{1,500}$'
  ),
  constraint campus_announcement_schedule check (
    (scheduled_for is null and expires_at is null)
    or (scheduled_for is not null and expires_at is not null
      and scheduled_for < expires_at and expires_at <= scheduled_for + interval '30 days')
  ),
  constraint campus_announcement_approval check (
    (approved_by is null and approved_at is null)
    or (approved_by is not null and approved_at is not null and approved_by <> author_id)
  )
);

create table public.campus_safety_escalations (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  moderation_case_id uuid not null references public.moderation_cases(id) on delete cascade,
  escalated_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (moderation_case_id),
  constraint campus_safety_escalation_reason check (char_length(reason) between 10 and 1000)
);

create table public.campus_admin_export_audit (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  range_start date not null,
  range_end date not null,
  row_count integer not null,
  created_at timestamptz not null default now(),
  constraint campus_admin_export_range check (
    range_start <= range_end and range_end <= range_start + 400
  ),
  constraint campus_admin_export_rows check (row_count between 0 and 10000)
);

create index campus_admin_assignments_profile_idx
  on public.campus_admin_assignments(profile_id, campus_id) where revoked_at is null;
create index campus_admin_audit_idx
  on public.campus_admin_audit_log(campus_id, created_at desc);
create index campus_announcements_schedule_idx
  on public.campus_announcements(status, scheduled_for);
create index campus_safety_escalations_idx
  on public.campus_safety_escalations(campus_id, resolved_at, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'campus_admin_assignments', 'campus_admin_audit_log', 'campus_announcements',
    'campus_safety_escalations', 'campus_admin_export_audit'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;

create or replace function ruckus_private.is_platform_admin(actor_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
    where id = actor_id and role = 'admin' and banned_at is null
      and deletion_requested_at is null);
$$;

create or replace function ruckus_private.has_campus_admin_role(
  target_campus_id uuid, actor_id uuid, allowed_roles public.campus_admin_role[]
)
returns boolean language sql stable security definer set search_path = '' as $$
  select ruckus_private.is_platform_admin(actor_id) or exists (
    select 1 from public.campus_admin_assignments
    where campus_id = target_campus_id and profile_id = actor_id
      and revoked_at is null and role = any(allowed_roles)
  );
$$;

create or replace function public.get_my_campus_admin_access()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'platformAdministrator', ruckus_private.is_platform_admin((select auth.uid())),
    'campuses', coalesce(jsonb_agg(jsonb_build_object(
      'campusId', a.campus_id, 'campusName', c.name, 'role', a.role
    ) order by c.name, a.role) filter (where a.id is not null), '[]'::jsonb)
  )
  from public.campus_admin_assignments a
  join public.campuses c on c.id = a.campus_id
  where a.profile_id = (select auth.uid()) and a.revoked_at is null;
$$;

create or replace function public.assign_campus_admin_role(
  target_campus_id uuid, target_profile_id uuid, target_role public.campus_admin_role
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); assignment_id uuid;
begin
  if not ruckus_private.is_platform_admin(actor_id) then
    raise exception using errcode = '42501', message = 'PLATFORM_ADMIN_REQUIRED';
  end if;
  if not exists (select 1 from public.profiles
    where id = target_profile_id and campus_id = target_campus_id
      and email_domain_verified_at is not null and banned_at is null) then
    raise exception using errcode = '42501', message = 'CAMPUS_PROFILE_REQUIRED';
  end if;
  insert into public.campus_admin_assignments (
    campus_id, profile_id, role, granted_by, revoked_by, revoked_at
  ) values (target_campus_id, target_profile_id, target_role, actor_id, null, null)
  on conflict (campus_id, profile_id, role) do update
  set granted_by = actor_id, revoked_by = null, revoked_at = null, created_at = now()
  returning id into assignment_id;
  insert into public.campus_admin_audit_log (
    campus_id, actor_id, action, target_type, target_id, metadata
  ) values (target_campus_id, actor_id, 'campus_role_assigned', 'profile',
    target_profile_id, jsonb_build_object('role', target_role));
  return assignment_id;
end;
$$;

create or replace function public.revoke_campus_admin_role(target_assignment_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); assignment public.campus_admin_assignments%rowtype;
begin
  if not ruckus_private.is_platform_admin(actor_id) then
    raise exception using errcode = '42501', message = 'PLATFORM_ADMIN_REQUIRED';
  end if;
  update public.campus_admin_assignments set revoked_at = now(), revoked_by = actor_id
  where id = target_assignment_id and revoked_at is null returning * into assignment;
  if assignment.id is null then raise exception using errcode = 'P0002', message = 'ASSIGNMENT_NOT_FOUND'; end if;
  insert into public.campus_admin_audit_log (
    campus_id, actor_id, action, target_type, target_id, metadata
  ) values (assignment.campus_id, actor_id, 'campus_role_revoked', 'profile',
    assignment.profile_id, jsonb_build_object('role', assignment.role));
end;
$$;

create or replace function public.get_campus_admin_overview(
  target_campus_id uuid, range_start date default (current_date - 30),
  range_end date default current_date
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); result jsonb; threshold constant integer := 5;
begin
  if not ruckus_private.has_campus_admin_role(target_campus_id, actor_id,
    array['viewer','analyst','organization_verifier','moderator','announcement_manager','administrator']::public.campus_admin_role[])
    or range_start > range_end or range_end > range_start + 400 then
    raise exception using errcode = '42501', message = 'CAMPUS_ADMIN_ACCESS_DENIED';
  end if;
  select jsonb_build_object(
    'campusId', target_campus_id, 'range', jsonb_build_object('start', range_start, 'end', range_end),
    'privacyThreshold', threshold,
    'counts', jsonb_build_object(
      'activeUsers', (select case when count(distinct profile_id) >= threshold then count(distinct profile_id) else null end from (
        select profile_id from public.recommendation_interactions where campus_id = target_campus_id and occurred_at::date between range_start and range_end
        union select profile_id from public.event_checkins c join public.events e on e.id=c.event_id where e.campus_id=target_campus_id and c.verified_at::date between range_start and range_end
      ) u),
      'activeUsersSuppressed', (select count(distinct profile_id) < threshold from (
        select profile_id from public.recommendation_interactions where campus_id = target_campus_id and occurred_at::date between range_start and range_end
        union select profile_id from public.event_checkins c join public.events e on e.id=c.event_id where e.campus_id=target_campus_id and c.verified_at::date between range_start and range_end
      ) u),
      'activeOrganizations', (select count(*) from public.organizations where campus_id=target_campus_id and not is_restricted),
      'upcomingEvents', (select count(*) from public.events where campus_id=target_campus_id and status='published' and starts_at>now()),
      'rsvps', (select count(*) from public.event_rsvps r join public.events e on e.id=r.event_id where e.campus_id=target_campus_id and r.joined_at::date between range_start and range_end),
      'attendance', (select count(*) from public.event_checkins c join public.events e on e.id=c.event_id where e.campus_id=target_campus_id and c.verified_at::date between range_start and range_end),
      'verificationQueue', (select count(*) from public.organization_verification_requests v join public.organizations o on o.id=v.organization_id where o.campus_id=target_campus_id and v.status in ('submitted','under_review')),
      'openModeration', (select count(*) from public.moderation_cases mc join public.reports r on r.id=mc.report_id left join public.events e on e.id=r.target_event_id left join public.organizations o on o.id=r.target_organization_id left join public.profiles p on p.id=r.target_user_id where coalesce(e.campus_id,o.campus_id,p.campus_id)=target_campus_id and mc.status not in ('resolved','dismissed')),
      'safetyEscalations', (select count(*) from public.campus_safety_escalations where campus_id=target_campus_id and resolved_at is null),
      'noShows', (select coalesce(sum(d.no_shows),0) from public.event_analytics_daily d join public.events e on e.id=d.event_id where e.campus_id=target_campus_id and d.metric_date between range_start and range_end),
      'checkins', (select coalesce(sum(d.checkins),0) from public.event_analytics_daily d join public.events e on e.id=d.event_id where e.campus_id=target_campus_id and d.metric_date between range_start and range_end),
      'repeatAttendance', (select coalesce(sum(d.repeat_attendees),0) from public.event_analytics_daily d join public.events e on e.id=d.event_id where e.campus_id=target_campus_id and d.metric_date between range_start and range_end)
    ),
    'reportTrends', (select coalesce(jsonb_agg(jsonb_build_object(
        'date', report_date,
        'count', case when report_count >= threshold then report_count else null end,
        'suppressed', report_count < threshold
      ) order by report_date),'[]'::jsonb) from (
      select r.created_at::date report_date, count(*) report_count from public.reports r
      left join public.events e on e.id=r.target_event_id left join public.organizations o on o.id=r.target_organization_id left join public.profiles p on p.id=r.target_user_id
      where coalesce(e.campus_id,o.campus_id,p.campus_id)=target_campus_id and r.created_at::date between range_start and range_end group by 1
    ) trends),
    'privacy', jsonb_build_object('smallCohortsSuppressed', true, 'minimumCohort', threshold)
  ) into result;
  return result;
end;
$$;

create or replace function public.get_campus_verification_queue(target_campus_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); result jsonb;
begin
  if not ruckus_private.has_campus_admin_role(target_campus_id, actor_id,
    array['organization_verifier','administrator']::public.campus_admin_role[]) then
    raise exception using errcode='42501', message='CAMPUS_VERIFIER_REQUIRED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',v.id,'organizationId',o.id,'organizationName',o.name,'requestKind',v.request_kind,
    'evidence',v.evidence,'status',v.status,'submittedAt',v.created_at
  ) order by v.created_at),'[]'::jsonb) into result
  from public.organization_verification_requests v join public.organizations o on o.id=v.organization_id
  where o.campus_id=target_campus_id and v.status in ('submitted','under_review');
  return result;
end;
$$;

create or replace function public.review_campus_organization_verification(
  target_request_id uuid, approve boolean, reviewer_notes text
)
returns public.verification_request_status language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); request_record public.organization_verification_requests%rowtype; target_campus_id uuid; next_status public.verification_request_status;
begin
  select v.* into request_record from public.organization_verification_requests v where v.id=target_request_id for update;
  select o.campus_id into target_campus_id from public.organizations o where o.id=request_record.organization_id;
  if request_record.id is null or not ruckus_private.has_campus_admin_role(target_campus_id,actor_id,array['organization_verifier','administrator']::public.campus_admin_role[]) then
    raise exception using errcode='42501', message='CAMPUS_VERIFIER_REQUIRED';
  end if;
  if request_record.status not in ('submitted','under_review') or char_length(trim(reviewer_notes)) not between 3 and 2000 then raise exception using errcode='22023', message='INVALID_VERIFICATION_REVIEW'; end if;
  next_status := case when approve then 'approved'::public.verification_request_status else 'rejected'::public.verification_request_status end;
  update public.organization_verification_requests set status=next_status, reviewed_by=actor_id, reviewed_at=now(), review_notes=trim(reviewer_notes), updated_at=now() where id=target_request_id;
  update public.organizations set is_verified=approve, updated_at=now() where id=request_record.organization_id;
  insert into public.campus_admin_audit_log(campus_id,actor_id,action,target_type,target_id,metadata) values(target_campus_id,actor_id,case when approve then 'organization_verified' else 'organization_verification_denied' end,'organization',request_record.organization_id,jsonb_build_object('requestId',target_request_id));
  insert into public.notification_jobs(profile_id,kind,deduplication_key,payload) values(request_record.requested_by,'organization_verification_outcome','organization-verification:'||target_request_id,jsonb_build_object('organizationId',request_record.organization_id,'status',next_status)) on conflict(deduplication_key) do nothing;
  return next_status;
end;
$$;

create or replace function public.revoke_campus_organization_verification(
  target_organization_id uuid, revocation_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); campus_id uuid;
begin
  select o.campus_id into campus_id from public.organizations o where o.id=target_organization_id;
  if not ruckus_private.has_campus_admin_role(campus_id,actor_id,array['organization_verifier','administrator']::public.campus_admin_role[]) or char_length(trim(revocation_reason)) not between 3 and 1000 then raise exception using errcode='42501',message='CAMPUS_VERIFIER_REQUIRED'; end if;
  update public.organizations set is_verified=false,updated_at=now() where id=target_organization_id;
  insert into public.campus_admin_audit_log(campus_id,actor_id,action,target_type,target_id,metadata) values(campus_id,actor_id,'organization_verification_revoked','organization',target_organization_id,jsonb_build_object('reason',trim(revocation_reason)));
end;
$$;

create or replace function public.create_campus_announcement(
  target_campus_id uuid, announcement_title text, announcement_body text,
  target_audience public.campus_announcement_audience, target_deep_link text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); announcement_id uuid;
begin
  if not ruckus_private.has_campus_admin_role(target_campus_id,actor_id,array['announcement_manager','administrator']::public.campus_admin_role[]) then raise exception using errcode='42501',message='ANNOUNCEMENT_MANAGER_REQUIRED'; end if;
  insert into public.campus_announcements(campus_id,author_id,title,body,audience,deep_link,status) values(target_campus_id,actor_id,trim(announcement_title),trim(announcement_body),target_audience,target_deep_link,'draft') returning id into announcement_id;
  insert into public.campus_admin_audit_log(campus_id,actor_id,action,target_type,target_id) values(target_campus_id,actor_id,'announcement_drafted','announcement',announcement_id);
  return announcement_id;
end;
$$;

create or replace function public.submit_campus_announcement_for_approval(target_announcement_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); announcement public.campus_announcements%rowtype;
begin
  update public.campus_announcements set status='pending_approval',updated_at=now() where id=target_announcement_id and author_id=actor_id and status='draft' returning * into announcement;
  if announcement.id is null then raise exception using errcode='42501',message='ANNOUNCEMENT_SUBMISSION_FORBIDDEN'; end if;
  insert into public.campus_admin_audit_log(campus_id,actor_id,action,target_type,target_id) values(announcement.campus_id,actor_id,'announcement_submitted','announcement',announcement.id);
end;
$$;

create or replace function public.approve_campus_announcement(
  target_announcement_id uuid, publish_at timestamptz, expire_at timestamptz, approve boolean
)
returns public.campus_announcement_status language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); announcement public.campus_announcements%rowtype; next_status public.campus_announcement_status;
begin
  select * into announcement from public.campus_announcements where id=target_announcement_id for update;
  if announcement.id is null or announcement.author_id=actor_id or not ruckus_private.has_campus_admin_role(announcement.campus_id,actor_id,array['announcement_manager','administrator']::public.campus_admin_role[]) then raise exception using errcode='42501',message='INDEPENDENT_ANNOUNCEMENT_APPROVER_REQUIRED'; end if;
  if announcement.status<>'pending_approval' then raise exception using errcode='22023',message='ANNOUNCEMENT_NOT_PENDING'; end if;
  if approve and (publish_at<now() or expire_at<=publish_at or expire_at>publish_at+interval '30 days') then raise exception using errcode='22023',message='INVALID_ANNOUNCEMENT_SCHEDULE'; end if;
  next_status := case when approve then 'scheduled'::public.campus_announcement_status else 'rejected'::public.campus_announcement_status end;
  update public.campus_announcements set status=next_status,approved_by=case when approve then actor_id else null end,approved_at=case when approve then now() else null end,scheduled_for=case when approve then publish_at else null end,expires_at=case when approve then expire_at else null end,updated_at=now() where id=target_announcement_id;
  insert into public.campus_admin_audit_log(campus_id,actor_id,action,target_type,target_id) values(announcement.campus_id,actor_id,case when approve then 'announcement_approved' else 'announcement_rejected' end,'announcement',announcement.id);
  return next_status;
end;
$$;

create or replace function public.publish_due_campus_announcements()
returns integer language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  update public.campus_announcements set status=case when expires_at<=now() then 'expired'::public.campus_announcement_status else 'published'::public.campus_announcement_status end,published_at=case when scheduled_for<=now() and expires_at>now() then coalesce(published_at,now()) else published_at end,updated_at=now() where status in ('scheduled','published') and (scheduled_for<=now() or expires_at<=now());
  get diagnostics affected=row_count; return affected;
end;
$$;

create or replace function public.get_campus_admin_audit_log(target_campus_id uuid,page_size integer default 50)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); result jsonb;
begin
  if page_size not between 1 and 100 or not ruckus_private.has_campus_admin_role(target_campus_id,actor_id,array['viewer','analyst','administrator']::public.campus_admin_role[]) then raise exception using errcode='42501',message='CAMPUS_AUDIT_ACCESS_DENIED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'action',action,'targetType',target_type,'targetId',target_id,'createdAt',created_at) order by created_at desc),'[]'::jsonb) into result from (select * from public.campus_admin_audit_log where campus_id=target_campus_id order by created_at desc limit page_size) a;
  return result;
end;
$$;

create or replace function public.escalate_campus_moderation_case(target_case_id uuid, escalation_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); campus_id uuid; escalation_id uuid;
begin
  select coalesce(e.campus_id,o.campus_id,p.campus_id) into campus_id from public.moderation_cases mc join public.reports r on r.id=mc.report_id left join public.events e on e.id=r.target_event_id left join public.organizations o on o.id=r.target_organization_id left join public.profiles p on p.id=r.target_user_id where mc.id=target_case_id;
  if campus_id is null or not ruckus_private.has_campus_admin_role(campus_id,actor_id,array['moderator','administrator']::public.campus_admin_role[]) or char_length(trim(escalation_reason)) not between 10 and 1000 then raise exception using errcode='42501',message='CAMPUS_MODERATOR_REQUIRED'; end if;
  insert into public.campus_safety_escalations(campus_id,moderation_case_id,escalated_by,reason) values(campus_id,target_case_id,actor_id,trim(escalation_reason)) on conflict(moderation_case_id) do update set reason=excluded.reason returning id into escalation_id;
  insert into public.campus_admin_audit_log(campus_id,actor_id,action,target_type,target_id) values(campus_id,actor_id,'moderation_escalated','moderation_case',target_case_id);
  return escalation_id;
end;
$$;

create or replace function public.export_campus_aggregate_csv(target_campus_id uuid,range_start date,range_end date)
returns text language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); csv text; rows_count integer;
begin
  if not ruckus_private.has_campus_admin_role(target_campus_id,actor_id,array['analyst','administrator']::public.campus_admin_role[]) or range_start>range_end or range_end>range_start+400 then raise exception using errcode='42501',message='CAMPUS_EXPORT_ACCESS_DENIED'; end if;
  select count(*)::integer into rows_count from public.event_analytics_daily d join public.events e on e.id=d.event_id where e.campus_id=target_campus_id and d.metric_date between range_start and range_end;
  select 'date,events,impressions,rsvps,checkins,no_shows,repeat_attendees'||chr(10)||coalesce(string_agg(metric_date||','||events||','||impressions||','||rsvps||','||checkins||','||no_shows||','||repeat_attendees,chr(10) order by metric_date),'') into csv from (select d.metric_date,count(distinct d.event_id) events,sum(d.feed_impressions) impressions,sum(d.confirmed_rsvps+d.pending_requests+d.waitlist_additions) rsvps,sum(d.checkins) checkins,sum(d.no_shows) no_shows,sum(d.repeat_attendees) repeat_attendees from public.event_analytics_daily d join public.events e on e.id=d.event_id where e.campus_id=target_campus_id and d.metric_date between range_start and range_end group by d.metric_date) x;
  insert into public.campus_admin_export_audit(campus_id,actor_id,range_start,range_end,row_count) values(target_campus_id,actor_id,range_start,range_end,rows_count);
  return csv;
end;
$$;

create trigger campus_announcements_set_updated_at
before update on public.campus_announcements
for each row execute function public.set_updated_at();

-- Campus administrators review announcements they manage. Drafts and rejected
-- items stay visible to the managing roles only; students never reach this path.
create or replace function public.list_campus_announcements(target_campus_id uuid, page_size integer default 50)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); result jsonb;
begin
  if page_size not between 1 and 100 or not ruckus_private.has_campus_admin_role(target_campus_id,actor_id,
    array['viewer','analyst','announcement_manager','administrator']::public.campus_admin_role[]) then
    raise exception using errcode='42501',message='CAMPUS_ANNOUNCEMENT_ACCESS_DENIED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'title',a.title,'body',a.body,'audience',a.audience,'status',a.status,
    'deepLink',a.deep_link,'authorId',a.author_id,'approvedBy',a.approved_by,
    'scheduledFor',a.scheduled_for,'expiresAt',a.expires_at,'publishedAt',a.published_at,
    'createdAt',a.created_at
  ) order by a.created_at desc),'[]'::jsonb) into result
  from (select * from public.campus_announcements where campus_id=target_campus_id order by created_at desc limit page_size) a;
  return result;
end;
$$;

-- Student-facing reader. Only published, unexpired announcements addressed to the
-- caller's own campus and audience are ever returned, and never author identity.
create or replace function public.get_campus_announcements()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); viewer public.profiles%rowtype; result jsonb;
begin
  select * into viewer from public.profiles where id=actor_id;
  if viewer.id is null or viewer.banned_at is not null or viewer.email_domain_verified_at is null then
    raise exception using errcode='42501',message='CAMPUS_MEMBER_REQUIRED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'title',a.title,'body',a.body,'audience',a.audience,
    'deepLink',a.deep_link,'publishedAt',a.published_at,'expiresAt',a.expires_at
  ) order by a.published_at desc),'[]'::jsonb) into result
  from public.campus_announcements a
  where a.campus_id=viewer.campus_id and a.status='published'
    and a.published_at is not null and a.published_at<=now()
    and (a.expires_at is null or a.expires_at>now())
    and (a.audience='all'
      or (a.audience='organizers' and viewer.role in ('host','admin'))
      or (a.audience='students' and viewer.role='student'));
  return result;
end;
$$;

create or replace function public.resolve_campus_safety_escalation(target_escalation_id uuid, resolution_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); escalation public.campus_safety_escalations%rowtype;
begin
  select * into escalation from public.campus_safety_escalations where id=target_escalation_id for update;
  if escalation.id is null or not ruckus_private.has_campus_admin_role(escalation.campus_id,actor_id,
    array['moderator','administrator']::public.campus_admin_role[])
    or char_length(trim(resolution_note)) not between 10 and 1000 then
    raise exception using errcode='42501',message='CAMPUS_MODERATOR_REQUIRED';
  end if;
  if escalation.resolved_at is not null then
    raise exception using errcode='22023',message='ESCALATION_ALREADY_RESOLVED';
  end if;
  update public.campus_safety_escalations set resolved_by=actor_id, resolved_at=now() where id=target_escalation_id;
  insert into public.campus_admin_audit_log(campus_id,actor_id,action,target_type,target_id,metadata)
  values(escalation.campus_id,actor_id,'moderation_escalation_resolved','moderation_case',
    escalation.moderation_case_id,jsonb_build_object('note',trim(resolution_note)));
end;
$$;

create or replace function public.get_campus_safety_escalations(target_campus_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); result jsonb;
begin
  if not ruckus_private.has_campus_admin_role(target_campus_id,actor_id,
    array['moderator','administrator']::public.campus_admin_role[]) then
    raise exception using errcode='42501',message='CAMPUS_MODERATOR_REQUIRED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'moderationCaseId',s.moderation_case_id,'reason',s.reason,
    'resolvedAt',s.resolved_at,'createdAt',s.created_at
  ) order by s.created_at desc),'[]'::jsonb) into result
  from public.campus_safety_escalations s where s.campus_id=target_campus_id;
  return result;
end;
$$;

do $$
declare signature text;
begin
  foreach signature in array array[
    'get_my_campus_admin_access()',
    'list_campus_announcements(uuid,integer)',
    'get_campus_announcements()',
    'resolve_campus_safety_escalation(uuid,text)',
    'get_campus_safety_escalations(uuid)',
    'assign_campus_admin_role(uuid,uuid,public.campus_admin_role)',
    'revoke_campus_admin_role(uuid)',
    'get_campus_admin_overview(uuid,date,date)',
    'get_campus_verification_queue(uuid)',
    'review_campus_organization_verification(uuid,boolean,text)',
    'revoke_campus_organization_verification(uuid,text)',
    'create_campus_announcement(uuid,text,text,public.campus_announcement_audience,text)',
    'submit_campus_announcement_for_approval(uuid)',
    'approve_campus_announcement(uuid,timestamptz,timestamptz,boolean)',
    'get_campus_admin_audit_log(uuid,integer)',
    'escalate_campus_moderation_case(uuid,text)',
    'export_campus_aggregate_csv(uuid,date,date)'
  ] loop execute 'revoke all on function public.'||signature||' from public, anon'; execute 'grant execute on function public.'||signature||' to authenticated'; end loop;
end;
$$;
revoke all on function public.publish_due_campus_announcements() from public,anon,authenticated;
grant execute on function public.publish_due_campus_announcements() to service_role;

