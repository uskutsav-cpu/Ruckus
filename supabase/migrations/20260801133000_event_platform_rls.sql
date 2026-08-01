-- Explicit grants, row-level authorization, private Realtime topics, and Storage.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profile_preferences',
    'organizations',
    'organization_members',
    'organization_verification_requests',
    'organization_audit_log',
    'events',
    'event_hosts',
    'event_media',
    'tags',
    'event_tags',
    'event_discovery_decisions',
    'event_rsvps',
    'event_rsvp_status_history',
    'event_chat_members',
    'event_messages',
    'event_message_reactions',
    'event_announcements',
    'event_checkin_tokens',
    'event_checkins',
    'notification_jobs',
    'badge_definitions',
    'user_badges',
    'referral_codes',
    'referrals',
    'legal_acceptances',
    'data_export_requests',
    'partnership_leads',
    'moderation_cases',
    'moderation_actions'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;

revoke all on table public.public_event_pages from anon, authenticated;
revoke all on table public.public_organization_profiles from anon, authenticated;

-- Public-safe source columns for security-invoker shared-link views.
grant select (id, name, is_active) on public.campuses to anon;
grant select (
  id,
  campus_id,
  slug,
  name,
  description,
  logo_path,
  banner_path,
  website_url,
  social_links,
  is_verified,
  is_restricted
) on public.organizations to anon, authenticated;
grant select (
  id,
  campus_id,
  organization_id,
  created_by,
  slug,
  title,
  description,
  category,
  cover_image_path,
  starts_at,
  ends_at,
  timezone,
  venue_name,
  location_description,
  capacity,
  waitlist_enabled,
  approval_required,
  visibility,
  min_age,
  eligibility_requirements,
  accessibility_information,
  cost_information,
  cancellation_policy,
  safety_rules,
  status,
  published_at,
  cancelled_at,
  cancellation_reason,
  completed_at,
  attendee_list_visible,
  checkin_opens_at,
  checkin_closes_at,
  moderation_restricted,
  created_at,
  updated_at
) on public.events to anon, authenticated;
grant select on public.public_event_pages to anon, authenticated;
grant select on public.public_organization_profiles to anon, authenticated;

create policy campuses_public_name_read
on public.campuses for select
to anon
using (is_active);

create policy organizations_public_read
on public.organizations for select
to anon, authenticated
using (not is_restricted);

create policy organizations_member_history_read
on public.organizations for select
to authenticated
using (
  public.can_manage_organization(id)
  or exists (
    select 1 from public.organization_members
    where organization_id = organizations.id
      and profile_id = (select auth.uid())
  )
  or public.is_admin()
);

grant insert (
  campus_id,
  slug,
  name,
  description,
  logo_path,
  banner_path,
  contact_email,
  website_url,
  social_links,
  created_by
) on public.organizations to authenticated;
grant update (
  slug,
  name,
  description,
  logo_path,
  banner_path,
  contact_email,
  website_url,
  social_links
) on public.organizations to authenticated;

create policy organizations_create_own_campus
on public.organizations for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and not is_verified
  and not is_restricted
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and campus_id = organizations.campus_id
      and email_domain_verified_at is not null
      and onboarding_completed_at is not null
      and deletion_requested_at is null
  )
);

-- Public API wrappers call only these reviewed private implementations. The
-- private schema is not listed in PostgREST's exposed schemas.
revoke execute on all functions in schema ruckus_private from public, anon, authenticated;
revoke all on schema ruckus_private from public, anon, authenticated;
grant usage on schema ruckus_private to anon, authenticated;
grant execute on function ruckus_private.get_event_feed(
  text, text, timestamptz, timestamptz, integer, timestamptz, uuid, integer
) to anon, authenticated;
grant execute on function ruckus_private.get_event_detail(uuid) to anon, authenticated;
grant execute on function ruckus_private.get_event_messages(uuid, timestamptz, uuid, integer)
to authenticated;
grant execute on function ruckus_private.is_event_host(uuid, uuid) to authenticated;
grant execute on function ruckus_private.is_event_moderator(uuid, uuid) to authenticated;
grant execute on function ruckus_private.can_manage_organization(uuid, uuid) to authenticated;
grant execute on function ruckus_private.can_access_event_chat(uuid, uuid) to authenticated;
grant execute on function ruckus_private.join_event(uuid, uuid) to authenticated;
grant execute on function ruckus_private.cancel_event_rsvp(uuid, text) to authenticated;
grant execute on function ruckus_private.review_event_rsvp(uuid, boolean, text) to authenticated;
grant execute on function ruckus_private.publish_event(uuid) to authenticated;
grant execute on function ruckus_private.cancel_event(uuid, text) to authenticated;
grant execute on function ruckus_private.create_event_checkin_token_digest(uuid, text, integer)
to authenticated;
grant execute on function ruckus_private.redeem_event_checkin_token_digest(text)
to authenticated;

