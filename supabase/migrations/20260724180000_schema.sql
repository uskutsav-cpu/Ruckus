-- Campus Clash foundational schema.
-- PostgreSQL/Supabase migrations are the source of truth; the mobile client is untrusted.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create type public.user_role as enum ('student', 'host', 'admin');
create type public.session_status as enum ('scheduled', 'cancelled', 'completed');
create type public.swipe_decision as enum ('pass', 'interested');
create type public.waitlist_status as enum ('waiting', 'matched', 'withdrawn', 'expired');
create type public.group_status as enum (
  'forming',
  'pending_confirmation',
  'confirmed',
  'cancelled',
  'completed'
);
create type public.group_member_status as enum (
  'invited',
  'active',
  'left',
  'removed'
);
create type public.message_kind as enum ('text', 'system');
create type public.confirmation_status as enum (
  'pending',
  'confirmed',
  'declined',
  'expired'
);
create type public.xp_reason as enum (
  'attendance_confirmed',
  'verified_checkin',
  'post_event_rating',
  'host_completion',
  'no_show',
  'late_cancellation',
  'admin_adjustment'
);
create type public.report_target as enum ('user', 'message', 'group');
create type public.report_status as enum (
  'submitted',
  'under_review',
  'resolved',
  'dismissed'
);
create type public.notification_platform as enum ('ios', 'android');

create table public.campuses (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  email_domain extensions.citext not null unique,
  timezone text not null default 'America/Chicago',
  is_active boolean not null default true,
  min_group_size smallint not null default 4,
  target_group_size smallint not null default 6,
  max_group_size smallint not null default 8,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campuses_name_length check (char_length(name) between 2 and 120),
  constraint campuses_domain_format check (
    email_domain::text ~* '^[a-z0-9.-]+\.[a-z]{2,}$'
  ),
  constraint campuses_group_sizes check (
    min_group_size >= 2
    and min_group_size <= target_group_size
    and target_group_size <= max_group_size
    and max_group_size <= 20
  )
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  campus_id uuid not null references public.campuses(id) on delete restrict,
  university_email extensions.citext not null unique,
  display_name text,
  avatar_path text,
  bio text,
  graduation_year smallint,
  role public.user_role not null default 'student',
  age_attested boolean not null default false,
  age_attested_at timestamptz,
  safety_acknowledged_at timestamptz,
  email_domain_verified_at timestamptz,
  onboarding_completed_at timestamptz,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (
    display_name is null or char_length(display_name) between 2 and 40
  ),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 280),
  constraint profiles_graduation_year check (
    graduation_year is null or graduation_year between 2020 and 2100
  ),
  constraint profiles_age_attestation_consistent check (
    (age_attested and age_attested_at is not null)
    or (not age_attested and age_attested_at is null)
  )
);

create table public.interests (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  name text not null,
  emoji text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campus_id, name),
  constraint interests_name_length check (char_length(name) between 2 and 50),
  constraint interests_emoji_length check (char_length(emoji) between 1 and 16)
);

create table public.profile_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, interest_id)
);

create table public.activity_templates (
  id uuid primary key default extensions.gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  duration_minutes smallint not null,
  image_path text,
  gradient_start text not null default '#7C3AED',
  gradient_end text not null default '#22D3EE',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_templates_title_length check (char_length(title) between 2 and 80),
  constraint activity_templates_description_length check (
    char_length(description) between 10 and 1000
  ),
  constraint activity_templates_duration check (duration_minutes between 15 and 720),
  constraint activity_templates_colors check (
    gradient_start ~ '^#[0-9A-Fa-f]{6}$'
    and gradient_end ~ '^#[0-9A-Fa-f]{6}$'
  )
);

