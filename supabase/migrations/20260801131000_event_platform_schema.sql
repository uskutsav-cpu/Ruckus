-- Event-first product model. This migration is additive so deployed crew-matching
-- installations can upgrade without rewriting their historical migrations.

create schema if not exists ruckus_private;
revoke all on schema ruckus_private from public, anon, authenticated;

alter table public.profiles
  add column username text,
  add column trust_level smallint not null default 0,
  add column suspended_until timestamptz,
  add column banned_at timestamptz;

create unique index profiles_username_idx
  on public.profiles(lower(username))
  where username is not null;

alter table public.profiles
  add constraint profiles_username_format check (
    username is null or username ~ '^[a-z0-9_]{3,24}$'
  ),
  add constraint profiles_trust_level check (trust_level between 0 and 5);

alter table public.reports
  add column target_event_id uuid,
  add column target_organization_id uuid;

alter table public.reports drop constraint reports_exact_target;

create type public.organization_role as enum (
  'owner',
  'admin',
  'event_manager',
  'moderator',
  'viewer'
);
create type public.organization_membership_status as enum (
  'invited',
  'active',
  'removed'
);
create type public.verification_request_status as enum (
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'withdrawn'
);
create type public.event_status as enum (
  'draft',
  'published',
  'cancelled',
  'completed',
  'archived',
  'removed'
);
create type public.event_visibility as enum ('campus', 'public', 'private');
create type public.event_host_role as enum ('owner', 'cohost', 'checkin');
create type public.rsvp_status as enum (
  'confirmed',
  'waitlisted',
  'pending',
  'rejected',
  'cancelled'
);
create type public.event_decision as enum ('passed', 'saved');
create type public.event_message_kind as enum ('text', 'system', 'announcement');
create type public.notification_job_status as enum (
  'pending',
  'processing',
  'sent',
  'failed',
  'cancelled'
);
create type public.moderation_case_status as enum (
  'open',
  'under_review',
  'resolved',
  'dismissed'
);
create type public.moderation_action_kind as enum (
  'warn_user',
  'suspend_user',
  'ban_user',
  'remove_content',
  'restrict_organization',
  'cancel_event',
  'restore_content'
);
create type public.referral_code_kind as enum ('user', 'ambassador', 'organization');
create type public.referral_status as enum ('attributed', 'qualified', 'rewarded', 'rejected');
create type public.data_request_status as enum (
  'requested',
  'processing',
  'ready',
  'expired',
  'cancelled'
);
create type public.partnership_lead_status as enum (
  'submitted',
  'reviewing',
  'contacted',
  'closed',
  'spam'
);

create table public.profile_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  leaderboard_visible boolean not null default true,
  show_attended_history boolean not null default false,
  show_hosted_history boolean not null default true,
  event_reminders boolean not null default true,
  chat_notifications boolean not null default true,
  announcement_notifications boolean not null default true,
  notification_previews boolean not null default false,
  reduced_motion boolean not null default false,
  accessibility_notes text,
  discovery_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_preferences_accessibility_length check (
    accessibility_notes is null or char_length(accessibility_notes) <= 500
  ),
  constraint profile_preferences_discovery_object check (
    jsonb_typeof(discovery_preferences) = 'object'
    and pg_column_size(discovery_preferences) <= 4096
  )
);

create table public.organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete restrict,
  slug text not null unique,
  name text not null,
  description text not null default '',
  logo_path text,
  banner_path text,
  contact_email text,
  website_url text,
  social_links jsonb not null default '{}'::jsonb,
  is_verified boolean not null default false,
  is_restricted boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_slug_length check (char_length(slug) between 3 and 60),
  constraint organizations_name_length check (char_length(name) between 2 and 120),
  constraint organizations_description_length check (char_length(description) <= 2000),
  constraint organizations_social_links_object check (
    jsonb_typeof(social_links) = 'object' and pg_column_size(social_links) <= 4096
  )
);

create table public.organization_members (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_role not null,
  status public.organization_membership_status not null default 'invited',
  invited_by uuid references public.profiles(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id),
  constraint organization_members_status_dates check (
    (status = 'invited' and accepted_at is null and removed_at is null)
    or (status = 'active' and accepted_at is not null and removed_at is null)
    or (status = 'removed' and removed_at is not null)
  )
);

create table public.organization_verification_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  request_kind text not null default 'verification',
  evidence jsonb not null default '{}'::jsonb,
  status public.verification_request_status not null default 'submitted',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_verification_kind check (
    request_kind in ('verification', 'claim')
  ),
  constraint organization_verification_evidence check (
    jsonb_typeof(evidence) = 'object' and pg_column_size(evidence) <= 8192
  ),
  constraint organization_verification_notes_length check (
    review_notes is null or char_length(review_notes) <= 2000
  )
);