-- Revoke default function execution and explicitly restore the reviewed client API.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_event_feed(
  text, text, timestamptz, timestamptz, integer, timestamptz, uuid, integer
) to anon, authenticated;
grant execute on function public.get_event_detail(uuid) to anon, authenticated;
grant execute on function public.get_event_messages(uuid, timestamptz, uuid, integer)
to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_group_member(uuid) to authenticated;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.is_event_host(uuid) to authenticated;
grant execute on function public.is_event_moderator(uuid) to authenticated;
grant execute on function public.can_manage_organization(uuid) to authenticated;
grant execute on function public.can_access_event_chat(uuid) to authenticated;
grant execute on function public.join_event(uuid, uuid) to authenticated;
grant execute on function public.cancel_event_rsvp(uuid, text) to authenticated;
grant execute on function public.review_event_rsvp(uuid, boolean, text) to authenticated;
grant execute on function public.publish_event(uuid) to authenticated;
grant execute on function public.cancel_event(uuid, text) to authenticated;
grant execute on function public.create_event_checkin_token_digest(uuid, text, integer)
to authenticated;
grant execute on function public.redeem_event_checkin_token_digest(text) to authenticated;
grant execute on function public.record_activity_pass(uuid) to authenticated;
grant execute on function public.process_swipe_and_match(uuid) to authenticated;
grant execute on function public.get_group_lobby(uuid) to authenticated;
grant execute on function public.confirm_attendance(uuid) to authenticated;
grant execute on function public.leave_group(uuid, boolean) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.report_message(uuid, text, text) to authenticated;
grant execute on function public.report_user(uuid, text, text) to authenticated;
grant execute on function public.report_group(uuid, text, text) to authenticated;
grant execute on function public.submit_event_rating(uuid, smallint, text) to authenticated;
grant execute on function public.get_xp_total(uuid) to authenticated;
grant execute on function public.get_leaderboard(text) to authenticated;
grant execute on function public.register_push_token(text, public.notification_platform, text)
to authenticated;
grant execute on function public.set_notification_preferences(boolean, boolean, boolean)
to authenticated;
grant execute on function public.attest_age_and_safety() to authenticated;
grant execute on function public.complete_onboarding(text, smallint, text, uuid[])
to authenticated;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.create_checkin_token_digest(uuid, text, integer)
to authenticated;
grant execute on function public.redeem_checkin_token_digest(text) to authenticated;
grant execute on function public.finalize_group_attendance(uuid) to authenticated;

alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges in schema ruckus_private
  revoke execute on functions from public, anon, authenticated;

-- Private Broadcast/Presence channels use exact topics of the form event UUID.
create policy realtime_event_members_read
on realtime.messages for select
to authenticated
using (
  (select realtime.topic()) ~ '^event:[0-9a-f-]{36}$'
  and public.can_access_event_chat(
    replace((select realtime.topic()), 'event:', '')::uuid
  )
);

create policy realtime_event_members_write
on realtime.messages for insert
to authenticated
with check (
  (select realtime.topic()) ~ '^event:[0-9a-f-]{36}$'
  and public.can_access_event_chat(
    replace((select realtime.topic()), 'event:', '')::uuid
  )
);

create policy organizations_managers_update
on public.organizations for update
to authenticated
using (public.can_manage_organization(id))
with check (public.can_manage_organization(id));