create table public.activity_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  activity_template_id uuid not null references public.activity_templates(id) on delete cascade,
  campus_id uuid not null references public.campuses(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  swipe_closes_at timestamptz not null,
  capacity integer not null default 120,
  status public.session_status not null default 'scheduled',
  public_venue_name text,
  public_venue_address text,
  venue_notes text,
  checkin_opens_at timestamptz,
  checkin_closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_sessions_time_order check (
    swipe_closes_at <= starts_at and starts_at < ends_at
  ),
  constraint activity_sessions_checkin_order check (
    (checkin_opens_at is null and checkin_closes_at is null)
    or (
      checkin_opens_at is not null
      and checkin_closes_at is not null
      and checkin_opens_at < checkin_closes_at
    )
  ),
  constraint activity_sessions_capacity check (capacity between 4 and 10000),
  constraint activity_sessions_public_venue check (
    status = 'cancelled'
    or (
      public_venue_name is not null
      and public_venue_address is not null
    )
  )
);

create table public.swipes (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  activity_session_id uuid not null references public.activity_sessions(id) on delete cascade,
  decision public.swipe_decision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, activity_session_id)
);

create table public.waitlist_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  activity_session_id uuid not null references public.activity_sessions(id) on delete cascade,
  status public.waitlist_status not null default 'waiting',
  matched_group_id uuid,
  joined_at timestamptz not null default now(),
  matched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, activity_session_id),
  constraint waitlist_match_consistent check (
    (status = 'matched' and matched_group_id is not null and matched_at is not null)
    or (status <> 'matched' and matched_group_id is null)
  )
);

create table public.groups (
  id uuid primary key default extensions.gen_random_uuid(),
  activity_session_id uuid not null references public.activity_sessions(id) on delete cascade,
  campus_id uuid not null references public.campuses(id) on delete cascade,
  status public.group_status not null default 'pending_confirmation',
  min_size smallint not null,
  target_size smallint not null,
  max_size smallint not null,
  confirmation_deadline timestamptz not null,
  venue_revealed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint groups_size_snapshot check (
    min_size >= 2
    and min_size <= target_size
    and target_size <= max_size
    and max_size <= 20
  )
);

alter table public.waitlist_entries
  add constraint waitlist_matched_group_fk
  foreign key (matched_group_id) references public.groups(id) on delete restrict;

create table public.group_members (
  id uuid primary key default extensions.gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.group_member_status not null default 'active',
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, profile_id),
  constraint group_members_left_consistent check (
    (status in ('left', 'removed') and left_at is not null)
    or (status in ('invited', 'active') and left_at is null)
  )
);

create table public.messages (
  id uuid primary key default extensions.gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  kind public.message_kind not null default 'text',
  body text not null,
  client_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_body_length check (char_length(body) between 1 and 1000),
  constraint messages_sender_kind check (
    (kind = 'system' and sender_id is null)
    or (kind = 'text' and sender_id is not null)
  )
);

create table public.attendance_confirmations (
  id uuid primary key default extensions.gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.confirmation_status not null default 'pending',
  deadline timestamptz not null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, profile_id),
  constraint confirmations_response_consistent check (
    (status = 'pending' and responded_at is null)
    or (status <> 'pending' and responded_at is not null)
  )
);

create table public.checkin_tokens (
  id uuid primary key default extensions.gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  activity_session_id uuid not null references public.activity_sessions(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  token_digest text not null unique,
  valid_from timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkin_tokens_expiry check (
    valid_from < expires_at and expires_at <= valid_from + interval '15 minutes'
  )
);

create table public.checkins (
  id uuid primary key default extensions.gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  activity_session_id uuid not null references public.activity_sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  checkin_token_id uuid not null references public.checkin_tokens(id) on delete restrict,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_session_id, profile_id)
);

create table public.push_tokens (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform public.notification_platform not null,
  device_id text not null,
  last_seen_at timestamptz not null default now(),
  invalidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, device_id),
  constraint push_tokens_format check (expo_push_token ~ '^Expo(nent)?PushToken\[')
);