create unique index organization_verification_open_idx
  on public.organization_verification_requests(organization_id, request_kind)
  where status in ('submitted', 'under_review');

create table public.organization_audit_log (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint organization_audit_action_length check (char_length(action) between 3 and 100),
  constraint organization_audit_metadata check (
    jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 8192
  )
);

create table public.events (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  slug text not null unique,
  title text not null,
  description text not null,
  category text not null,
  cover_image_path text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null,
  venue_name text not null,
  location_description text not null default '',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  reveal_coordinates_after_confirmation boolean not null default true,
  capacity integer not null,
  waitlist_enabled boolean not null default true,
  approval_required boolean not null default false,
  visibility public.event_visibility not null default 'campus',
  min_age smallint not null default 18,
  eligibility_requirements text,
  accessibility_information text,
  cost_information text,
  cancellation_policy text,
  safety_rules text,
  status public.event_status not null default 'draft',
  published_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  completed_at timestamptz,
  archived_at timestamptz,
  attendee_list_visible boolean not null default false,
  checkin_opens_at timestamptz,
  checkin_closes_at timestamptz,
  waitlist_sequence bigint not null default 0,
  moderation_restricted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint events_slug_length check (char_length(slug) between 5 and 100),
  constraint events_title_length check (char_length(title) between 3 and 120),
  constraint events_description_length check (char_length(description) between 10 and 5000),
  constraint events_category_length check (char_length(category) between 2 and 60),
  constraint events_time_order check (starts_at < ends_at),
  constraint events_duration_limit check (ends_at <= starts_at + interval '7 days'),
  constraint events_capacity check (capacity between 1 and 100000),
  constraint events_age check (min_age between 18 and 100),
  constraint events_coordinates_pair check (
    (latitude is null and longitude is null)
    or (latitude between -90 and 90 and longitude between -180 and 180)
  ),
  constraint events_text_limits check (
    char_length(venue_name) between 2 and 200
    and char_length(location_description) <= 1000
    and (eligibility_requirements is null or char_length(eligibility_requirements) <= 1000)
    and (accessibility_information is null or char_length(accessibility_information) <= 2000)
    and (cost_information is null or char_length(cost_information) <= 500)
    and (cancellation_policy is null or char_length(cancellation_policy) <= 2000)
    and (safety_rules is null or char_length(safety_rules) <= 2000)
    and (cancellation_reason is null or char_length(cancellation_reason) <= 1000)
  ),
  constraint events_lifecycle_dates check (
    (status <> 'published' or published_at is not null)
    and (status <> 'cancelled' or cancelled_at is not null)
    and (status <> 'completed' or completed_at is not null)
    and (status <> 'archived' or archived_at is not null)
  ),
  constraint events_checkin_order check (
    (checkin_opens_at is null and checkin_closes_at is null)
    or (
      checkin_opens_at is not null
      and checkin_closes_at is not null
      and checkin_opens_at < checkin_closes_at
    )
  )
);

alter table public.reports
  add constraint reports_target_event_fk
    foreign key (target_event_id) references public.events(id) on delete set null,
  add constraint reports_target_organization_fk
    foreign key (target_organization_id) references public.organizations(id) on delete set null,
  add constraint reports_exact_target check (
    num_nonnulls(
      target_user_id,
      target_message_id,
      target_group_id,
      target_event_id,
      target_organization_id
    ) = 1
    and (
      (target_type = 'user' and target_user_id is not null)
      or (target_type = 'message' and target_message_id is not null)
      or (target_type = 'group' and target_group_id is not null)
      or (target_type = 'event' and target_event_id is not null)
      or (target_type = 'organization' and target_organization_id is not null)
    )
  );

create table public.event_hosts (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.event_host_role not null default 'cohost',
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, profile_id)
);

create unique index event_hosts_one_owner_idx
  on public.event_hosts(event_id)
  where role = 'owner';

create table public.event_media (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  storage_path text not null,
  alt_text text not null,
  sort_order smallint not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, storage_path),
  constraint event_media_alt_length check (char_length(alt_text) between 3 and 300),
  constraint event_media_sort_order check (sort_order between 0 and 20)
);

create table public.tags (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid references public.campuses(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (campus_id, slug),
  constraint tags_name_length check (char_length(name) between 2 and 40),
  constraint tags_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.event_tags (
  event_id uuid not null references public.events(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, tag_id)
);

create table public.event_discovery_decisions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  decision public.event_decision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, event_id)
);

create table public.event_rsvps (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.rsvp_status not null,
  waitlist_position bigint,
  status_reason text,
  joined_at timestamptz not null default now(),
  responded_at timestamptz,
  cancelled_at timestamptz,
  promoted_at timestamptz,
  idempotency_key uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, profile_id),
  constraint event_rsvps_waitlist_position check (
    (status = 'waitlisted' and waitlist_position is not null and waitlist_position > 0)
    or (status <> 'waitlisted' and waitlist_position is null)
  ),
  constraint event_rsvps_cancelled_date check (
    (status = 'cancelled' and cancelled_at is not null)
    or status <> 'cancelled'
  ),
  constraint event_rsvps_reason_length check (
    status_reason is null or char_length(status_reason) <= 500
  )
);