grant select on public.organization_members to authenticated;
create policy organization_members_read_self_or_manager
on public.organization_members for select
to authenticated
using (
  profile_id = (select auth.uid())
  or public.can_manage_organization(organization_id)
);

grant select, insert on public.organization_verification_requests to authenticated;
create policy organization_verification_read_authorized
on public.organization_verification_requests for select
to authenticated
using (
  requested_by = (select auth.uid())
  or public.can_manage_organization(organization_id)
  or public.is_admin()
);
create policy organization_verification_submit_manager
on public.organization_verification_requests for insert
to authenticated
with check (
  requested_by = (select auth.uid())
  and status = 'submitted'
  and reviewed_by is null
  and reviewed_at is null
  and public.can_manage_organization(organization_id)
);

grant select on public.organization_audit_log to authenticated;
create policy organization_audit_read_managers
on public.organization_audit_log for select
to authenticated
using (public.can_manage_organization(organization_id) or public.is_admin());

-- Events are created as drafts. Lifecycle changes use trusted RPCs.
grant insert (
  campus_id,
  organization_id,
  created_by,
  slug,
  title,
  description,
  category,
  cover_image_path,
  starts_at,
  ends_at,
  timezone,
  venue_name,
  location_description,
  latitude,
  longitude,
  reveal_coordinates_after_confirmation,
  capacity,
  waitlist_enabled,
  approval_required,
  visibility,
  min_age,
  eligibility_requirements,
  accessibility_information,
  cost_information,
  cancellation_policy,
  safety_rules,
  status,
  attendee_list_visible,
  checkin_opens_at,
  checkin_closes_at
) on public.events to authenticated;
grant update (
  slug,
  title,
  description,
  category,
  cover_image_path,
  starts_at,
  ends_at,
  timezone,
  venue_name,
  location_description,
  latitude,
  longitude,
  reveal_coordinates_after_confirmation,
  capacity,
  waitlist_enabled,
  approval_required,
  visibility,
  min_age,
  eligibility_requirements,
  accessibility_information,
  cost_information,
  cancellation_policy,
  safety_rules,
  attendee_list_visible,
  checkin_opens_at,
  checkin_closes_at
) on public.events to authenticated;

create policy events_public_read
on public.events for select
to anon, authenticated
using (
  visibility = 'public'
  and status in ('published', 'cancelled', 'completed')
  and not moderation_restricted
);

create policy events_authenticated_authorized_read
on public.events for select
to authenticated
using (
  public.is_event_host(id)
  or (
    status in ('published', 'cancelled', 'completed')
    and not moderation_restricted
    and (
      visibility = 'public'
      or (
        visibility = 'campus'
        and exists (
          select 1 from public.profiles
          where id = (select auth.uid()) and campus_id = events.campus_id
        )
      )
      or exists (
        select 1 from public.event_rsvps
        where event_id = events.id and profile_id = (select auth.uid())
      )
    )
  )
);

create policy events_create_draft
on public.events for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and status = 'draft'
  and published_at is null
  and cancelled_at is null
  and completed_at is null
  and not moderation_restricted
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and campus_id = events.campus_id
  )
);

create policy events_hosts_update
on public.events for update
to authenticated
using (public.is_event_host(id) and status in ('draft', 'published'))
with check (public.is_event_host(id) and status in ('draft', 'published'));

grant select on public.event_hosts to authenticated;
create policy event_hosts_read_visible_event
on public.event_hosts for select
to authenticated
using (
  profile_id = (select auth.uid())
  or public.is_event_host(event_id)
  or exists (
    select 1 from public.events
    where id = event_hosts.event_id
      and status = 'published'
      and not moderation_restricted
      and (
        visibility = 'public'
        or exists (
          select 1 from public.profiles
          where id = (select auth.uid()) and campus_id = events.campus_id
        )
      )
  )
);