create table public.xp_ledger (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  campus_id uuid not null references public.campuses(id) on delete cascade,
  amount smallint not null,
  reason public.xp_reason not null,
  source_type text not null,
  source_id uuid not null,
  note text,
  created_at timestamptz not null default now(),
  constraint xp_ledger_amount check (amount between -1000 and 1000),
  constraint xp_ledger_note_length check (note is null or char_length(note) <= 280),
  unique (profile_id, reason, source_type, source_id)
);

create table public.blocks (
  id uuid primary key default extensions.gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default extensions.gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.report_target not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_message_id uuid references public.messages(id) on delete set null,
  target_group_id uuid references public.groups(id) on delete set null,
  reason text not null,
  details text,
  status public.report_status not null default 'submitted',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_reason_length check (char_length(reason) between 3 and 100),
  constraint reports_details_length check (details is null or char_length(details) <= 2000),
  constraint reports_exact_target check (
    num_nonnulls(target_user_id, target_message_id, target_group_id) = 1
    and (
      (target_type = 'user' and target_user_id is not null)
      or (target_type = 'message' and target_message_id is not null)
      or (target_type = 'group' and target_group_id is not null)
    )
  )
);

create table public.admin_actions (
  id uuid primary key default extensions.gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_actions_action_length check (char_length(action) between 3 and 100),
  constraint admin_actions_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table public.event_ratings (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  activity_session_id uuid not null references public.activity_sessions(id) on delete cascade,
  rating smallint not null,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, activity_session_id),
  constraint event_ratings_range check (rating between 1 and 5),
  constraint event_ratings_feedback_length check (
    feedback is null or char_length(feedback) <= 1000
  )
);

-- Query and locking indexes.
create index profiles_campus_idx on public.profiles(campus_id);
create index profiles_onboarded_idx
  on public.profiles(campus_id, onboarding_completed_at)
  where onboarding_completed_at is not null;
create index activity_templates_campus_active_idx
  on public.activity_templates(campus_id, is_active);
create index activity_sessions_feed_idx
  on public.activity_sessions(campus_id, starts_at)
  where status = 'scheduled';
create index activity_sessions_overlap_idx
  on public.activity_sessions using gist (tstzrange(starts_at, ends_at, '[)'));
create index swipes_profile_created_idx on public.swipes(profile_id, created_at desc);
create index waitlist_session_waiting_idx
  on public.waitlist_entries(activity_session_id, joined_at)
  where status = 'waiting';
create index waitlist_profile_status_idx
  on public.waitlist_entries(profile_id, status);
create index groups_session_status_idx on public.groups(activity_session_id, status);
create index group_members_profile_active_idx
  on public.group_members(profile_id, group_id)
  where status = 'active';
create index group_members_group_active_idx
  on public.group_members(group_id, joined_at)
  where status = 'active';
create index messages_group_page_idx on public.messages(group_id, created_at desc, id);
create unique index messages_sender_client_id_idx
  on public.messages(sender_id, client_id)
  where client_id is not null;
create index confirmations_deadline_idx
  on public.attendance_confirmations(deadline)
  where status = 'pending';
create index checkin_tokens_group_expiry_idx
  on public.checkin_tokens(group_id, expires_at desc)
  where revoked_at is null;
create index checkins_profile_idx on public.checkins(profile_id, verified_at desc);
create index xp_ledger_campus_period_idx
  on public.xp_ledger(campus_id, created_at desc, profile_id);
create index xp_ledger_profile_idx on public.xp_ledger(profile_id, created_at desc);
create index blocks_blocked_idx on public.blocks(blocked_id, blocker_id);
create index reports_status_created_idx on public.reports(status, created_at);
create index admin_actions_target_idx on public.admin_actions(target_type, target_id);

comment on column public.profiles.email_domain_verified_at is
  'Verifies access to the configured university email domain; this is not proof of identity.';
comment on column public.activity_sessions.public_venue_name is
  'Sensitive until group confirmation. Never granted through direct table access.';
comment on table public.xp_ledger is
  'Append-only ledger. Only trusted security-definer functions or service processes may write.';
comment on table public.checkin_tokens is
  'Stores token digests only; raw short-lived QR values are never persisted.';