create unique index event_rsvps_idempotency_idx
  on public.event_rsvps(profile_id, idempotency_key)
  where idempotency_key is not null;

create unique index event_rsvps_waitlist_order_idx
  on public.event_rsvps(event_id, waitlist_position)
  where status = 'waitlisted';

create table public.event_rsvp_status_history (
  id uuid primary key default extensions.gen_random_uuid(),
  rsvp_id uuid not null references public.event_rsvps(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  from_status public.rsvp_status,
  to_status public.rsvp_status not null,
  reason text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint event_rsvp_history_reason_length check (
    reason is null or char_length(reason) <= 500
  )
);

create table public.event_chat_members (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_read_at timestamptz,
  notifications_muted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, profile_id),
  constraint event_chat_members_revocation check (
    (is_active and revoked_at is null) or (not is_active and revoked_at is not null)
  )
);

create table public.event_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  kind public.event_message_kind not null default 'text',
  body text not null,
  reply_to_id uuid references public.event_messages(id) on delete set null,
  client_id uuid,
  removed_at timestamptz,
  removed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_messages_body_length check (char_length(body) between 1 and 2000),
  constraint event_messages_sender_kind check (
    (kind = 'system' and sender_id is null)
    or (kind in ('text', 'announcement') and sender_id is not null)
  ),
  constraint event_messages_removal check (
    (removed_at is null and removed_by is null)
    or (removed_at is not null and removed_by is not null)
  )
);

create unique index event_messages_sender_client_idx
  on public.event_messages(sender_id, client_id)
  where client_id is not null;

create table public.event_message_reactions (
  message_id uuid not null references public.event_messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, profile_id, reaction),
  constraint event_message_reaction_length check (char_length(reaction) between 1 and 16)
);

create table public.event_announcements (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  body text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_announcements_title_length check (char_length(title) between 2 and 120),
  constraint event_announcements_body_length check (char_length(body) between 2 and 3000)
);

create table public.event_checkin_tokens (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  token_digest text not null unique,
  valid_from timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint event_checkin_tokens_expiry check (
    valid_from < expires_at and expires_at <= valid_from + interval '15 minutes'
  )
);

create table public.event_checkins (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  checkin_token_id uuid not null references public.event_checkin_tokens(id) on delete restrict,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (event_id, profile_id)
);

create table public.notification_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  kind text not null,
  deduplication_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null default now(),
  status public.notification_job_status not null default 'pending',
  attempts smallint not null default 0,
  last_error_code text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_jobs_kind_length check (char_length(kind) between 3 and 80),
  constraint notification_jobs_payload check (
    jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 8192
  ),
  constraint notification_jobs_attempts check (attempts between 0 and 20)
);

create table public.badge_definitions (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint badge_definitions_id_format check (id ~ '^[a-z0-9_]+$'),
  constraint badge_definitions_name_length check (char_length(name) between 2 and 60),
  constraint badge_definitions_description_length check (char_length(description) between 5 and 300)
);

create table public.user_badges (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null references public.badge_definitions(id) on delete restrict,
  source_type text not null,
  source_id uuid not null,
  awarded_at timestamptz not null default now(),
  primary key (profile_id, badge_id),
  unique (profile_id, badge_id, source_type, source_id)
);