grant select, insert, update, delete on public.event_media to authenticated;
create policy event_media_read_visible_event
on public.event_media for select
to authenticated
using (
  public.is_event_host(event_id)
  or exists (
    select 1 from public.events
    where id = event_media.event_id
      and status in ('published', 'cancelled', 'completed')
      and not moderation_restricted
      and (
        visibility = 'public'
        or exists (
          select 1 from public.profiles
          where id = (select auth.uid()) and campus_id = events.campus_id
        )
      )
  )
);
create policy event_media_hosts_insert
on public.event_media for insert
to authenticated
with check (created_by = (select auth.uid()) and public.is_event_host(event_id));
create policy event_media_hosts_update
on public.event_media for update
to authenticated
using (public.is_event_host(event_id))
with check (public.is_event_host(event_id));
create policy event_media_hosts_delete
on public.event_media for delete
to authenticated
using (public.is_event_host(event_id));

grant select on public.tags to authenticated;
create policy tags_read_authenticated
on public.tags for select
to authenticated
using (
  campus_id is null
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and campus_id = tags.campus_id
  )
);

grant select, insert, delete on public.event_tags to authenticated;
create policy event_tags_read_visible
on public.event_tags for select
to authenticated
using (
  public.is_event_host(event_id)
  or exists (select 1 from public.events where id = event_tags.event_id and status = 'published')
);
create policy event_tags_host_insert
on public.event_tags for insert
to authenticated
with check (public.is_event_host(event_id));
create policy event_tags_host_delete
on public.event_tags for delete
to authenticated
using (public.is_event_host(event_id));

grant select, insert, update, delete on public.event_discovery_decisions to authenticated;
create policy event_decisions_own_all
on public.event_discovery_decisions for all
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

grant select on public.event_rsvps to authenticated;
create policy event_rsvps_read_own_or_host
on public.event_rsvps for select
to authenticated
using (profile_id = (select auth.uid()) or public.is_event_host(event_id));

grant select on public.event_rsvp_status_history to authenticated;
create policy event_rsvp_history_read_own_or_host
on public.event_rsvp_status_history for select
to authenticated
using (profile_id = (select auth.uid()) or public.is_event_host(event_id));

grant select on public.event_chat_members to authenticated;
grant update (last_read_at, notifications_muted) on public.event_chat_members to authenticated;
create policy event_chat_members_read_own_or_host
on public.event_chat_members for select
to authenticated
using (profile_id = (select auth.uid()) or public.is_event_host(event_id));
create policy event_chat_members_update_own
on public.event_chat_members for update
to authenticated
using (profile_id = (select auth.uid()) and public.can_access_event_chat(event_id))
with check (profile_id = (select auth.uid()) and public.can_access_event_chat(event_id));

-- Message history is returned through get_event_messages so removed bodies are redacted.
grant insert (
  event_id,
  sender_id,
  kind,
  body,
  reply_to_id,
  client_id
) on public.event_messages to authenticated;
create policy event_messages_insert_authorized
on public.event_messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and kind in ('text', 'announcement')
  and public.can_access_event_chat(event_id)
);

grant select, insert, delete on public.event_message_reactions to authenticated;
create policy event_reactions_read_chat
on public.event_message_reactions for select
to authenticated
using (
  exists (
    select 1 from public.event_messages
    where id = event_message_reactions.message_id
      and public.can_access_event_chat(event_id)
  )
);
create policy event_reactions_insert_own
on public.event_message_reactions for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1 from public.event_messages
    where id = event_message_reactions.message_id
      and public.can_access_event_chat(event_id)
  )
);
create policy event_reactions_delete_own
on public.event_message_reactions for delete
to authenticated
using (profile_id = (select auth.uid()));

grant select on public.event_announcements to authenticated;
create policy event_announcements_read_members
on public.event_announcements for select
to authenticated
using (public.can_access_event_chat(event_id));

-- Token digests are never directly readable.
grant select on public.event_checkins to authenticated;
create policy event_checkins_read_own_or_host
on public.event_checkins for select
to authenticated
using (profile_id = (select auth.uid()) or public.is_event_host(event_id));

grant select, update on public.profile_preferences to authenticated;
create policy profile_preferences_read_own
on public.profile_preferences for select
to authenticated
using (profile_id = (select auth.uid()));
create policy profile_preferences_update_own
on public.profile_preferences for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

grant select on public.badge_definitions to authenticated;
create policy badge_definitions_read_active
on public.badge_definitions for select
to authenticated
using (is_active);
grant select on public.user_badges to authenticated;
create policy user_badges_read_own
on public.user_badges for select
to authenticated
using (profile_id = (select auth.uid()));

