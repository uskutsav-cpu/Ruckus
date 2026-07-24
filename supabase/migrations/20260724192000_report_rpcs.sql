-- Reports are trusted inserts. Direct client inserts are revoked so target validation
-- cannot depend on nested RLS visibility.

drop policy if exists reports_submit_own on public.reports;
revoke insert on public.reports from authenticated;

create or replace function public.report_user(
  target_profile_id uuid,
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
  report_id uuid;
begin
  if actor_id is null
    or actor_id = target_profile_id
    or not exists (
      select 1
      from public.group_members as actor_member
      join public.group_members as target_member
        on target_member.group_id = actor_member.group_id
        and target_member.profile_id = target_profile_id
        and target_member.status = 'active'
      where actor_member.profile_id = actor_id
        and actor_member.status = 'active'
    )
  then
    raise exception using errcode = '42501', message = 'USER_REPORT_NOT_ALLOWED';
  end if;

  insert into public.reports (
    reporter_id,
    target_type,
    target_user_id,
    reason,
    details
  )
  values (
    actor_id,
    'user',
    target_profile_id,
    trim(report_reason),
    nullif(trim(coalesce(report_details, '')), '')
  )
  returning id into report_id;

  return report_id;
end;
$$;

create or replace function public.report_group(
  target_group_id uuid,
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
  report_id uuid;
begin
  if actor_id is null or not public.is_active_group_member(target_group_id) then
    raise exception using errcode = '42501', message = 'GROUP_REPORT_NOT_ALLOWED';
  end if;

  insert into public.reports (
    reporter_id,
    target_type,
    target_group_id,
    reason,
    details
  )
  values (
    actor_id,
    'group',
    target_group_id,
    trim(report_reason),
    nullif(trim(coalesce(report_details, '')), '')
  )
  returning id into report_id;

  return report_id;
end;
$$;

revoke all on function public.report_user(uuid, text, text) from public, anon;
revoke all on function public.report_group(uuid, text, text) from public, anon;
grant execute on function public.report_user(uuid, text, text) to authenticated;
grant execute on function public.report_group(uuid, text, text) to authenticated;
