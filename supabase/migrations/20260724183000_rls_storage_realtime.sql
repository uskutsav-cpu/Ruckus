-- Least-privilege grants, RLS policies, Storage access, and Realtime authorization.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'campuses',
    'profiles',
    'interests',
    'profile_interests',
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
    'xp_ledger',
    'blocks',
    'reports',
    'admin_actions',
    'event_ratings'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;

revoke all on table public.activity_feed from anon, authenticated;

-- Safe direct reads and narrowly scoped writes.
grant select on public.campuses to authenticated;
grant select on public.profiles to authenticated;
grant update (
  display_name,
  avatar_path,
  bio,
  graduation_year,
  age_attested,
  age_attested_at,
  safety_acknowledged_at,
  onboarding_completed_at
) on public.profiles to authenticated;
grant select on public.interests to authenticated;
grant select, insert, delete on public.profile_interests to authenticated;
grant select on public.activity_templates to authenticated;
grant select (
  id,
  activity_template_id,
  campus_id,
  starts_at,
  ends_at,
  swipe_closes_at,
  capacity,
  status,
  checkin_opens_at,
  checkin_closes_at,
  created_at,
  updated_at
) on public.activity_sessions to authenticated;
grant select on public.activity_feed to authenticated;
grant select on public.swipes to authenticated;
grant select on public.waitlist_entries to authenticated;
grant select on public.groups to authenticated;
grant select on public.group_members to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.attendance_confirmations to authenticated;
grant select on public.checkins to authenticated;
grant select, delete on public.push_tokens to authenticated;
grant select on public.xp_ledger to authenticated;
grant select, delete on public.blocks to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select on public.admin_actions to authenticated;
grant select on public.event_ratings to authenticated;

create policy campuses_read_launch_campus
on public.campuses for select
to authenticated
using (
  is_active
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and campus_id = campuses.id
  )
);

create policy profiles_read_own
on public.profiles for select
to authenticated
using (id = (select auth.uid()));

create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = (select auth.uid()) and deletion_requested_at is null)
with check (id = (select auth.uid()) and deletion_requested_at is null);

create policy interests_read_same_campus
on public.interests for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and campus_id = interests.campus_id
  )
);

create policy profile_interests_read_own
on public.profile_interests for select
to authenticated
using (profile_id = (select auth.uid()));

create policy profile_interests_insert_own
on public.profile_interests for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1
    from public.interests
    join public.profiles on profiles.id = profile_id
    where interests.id = interest_id
      and interests.campus_id = profiles.campus_id
  )
);

create policy profile_interests_delete_own
on public.profile_interests for delete
to authenticated
using (profile_id = (select auth.uid()));

create policy activity_templates_read_same_campus
on public.activity_templates for select
to authenticated
using (
  is_active
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and campus_id = activity_templates.campus_id
      and onboarding_completed_at is not null
  )
);

create policy activity_sessions_read_safe_columns_same_campus
on public.activity_sessions for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and campus_id = activity_sessions.campus_id
      and onboarding_completed_at is not null
  )
);

create policy swipes_read_own
on public.swipes for select
to authenticated
using (profile_id = (select auth.uid()));

create policy waitlist_read_own
on public.waitlist_entries for select
to authenticated
using (profile_id = (select auth.uid()));

create policy groups_read_members_only
on public.groups for select
to authenticated
using (public.is_active_group_member(id) or public.is_admin());

create policy group_members_read_shared_group
on public.group_members for select
to authenticated
using (public.is_active_group_member(group_id) or public.is_admin());

create policy messages_read_group_members
on public.messages for select
to authenticated
using (public.is_active_group_member(group_id) or public.is_admin());

create policy messages_insert_group_members
on public.messages for insert
to authenticated
with check (
  kind = 'text'
  and sender_id = (select auth.uid())
  and public.is_active_group_member(group_id)
);

create policy confirmations_read_own
on public.attendance_confirmations for select
to authenticated
using (profile_id = (select auth.uid()) or public.is_admin());

-- No authenticated policy exists for checkin_tokens: token digests are server-only.

create policy checkins_read_own
on public.checkins for select
to authenticated
using (profile_id = (select auth.uid()) or public.is_admin());

create policy push_tokens_read_own
on public.push_tokens for select
to authenticated
using (profile_id = (select auth.uid()));

create policy push_tokens_delete_own
on public.push_tokens for delete
to authenticated
using (profile_id = (select auth.uid()));