create table public.referral_codes (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  kind public.referral_code_kind not null,
  owner_profile_id uuid references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  campus_id uuid not null references public.campuses(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint referral_codes_code_format check (code ~ '^[A-Z0-9]{6,16}$'),
  constraint referral_codes_exact_owner check (
    (kind in ('user', 'ambassador') and owner_profile_id is not null and organization_id is null)
    or (kind = 'organization' and owner_profile_id is null and organization_id is not null)
  )
);

create table public.referrals (
  id uuid primary key default extensions.gen_random_uuid(),
  referral_code_id uuid not null references public.referral_codes(id) on delete restrict,
  referred_profile_id uuid not null unique references public.profiles(id) on delete cascade,
  status public.referral_status not null default 'attributed',
  qualified_at timestamptz,
  rewarded_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referrals_state_dates check (
    (status not in ('qualified', 'rewarded') or qualified_at is not null)
    and (status <> 'rewarded' or rewarded_at is not null)
  ),
  constraint referrals_rejection_reason check (
    rejection_reason is null or char_length(rejection_reason) <= 500
  )
);

create table public.legal_acceptances (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null,
  document_version text not null,
  accepted_at timestamptz not null default now(),
  unique (profile_id, document_type, document_version),
  constraint legal_acceptances_document_type check (
    document_type in ('terms', 'privacy', 'community_guidelines')
  ),
  constraint legal_acceptances_version_length check (char_length(document_version) between 1 and 40)
);

create table public.data_export_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.data_request_status not null default 'requested',
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz,
  artifact_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index data_export_requests_open_idx
  on public.data_export_requests(profile_id)
  where status in ('requested', 'processing', 'ready');

create table public.partnership_leads (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_name text not null,
  organization_name text not null,
  contact_name text not null,
  contact_email extensions.citext not null,
  lead_type text not null,
  message text not null,
  status public.partnership_lead_status not null default 'submitted',
  source_hash text not null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partnership_leads_campus_length check (char_length(campus_name) between 2 and 160),
  constraint partnership_leads_organization_length check (char_length(organization_name) between 2 and 160),
  constraint partnership_leads_contact_length check (char_length(contact_name) between 2 and 100),
  constraint partnership_leads_type check (
    lead_type in ('student_club', 'campus_media', 'student_government', 'residence', 'campus_activities', 'university', 'other')
  ),
  constraint partnership_leads_message_length check (char_length(message) between 10 and 3000)
);

create table public.moderation_cases (
  id uuid primary key default extensions.gen_random_uuid(),
  report_id uuid references public.reports(id) on delete set null,
  status public.moderation_case_status not null default 'open',
  severity smallint not null default 1,
  assigned_to uuid references public.profiles(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint moderation_cases_severity check (severity between 1 and 4),
  constraint moderation_cases_notes_length check (
    resolution_notes is null or char_length(resolution_notes) <= 4000
  )
);

create table public.moderation_actions (
  id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null references public.moderation_cases(id) on delete restrict,
  moderator_id uuid not null references public.profiles(id) on delete restrict,
  action public.moderation_action_kind not null,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint moderation_actions_reason_length check (char_length(reason) between 3 and 2000),
  constraint moderation_actions_metadata check (
    jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 8192
  )
);

-- Query, locking, pagination, and policy-support indexes.
create index organizations_campus_idx on public.organizations(campus_id, name);
create index organization_members_profile_idx
  on public.organization_members(profile_id, organization_id)
  where status = 'active';
create index organization_members_org_idx
  on public.organization_members(organization_id, role, profile_id)
  where status = 'active';
create index organization_audit_log_org_idx
  on public.organization_audit_log(organization_id, created_at desc);
create index events_discover_idx
  on public.events(campus_id, starts_at, id)
  where status = 'published' and not moderation_restricted;
create index events_public_idx
  on public.events(starts_at, id)
  where status = 'published' and visibility = 'public' and not moderation_restricted;
create index events_organization_idx on public.events(organization_id, starts_at desc);
create index events_creator_idx on public.events(created_by, starts_at desc);
create index event_hosts_profile_idx on public.event_hosts(profile_id, event_id);
create index event_rsvps_profile_idx on public.event_rsvps(profile_id, status, updated_at desc);
create index event_rsvps_event_confirmed_idx
  on public.event_rsvps(event_id, joined_at)
  where status = 'confirmed';
create index event_rsvps_event_waitlist_idx
  on public.event_rsvps(event_id, waitlist_position)
  where status = 'waitlisted';
create index event_rsvp_history_profile_idx
  on public.event_rsvp_status_history(profile_id, created_at desc);
create index event_chat_members_profile_idx
  on public.event_chat_members(profile_id, event_id)
  where is_active;
create index event_messages_page_idx
  on public.event_messages(event_id, created_at desc, id);
create index event_reactions_message_idx on public.event_message_reactions(message_id);
create index event_announcements_event_idx
  on public.event_announcements(event_id, created_at desc);
create index event_checkin_tokens_event_idx
  on public.event_checkin_tokens(event_id, expires_at desc)
  where revoked_at is null;
create index event_checkins_profile_idx
  on public.event_checkins(profile_id, verified_at desc);
create index notification_jobs_due_idx
  on public.notification_jobs(scheduled_for, id)
  where status = 'pending';
create index moderation_cases_queue_idx
  on public.moderation_cases(status, severity desc, created_at);
create index moderation_actions_target_idx
  on public.moderation_actions(target_type, target_id, created_at desc);
create index partnership_leads_queue_idx
  on public.partnership_leads(status, created_at);

comment on table public.event_rsvps is
  'Direct writes are forbidden. Trusted RSVP functions own capacity and waitlist transitions.';
comment on column public.events.reveal_coordinates_after_confirmation is
  'Exact coordinates are excluded from public event views when true.';
comment on table public.organization_audit_log is
  'Append-only audit history for organization membership and role changes.';
comment on table public.legal_acceptances is
  'Versioned product acceptance records; legal text remains subject to legal review.';