grant select on public.referral_codes to authenticated;
create policy referral_codes_read_own
on public.referral_codes for select
to authenticated
using (
  owner_profile_id = (select auth.uid())
  or (
    organization_id is not null
    and public.can_manage_organization(organization_id)
  )
);
grant select on public.referrals to authenticated;
create policy referrals_read_referred_or_owner
on public.referrals for select
to authenticated
using (
  referred_profile_id = (select auth.uid())
  or exists (
    select 1 from public.referral_codes
    where id = referrals.referral_code_id
      and (
        owner_profile_id = (select auth.uid())
        or (
          organization_id is not null
          and public.can_manage_organization(organization_id)
        )
      )
  )
);

grant select, insert on public.legal_acceptances to authenticated;
create policy legal_acceptances_read_own
on public.legal_acceptances for select
to authenticated
using (profile_id = (select auth.uid()));
create policy legal_acceptances_insert_own
on public.legal_acceptances for insert
to authenticated
with check (profile_id = (select auth.uid()));

grant select, insert on public.data_export_requests to authenticated;
create policy data_export_requests_read_own
on public.data_export_requests for select
to authenticated
using (profile_id = (select auth.uid()));
create policy data_export_requests_insert_own
on public.data_export_requests for insert
to authenticated
with check (profile_id = (select auth.uid()) and status = 'requested');

-- Partnership leads are accepted only by the validated public Edge Function.
-- Moderation and notification queues are service/admin surfaces.
grant select, update on public.moderation_cases to authenticated;
create policy moderation_cases_admin_read
on public.moderation_cases for select
to authenticated
using (public.is_admin());
create policy moderation_cases_admin_update
on public.moderation_cases for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
grant select on public.moderation_actions to authenticated;
create policy moderation_actions_admin_read
on public.moderation_actions for select
to authenticated
using (public.is_admin());

create policy reports_read_own
on public.reports for select
to authenticated
using (reporter_id = (select auth.uid()));

create policy reports_submit_event_or_organization
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
      target_type = 'event'
      and exists (
        select 1 from public.events
        where id = target_event_id
          and (
            status = 'published'
            or public.is_event_host(id)
            or exists (
              select 1 from public.event_rsvps
              where event_id = events.id and profile_id = (select auth.uid())
            )
          )
      )
    )
    or (
      target_type = 'organization'
      and exists (
        select 1 from public.organizations where id = target_organization_id
      )
    )
  )
);

-- Private media buckets. The first path segment must be the owning UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'event-media',
    'event-media',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'organization-media',
    'organization-media',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy event_media_storage_read
on storage.objects for select
to authenticated
using (
  bucket_id = 'event-media'
  and (
    public.is_event_host(
      case
        when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        then (storage.foldername(name))[1]::uuid
        else null
      end
    )
    or exists (
      select 1 from public.events
      where id = case
        when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        then (storage.foldername(name))[1]::uuid
        else null
      end
        and status = 'published'
        and not moderation_restricted
    )
  )
);

create policy event_media_storage_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'event-media'
  and public.is_event_host(
    case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end
  )
);

create policy event_media_storage_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'event-media'
  and public.is_event_host(
    case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end
  )
)
with check (
  bucket_id = 'event-media'
  and public.is_event_host(
    case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end
  )
);

create policy event_media_storage_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'event-media'
  and public.is_event_host(
    case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end
  )
);

create policy organization_media_storage_read
on storage.objects for select
to authenticated
using (
  bucket_id = 'organization-media'
  and exists (
    select 1 from public.organizations
    where id = case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end
      and not is_restricted
  )
);

create policy organization_media_storage_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'organization-media'
  and public.can_manage_organization(
    case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end
  )
);

create policy organization_media_storage_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'organization-media'
  and public.can_manage_organization(
    case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end
  )
)
with check (
  bucket_id = 'organization-media'
  and public.can_manage_organization(
    case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end
  )
);

create policy organization_media_storage_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'organization-media'
  and public.can_manage_organization(
    case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end
  )
);