create policy xp_ledger_read_own
on public.xp_ledger for select
to authenticated
using (profile_id = (select auth.uid()) or public.is_admin());

create policy blocks_read_own
on public.blocks for select
to authenticated
using (blocker_id = (select auth.uid()));

create policy blocks_delete_own
on public.blocks for delete
to authenticated
using (blocker_id = (select auth.uid()));

create policy reports_submit_own
on public.reports for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and status = 'submitted'
  and reviewed_by is null
  and reviewed_at is null
  and resolution_notes is null
  and (
    (
      target_type = 'user'
      and target_user_id <> (select auth.uid())
      and exists (select 1 from public.profiles where id = target_user_id)
    )
    or (
      target_type = 'message'
      and exists (
        select 1 from public.messages
        where id = target_message_id
          and public.is_active_group_member(group_id)
      )
    )
    or (
      target_type = 'group'
      and public.is_active_group_member(target_group_id)
    )
  )
);

create policy reports_admin_read
on public.reports for select
to authenticated
using (public.is_admin());

create policy reports_admin_update
on public.reports for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy admin_actions_admin_read
on public.admin_actions for select
to authenticated
using (public.is_admin());

create policy event_ratings_read_own
on public.event_ratings for select
to authenticated
using (profile_id = (select auth.uid()) or public.is_admin());

-- Functions are non-callable by default; expose only the mobile RPC surface and
-- the helpers needed by RLS evaluation.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_group_member(uuid) to authenticated;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.record_activity_pass(uuid) to authenticated;
grant execute on function public.process_swipe_and_match(uuid) to authenticated;
grant execute on function public.get_group_lobby(uuid) to authenticated;
grant execute on function public.confirm_attendance(uuid) to authenticated;
grant execute on function public.leave_group(uuid, boolean) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.report_message(uuid, text, text) to authenticated;
grant execute on function public.submit_event_rating(uuid, smallint, text) to authenticated;
grant execute on function public.get_xp_total(uuid) to authenticated;
grant execute on function public.get_leaderboard(text) to authenticated;
grant execute on function public.register_push_token(
  text,
  public.notification_platform,
  text
) to authenticated;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.create_checkin_token_digest(uuid, text, integer)
to authenticated;
grant execute on function public.redeem_checkin_token_digest(text) to authenticated;
grant execute on function public.finalize_group_attendance(uuid) to authenticated;

-- Private Storage buckets. Activity art requires a session; avatar writes are
-- namespaced by the authenticated user's UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'activity-images',
    'activity-images',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'avatars',
    'avatars',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy activity_images_authenticated_read
on storage.objects for select
to authenticated
using (
  bucket_id = 'activity-images'
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and email_domain_verified_at is not null
      and deletion_requested_at is null
  )
);

create policy activity_images_admin_write
on storage.objects for insert
to authenticated
with check (bucket_id = 'activity-images' and public.is_admin());

create policy activity_images_admin_update
on storage.objects for update
to authenticated
using (bucket_id = 'activity-images' and public.is_admin())
with check (bucket_id = 'activity-images' and public.is_admin());

create policy activity_images_admin_delete
on storage.objects for delete
to authenticated
using (bucket_id = 'activity-images' and public.is_admin());

create policy avatars_same_campus_read
on storage.objects for select
to authenticated
using (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.profiles as viewer
    join public.profiles as owner
      on owner.id::text = (storage.foldername(name))[1]
      and owner.campus_id = viewer.campus_id
    where viewer.id = (select auth.uid())
      and not public.is_blocked_between(viewer.id, owner.id)
  )
);

create policy avatars_owner_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy avatars_owner_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy avatars_owner_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

alter table public.messages replica identity full;
alter table public.groups replica identity full;
alter table public.group_members replica identity full;
alter table public.attendance_confirmations replica identity full;

alter publication supabase_realtime add table
  public.messages,
  public.groups,
  public.group_members,
  public.attendance_confirmations;

-- Authorized private Broadcast/Presence channels use topics `group:<uuid>`.
create policy realtime_group_members_read
on realtime.messages for select
to authenticated
using (
  exists (
    select 1
    from public.group_members
    where profile_id = (select auth.uid())
      and status = 'active'
      and 'group:' || group_id::text = (select realtime.topic())
  )
);

create policy realtime_group_members_write
on realtime.messages for insert
to authenticated
with check (
  exists (
    select 1
    from public.group_members
    where profile_id = (select auth.uid())
      and status = 'active'
      and 'group:' || group_id::text = (select realtime.topic())
  )
);
