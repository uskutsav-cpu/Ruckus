-- Privacy-safe campus social graph. All mutations and reads use reviewed RPCs;
-- clients never receive direct table access to relationship or audit records.

create type public.profile_visibility as enum ('campus', 'friends', 'private');
create type public.attendance_visibility as enum (
  'friends',
  'confirmed_attendees',
  'private'
);
create type public.follow_policy as enum ('public', 'approval', 'disabled');
create type public.follow_status as enum ('pending', 'active');
create type public.friend_request_status as enum (
  'pending',
  'accepted',
  'declined',
  'cancelled'
);

alter table public.profile_preferences
  add column profile_visibility public.profile_visibility not null default 'friends',
  add column attendance_visibility public.attendance_visibility not null default 'friends',
  add column allow_friend_requests boolean not null default true,
  add column follow_policy public.follow_policy not null default 'approval',
  add column show_in_social_suggestions boolean not null default false;

create table public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  status public.follow_status not null,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint user_follows_not_self check (follower_id <> followed_id),
  constraint user_follows_status_dates check (
    (status = 'pending' and accepted_at is null)
    or (status = 'active' and accepted_at is not null)
  )
);

create table public.friend_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  user_low_id uuid generated always as (least(requester_id, addressee_id)) stored,
  user_high_id uuid generated always as (greatest(requester_id, addressee_id)) stored,
  status public.friend_request_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_not_self check (requester_id <> addressee_id),
  constraint friend_requests_status_dates check (
    (status = 'pending' and responded_at is null)
    or (status <> 'pending' and responded_at is not null)
  )
);

create unique index friend_requests_open_pair_idx
  on public.friend_requests(user_low_id, user_high_id)
  where status = 'pending';

create table public.friendships (
  user_low_id uuid not null references public.profiles(id) on delete cascade,
  user_high_id uuid not null references public.profiles(id) on delete cascade,
  accepted_request_id uuid references public.friend_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_low_id, user_high_id),
  constraint friendships_canonical_pair check (user_low_id < user_high_id)
);

create table public.social_audit_log (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint social_audit_action_length check (char_length(action) between 3 and 80),
  constraint social_audit_metadata check (
    jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 4096
  )
);

create index user_follows_followed_idx
  on public.user_follows(followed_id, status, created_at desc, follower_id);
create index user_follows_follower_idx
  on public.user_follows(follower_id, status, created_at desc, followed_id);
create index friend_requests_addressee_idx
  on public.friend_requests(addressee_id, status, created_at desc);
create index friend_requests_requester_idx
  on public.friend_requests(requester_id, status, created_at desc);
create index friendships_high_idx on public.friendships(user_high_id, created_at desc);
create index social_audit_actor_idx on public.social_audit_log(actor_id, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_follows',
    'friend_requests',
    'friendships',
    'social_audit_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;

create or replace function ruckus_private.are_friends(
  first_profile_id uuid,
  second_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select first_profile_id is not null
    and second_profile_id is not null
    and first_profile_id <> second_profile_id
    and exists (
      select 1
      from public.friendships
      where user_low_id = least(first_profile_id, second_profile_id)
        and user_high_id = greatest(first_profile_id, second_profile_id)
    );
$$;

create or replace function ruckus_private.social_pair_allowed(
  actor_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select actor_id is not null
    and target_profile_id is not null
    and actor_id <> target_profile_id
    and not public.is_blocked_between(actor_id, target_profile_id)
    and exists (
      select 1
      from public.profiles as actor
      join public.profiles as target
        on target.id = target_profile_id
       and target.campus_id = actor.campus_id
      where actor.id = actor_id
        and actor.email_domain_verified_at is not null
        and actor.onboarding_completed_at is not null
        and actor.deletion_requested_at is null
        and actor.banned_at is null
        and target.email_domain_verified_at is not null
        and target.onboarding_completed_at is not null
        and target.deletion_requested_at is null
        and target.banned_at is null
    );
$$;

create or replace function ruckus_private.record_social_audit(
  actor_id uuid,
  action_name text,
  target_profile_id uuid,
  safe_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(action_name) not between 3 and 80
    or jsonb_typeof(coalesce(safe_metadata, '{}'::jsonb)) <> 'object'
    or pg_column_size(coalesce(safe_metadata, '{}'::jsonb)) > 4096 then
    raise exception using errcode = '22023', message = 'INVALID_SOCIAL_AUDIT';
  end if;

  insert into public.social_audit_log (actor_id, action, target_profile_id, metadata)
  values (actor_id, action_name, target_profile_id, coalesce(safe_metadata, '{}'::jsonb));
end;
$$;

create or replace function ruckus_private.queue_social_notification(
  target_profile_id uuid,
  notification_kind text,
  actor_id uuid,
  source_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_jobs (
    profile_id,
    kind,
    deduplication_key,
    payload,
    scheduled_for
  )
  values (
    target_profile_id,
    notification_kind,
    notification_kind || ':' || source_id::text,
    jsonb_build_object(
      'actorId', actor_id,
      'route', '/social'
    ),
    now()
  )
  on conflict (deduplication_key) do nothing;
end;
$$;

create or replace function public.set_social_preferences(
  new_profile_visibility public.profile_visibility,
  new_attendance_visibility public.attendance_visibility,
  new_allow_friend_requests boolean,
  new_follow_policy public.follow_policy,
  new_show_in_social_suggestions boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  update public.profile_preferences
  set profile_visibility = new_profile_visibility,
      attendance_visibility = new_attendance_visibility,
      allow_friend_requests = new_allow_friend_requests,
      follow_policy = new_follow_policy,
      show_in_social_suggestions = new_show_in_social_suggestions,
      updated_at = now()
  where profile_id = actor_id;

  return jsonb_build_object(
    'profileVisibility', new_profile_visibility,
    'attendanceVisibility', new_attendance_visibility,
    'allowFriendRequests', new_allow_friend_requests,
    'followPolicy', new_follow_policy,
    'showInSuggestions', new_show_in_social_suggestions
  );
end;
$$;

create or replace function public.follow_user(target_profile_id uuid)
returns public.follow_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_policy public.follow_policy;
  next_status public.follow_status;
begin
  if not ruckus_private.social_pair_allowed(actor_id, target_profile_id) then
    raise exception using errcode = '42501', message = 'SOCIAL_TARGET_UNAVAILABLE';
  end if;

  select follow_policy into target_policy
  from public.profile_preferences
  where profile_id = target_profile_id;

  if target_policy = 'disabled' then
    raise exception using errcode = '42501', message = 'FOLLOWS_DISABLED';
  end if;

  next_status := case when target_policy = 'public' then 'active' else 'pending' end;

  insert into public.user_follows (
    follower_id, followed_id, status, accepted_at
  ) values (
    actor_id,
    target_profile_id,
    next_status,
    case when next_status = 'active' then now() else null end
  )
  on conflict (follower_id, followed_id) do update
  set status = case
        when user_follows.status = 'active' then 'active'::public.follow_status
        else excluded.status
      end,
      accepted_at = case
        when user_follows.status = 'active' then user_follows.accepted_at
        else excluded.accepted_at
      end,
      updated_at = now()
  returning status into next_status;

  perform ruckus_private.record_social_audit(
    actor_id,
    case when next_status = 'active' then 'followed' else 'follow_requested' end,
    target_profile_id
  );
  perform ruckus_private.queue_social_notification(
    target_profile_id,
    case when next_status = 'active' then 'social_followed' else 'social_follow_request' end,
    actor_id,
    actor_id
  );

  return next_status;
end;
$$;

create or replace function public.respond_to_follow_request(
  requester_profile_id uuid,
  accept_request boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  affected integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  if accept_request and public.is_blocked_between(actor_id, requester_profile_id) then
    raise exception using errcode = '42501', message = 'SOCIAL_TARGET_UNAVAILABLE';
  end if;

  if accept_request then
    update public.user_follows
    set status = 'active', accepted_at = now(), updated_at = now()
    where follower_id = requester_profile_id
      and followed_id = actor_id
      and status = 'pending';
  else
    delete from public.user_follows
    where follower_id = requester_profile_id
      and followed_id = actor_id
      and status = 'pending';
  end if;
  get diagnostics affected = row_count;

  if affected = 0 then
    raise exception using errcode = 'P0002', message = 'FOLLOW_REQUEST_NOT_FOUND';
  end if;

  perform ruckus_private.record_social_audit(
    actor_id,
    case when accept_request then 'follow_accepted' else 'follow_declined' end,
    requester_profile_id
  );
  if accept_request then
    perform ruckus_private.queue_social_notification(
      requester_profile_id,
      'social_follow_accepted',
      actor_id,
      actor_id
    );
  end if;

  return case when accept_request then 'active' else 'declined' end;
end;
$$;

create or replace function public.unfollow_user(target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  affected integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  delete from public.user_follows
  where follower_id = actor_id and followed_id = target_profile_id;
  get diagnostics affected = row_count;
  if affected > 0 then
    perform ruckus_private.record_social_audit(actor_id, 'unfollowed', target_profile_id);
  end if;
  return affected > 0;
end;
$$;

create or replace function public.send_friend_request(target_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  request_record public.friend_requests%rowtype;
  target_allows boolean;
begin
  if not ruckus_private.social_pair_allowed(actor_id, target_profile_id) then
    raise exception using errcode = '42501', message = 'SOCIAL_TARGET_UNAVAILABLE';
  end if;

  -- Serialize both directions of the same pair. Without this lock, reciprocal
  -- requests arriving together could both observe no open request before the
  -- partial unique index rejects one of them.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      least(actor_id, target_profile_id)::text
        || ':' || greatest(actor_id, target_profile_id)::text,
      0
    )
  );

  if ruckus_private.are_friends(actor_id, target_profile_id) then
    return jsonb_build_object('status', 'accepted', 'alreadyFriends', true);
  end if;

  select allow_friend_requests into target_allows
  from public.profile_preferences
  where profile_id = target_profile_id;
  if not coalesce(target_allows, false) then
    raise exception using errcode = '42501', message = 'FRIEND_REQUESTS_DISABLED';
  end if;

  select * into request_record
  from public.friend_requests
  where user_low_id = least(actor_id, target_profile_id)
    and user_high_id = greatest(actor_id, target_profile_id)
    and status = 'pending'
  for update;

  if request_record.id is not null then
    if request_record.requester_id = actor_id then
      return jsonb_build_object(
        'id', request_record.id,
        'status', request_record.status,
        'alreadyPending', true
      );
    end if;

    update public.friend_requests
    set status = 'accepted', responded_at = now(), updated_at = now()
    where id = request_record.id;

    insert into public.friendships (user_low_id, user_high_id, accepted_request_id)
    values (
      least(actor_id, target_profile_id),
      greatest(actor_id, target_profile_id),
      request_record.id
    )
    on conflict (user_low_id, user_high_id) do nothing;

    perform ruckus_private.record_social_audit(
      actor_id, 'friend_request_accepted', target_profile_id,
      jsonb_build_object('requestId', request_record.id)
    );
    perform ruckus_private.queue_social_notification(
      target_profile_id, 'social_friend_accepted', actor_id, request_record.id
    );
    return jsonb_build_object(
      'id', request_record.id,
      'status', 'accepted',
      'alreadyFriends', false
    );
  end if;

  insert into public.friend_requests (requester_id, addressee_id)
  values (actor_id, target_profile_id)
  returning * into request_record;

  perform ruckus_private.record_social_audit(
    actor_id, 'friend_request_sent', target_profile_id,
    jsonb_build_object('requestId', request_record.id)
  );
  perform ruckus_private.queue_social_notification(
    target_profile_id, 'social_friend_request', actor_id, request_record.id
  );

  return jsonb_build_object(
    'id', request_record.id,
    'status', request_record.status,
    'alreadyPending', false
  );
end;
$$;

create or replace function public.respond_to_friend_request(
  request_id uuid,
  accept_request boolean
)
returns public.friend_request_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  request_record public.friend_requests%rowtype;
  next_status public.friend_request_status;
begin
  select * into request_record
  from public.friend_requests
  where id = request_id
  for update;

  if request_record.id is null or request_record.addressee_id <> actor_id then
    raise exception using errcode = 'P0002', message = 'FRIEND_REQUEST_NOT_FOUND';
  end if;
  if request_record.status <> 'pending' then
    return request_record.status;
  end if;
  if accept_request and not ruckus_private.social_pair_allowed(
    actor_id,
    request_record.requester_id
  ) then
    raise exception using errcode = '42501', message = 'SOCIAL_TARGET_UNAVAILABLE';
  end if;

  next_status := case when accept_request then 'accepted' else 'declined' end;
  update public.friend_requests
  set status = next_status, responded_at = now(), updated_at = now()
  where id = request_record.id;

  if accept_request then
    insert into public.friendships (user_low_id, user_high_id, accepted_request_id)
    values (
      request_record.user_low_id,
      request_record.user_high_id,
      request_record.id
    )
    on conflict (user_low_id, user_high_id) do nothing;
    perform ruckus_private.queue_social_notification(
      request_record.requester_id,
      'social_friend_accepted',
      actor_id,
      request_record.id
    );
  end if;

  perform ruckus_private.record_social_audit(
    actor_id,
    case when accept_request then 'friend_request_accepted' else 'friend_request_declined' end,
    request_record.requester_id,
    jsonb_build_object('requestId', request_record.id)
  );
  return next_status;
end;
$$;

create or replace function public.cancel_friend_request(request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_profile_id uuid;
begin
  update public.friend_requests
  set status = 'cancelled', responded_at = now(), updated_at = now()
  where id = request_id
    and requester_id = actor_id
    and status = 'pending'
  returning addressee_id into target_profile_id;

  if target_profile_id is null then
    return false;
  end if;
  perform ruckus_private.record_social_audit(
    actor_id, 'friend_request_cancelled', target_profile_id,
    jsonb_build_object('requestId', request_id)
  );
  return true;
end;
$$;

create or replace function public.remove_friend(target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  affected integer;
begin
  if actor_id is null or actor_id = target_profile_id then
    raise exception using errcode = '22023', message = 'INVALID_FRIEND_TARGET';
  end if;
  delete from public.friendships
  where user_low_id = least(actor_id, target_profile_id)
    and user_high_id = greatest(actor_id, target_profile_id);
  get diagnostics affected = row_count;
  if affected > 0 then
    perform ruckus_private.record_social_audit(actor_id, 'friend_removed', target_profile_id);
  end if;
  return affected > 0;
end;
$$;

create or replace function public.unblock_user(target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  affected integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  delete from public.blocks
  where blocker_id = actor_id and blocked_id = target_profile_id;
  get diagnostics affected = row_count;
  if affected > 0 then
    perform ruckus_private.record_social_audit(actor_id, 'user_unblocked', target_profile_id);
  end if;
  return affected > 0;
end;
$$;

create or replace function ruckus_private.apply_social_block_override()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.user_follows
  where (follower_id = new.blocker_id and followed_id = new.blocked_id)
     or (follower_id = new.blocked_id and followed_id = new.blocker_id);

  update public.friend_requests
  set status = 'cancelled', responded_at = now(), updated_at = now()
  where user_low_id = least(new.blocker_id, new.blocked_id)
    and user_high_id = greatest(new.blocker_id, new.blocked_id)
    and status = 'pending';

  delete from public.friendships
  where user_low_id = least(new.blocker_id, new.blocked_id)
    and user_high_id = greatest(new.blocker_id, new.blocked_id);

  perform ruckus_private.record_social_audit(
    new.blocker_id, 'user_blocked', new.blocked_id
  );
  return new;
end;
$$;

create trigger apply_social_block_override
after insert on public.blocks
for each row execute function ruckus_private.apply_social_block_override();

create or replace function public.get_social_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  return jsonb_build_object(
    'counts', jsonb_build_object(
      'friends', (
        select count(*) from public.friendships
        where user_low_id = actor_id or user_high_id = actor_id
      ),
      'following', (
        select count(*) from public.user_follows
        where follower_id = actor_id and status = 'active'
      ),
      'followers', (
        select count(*) from public.user_follows
        where followed_id = actor_id and status = 'active'
      ),
      'incomingFriendRequests', (
        select count(*) from public.friend_requests
        where addressee_id = actor_id and status = 'pending'
      ),
      'incomingFollowRequests', (
        select count(*) from public.user_follows
        where followed_id = actor_id and status = 'pending'
      )
    ),
    'preferences', (
      select jsonb_build_object(
        'profileVisibility', profile_visibility,
        'attendanceVisibility', attendance_visibility,
        'allowFriendRequests', allow_friend_requests,
        'followPolicy', follow_policy,
        'showInSuggestions', show_in_social_suggestions
      )
      from public.profile_preferences
      where profile_id = actor_id
    )
  );
end;
$$;

create or replace function public.get_social_connections(
  connection_kind text,
  before_created_at timestamptz default null,
  before_profile_id uuid default null,
  page_size integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  safe_page_size integer := greatest(1, least(coalesce(page_size, 30), 100));
  result jsonb;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if connection_kind not in (
    'friends', 'following', 'followers', 'friend_requests', 'follow_requests'
  ) then
    raise exception using errcode = '22023', message = 'INVALID_CONNECTION_KIND';
  end if;

  with connections as (
    select
      case
        when friendship.user_low_id = actor_id then friendship.user_high_id
        else friendship.user_low_id
      end as profile_id,
      friendship.created_at as connected_at,
      'friend'::text as relation,
      null::uuid as request_id
    from public.friendships as friendship
    where connection_kind = 'friends'
      and (friendship.user_low_id = actor_id or friendship.user_high_id = actor_id)

    union all

    select follow.followed_id, follow.created_at, 'following', null::uuid
    from public.user_follows as follow
    where connection_kind = 'following'
      and follow.follower_id = actor_id
      and follow.status = 'active'

    union all

    select follow.follower_id, follow.created_at, 'follower', null::uuid
    from public.user_follows as follow
    where connection_kind = 'followers'
      and follow.followed_id = actor_id
      and follow.status = 'active'

    union all

    select request.requester_id, request.created_at, 'friend_request', request.id
    from public.friend_requests as request
    where connection_kind = 'friend_requests'
      and request.addressee_id = actor_id
      and request.status = 'pending'

    union all

    select follow.follower_id, follow.created_at, 'follow_request', null::uuid
    from public.user_follows as follow
    where connection_kind = 'follow_requests'
      and follow.followed_id = actor_id
      and follow.status = 'pending'
  ), page as (
    select
      connection.profile_id,
      connection.connected_at,
      connection.relation,
      connection.request_id,
      profile.display_name,
      profile.username,
      profile.avatar_path
    from connections as connection
    join public.profiles as profile on profile.id = connection.profile_id
    where not public.is_blocked_between(actor_id, connection.profile_id)
      and (
        before_created_at is null
        or (connection.connected_at, connection.profile_id)
          < (before_created_at, before_profile_id)
      )
    order by connection.connected_at desc, connection.profile_id desc
    limit safe_page_size + 1
  ), visible_page as (
    select * from page
    order by connected_at desc, profile_id desc
    limit safe_page_size
  ), next_item as (
    select * from page
    order by connected_at desc, profile_id desc
    offset safe_page_size limit 1
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'profileId', profile_id,
        'displayName', display_name,
        'username', username,
        'avatarPath', avatar_path,
        'relation', relation,
        'requestId', request_id,
        'connectedAt', connected_at
      ) order by connected_at desc, profile_id desc)
      from visible_page
    ), '[]'::jsonb),
    'nextCursor', (
      select jsonb_build_object(
        'createdAt', connected_at,
        'profileId', profile_id
      ) from next_item
    )
  ) into result;
  return result;
end;
$$;

create or replace function public.get_social_suggestions(
  cursor_score integer default null,
  cursor_profile_id uuid default null,
  page_size integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_campus_id uuid;
  safe_page_size integer := greatest(1, least(coalesce(page_size, 20), 50));
  result jsonb;
begin
  select campus_id into actor_campus_id
  from public.profiles
  where id = actor_id
    and email_domain_verified_at is not null
    and onboarding_completed_at is not null
    and deletion_requested_at is null
    and banned_at is null;

  if actor_campus_id is null then
    raise exception using errcode = '42501', message = 'PROFILE_NOT_ELIGIBLE';
  end if;

  with candidates as (
    select
      candidate.id as profile_id,
      candidate.display_name,
      candidate.username,
      candidate.avatar_path,
      (
        select count(*)::integer
        from public.friendships as actor_friendship
        join public.friendships as candidate_friendship
          on (
            case
              when actor_friendship.user_low_id = actor_id
                then actor_friendship.user_high_id
              else actor_friendship.user_low_id
            end
          ) = (
            case
              when candidate_friendship.user_low_id = candidate.id
                then candidate_friendship.user_high_id
              else candidate_friendship.user_low_id
            end
          )
        where (actor_friendship.user_low_id = actor_id
          or actor_friendship.user_high_id = actor_id)
          and (candidate_friendship.user_low_id = candidate.id
          or candidate_friendship.user_high_id = candidate.id)
      ) as mutual_friends,
      (
        select count(distinct actor_org.organization_id)::integer
        from public.organization_members as actor_org
        join public.organization_members as candidate_org
          on candidate_org.organization_id = actor_org.organization_id
         and candidate_org.profile_id = candidate.id
         and candidate_org.status = 'active'
        where actor_org.profile_id = actor_id and actor_org.status = 'active'
      ) as shared_organizations,
      (
        select count(distinct actor_checkin.event_id)::integer
        from public.event_checkins as actor_checkin
        join public.event_checkins as candidate_checkin
          on candidate_checkin.event_id = actor_checkin.event_id
         and candidate_checkin.profile_id = candidate.id
        where actor_checkin.profile_id = actor_id
      ) as shared_events,
      (
        select count(distinct actor_interest.interest_id)::integer
        from public.profile_interests as actor_interest
        join public.profile_interests as candidate_interest
          on candidate_interest.interest_id = actor_interest.interest_id
         and candidate_interest.profile_id = candidate.id
        where actor_interest.profile_id = actor_id
      ) as shared_interests
    from public.profiles as candidate
    join public.profile_preferences as preference on preference.profile_id = candidate.id
    where candidate.id <> actor_id
      and candidate.campus_id = actor_campus_id
      and candidate.email_domain_verified_at is not null
      and candidate.onboarding_completed_at is not null
      and candidate.deletion_requested_at is null
      and candidate.banned_at is null
      and preference.show_in_social_suggestions
      and preference.profile_visibility <> 'private'
      and not public.is_blocked_between(actor_id, candidate.id)
      and not ruckus_private.are_friends(actor_id, candidate.id)
      and not exists (
        select 1 from public.friend_requests
        where user_low_id = least(actor_id, candidate.id)
          and user_high_id = greatest(actor_id, candidate.id)
          and status = 'pending'
      )
  ), scored as (
    select *,
      mutual_friends * 20
      + shared_organizations * 16
      + least(shared_events, 5) * 8
      + least(shared_interests, 5) * 3
      + 1 as suggestion_score
    from candidates
  ), page as (
    select * from scored
    where cursor_score is null
      or suggestion_score < cursor_score
      or (suggestion_score = cursor_score and profile_id > cursor_profile_id)
    order by suggestion_score desc, profile_id
    limit safe_page_size + 1
  ), visible_page as (
    select * from page order by suggestion_score desc, profile_id limit safe_page_size
  ), next_item as (
    select * from page order by suggestion_score desc, profile_id
    offset safe_page_size limit 1
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'profileId', profile_id,
        'displayName', display_name,
        'username', username,
        'avatarPath', avatar_path,
        'mutualFriends', mutual_friends,
        'sharedOrganizations', shared_organizations,
        'sharedEvents', shared_events,
        'sharedInterests', shared_interests,
        'explanation', case
          when mutual_friends > 0 then mutual_friends || case when mutual_friends = 1 then ' mutual friend' else ' mutual friends' end
          when shared_organizations > 0 then 'From an organization you share'
          when shared_events > 0 then 'You attended some of the same events'
          when shared_interests > 0 then 'Similar campus interests'
          else 'At your campus'
        end
      ) order by suggestion_score desc, profile_id)
      from visible_page
    ), '[]'::jsonb),
    'nextCursor', (
      select jsonb_build_object('score', suggestion_score, 'profileId', profile_id)
      from next_item
    )
  ) into result;
  return result;
end;
$$;

create or replace function public.get_social_profile(target_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_campus_id uuid;
  target_campus_id uuid;
  target_visibility public.profile_visibility;
  suggestion_opt_in boolean;
begin
  if actor_id is null or public.is_blocked_between(actor_id, target_profile_id) then
    raise exception using errcode = '42501', message = 'PROFILE_ACCESS_DENIED';
  end if;
  select campus_id into actor_campus_id from public.profiles where id = actor_id;
  select profile.campus_id, preference.profile_visibility,
         preference.show_in_social_suggestions
  into target_campus_id, target_visibility, suggestion_opt_in
  from public.profiles as profile
  join public.profile_preferences as preference on preference.profile_id = profile.id
  where profile.id = target_profile_id
    and profile.deletion_requested_at is null
    and profile.banned_at is null;

  if target_campus_id is null or not (
    actor_id = target_profile_id
    or (target_visibility = 'campus' and actor_campus_id = target_campus_id)
    or ruckus_private.are_friends(actor_id, target_profile_id)
    or (suggestion_opt_in and actor_campus_id = target_campus_id)
  ) then
    raise exception using errcode = '42501', message = 'PROFILE_ACCESS_DENIED';
  end if;

  return (
    select jsonb_build_object(
      'id', profile.id,
      'displayName', profile.display_name,
      'username', profile.username,
      'avatarPath', profile.avatar_path,
      'bio', case
        when actor_id = target_profile_id
          or target_visibility = 'campus'
          or ruckus_private.are_friends(actor_id, target_profile_id)
        then profile.bio else null end,
      'campusName', campus.name,
      'isFriend', ruckus_private.are_friends(actor_id, target_profile_id),
      'isFollowing', exists (
        select 1 from public.user_follows
        where follower_id = actor_id and followed_id = target_profile_id and status = 'active'
      ),
      'followStatus', (
        select status::text from public.user_follows
        where follower_id = actor_id and followed_id = target_profile_id
      ),
      'followsYou', exists (
        select 1 from public.user_follows
        where follower_id = target_profile_id and followed_id = actor_id and status = 'active'
      ),
      'friendRequestStatus', case
        when ruckus_private.are_friends(actor_id, target_profile_id) then 'accepted'
        else (
          select status::text from public.friend_requests
          where user_low_id = least(actor_id, target_profile_id)
            and user_high_id = greatest(actor_id, target_profile_id)
            and status = 'pending'
          limit 1
        )
      end,
      'friendRequestDirection', (
        select case when requester_id = actor_id then 'outgoing' else 'incoming' end
        from public.friend_requests
        where user_low_id = least(actor_id, target_profile_id)
          and user_high_id = greatest(actor_id, target_profile_id)
          and status = 'pending'
        limit 1
      ),
      'mutualFriends', (
        select count(*)
        from public.friendships as first_friendship
        join public.friendships as second_friendship
          on (
            case when first_friendship.user_low_id = actor_id
              then first_friendship.user_high_id else first_friendship.user_low_id end
          ) = (
            case when second_friendship.user_low_id = target_profile_id
              then second_friendship.user_high_id else second_friendship.user_low_id end
          )
        where (first_friendship.user_low_id = actor_id or first_friendship.user_high_id = actor_id)
          and (second_friendship.user_low_id = target_profile_id or second_friendship.user_high_id = target_profile_id)
      )
    )
    from public.profiles as profile
    join public.campuses as campus on campus.id = profile.campus_id
    where profile.id = target_profile_id
  );
end;
$$;

create or replace function public.get_friends_attending(
  target_event_id uuid,
  page_size integer default 12
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  event_record public.events%rowtype;
  actor_campus_id uuid;
  actor_confirmed boolean;
  safe_page_size integer := greatest(1, least(coalesce(page_size, 12), 50));
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  select * into event_record from public.events where id = target_event_id;
  select campus_id into actor_campus_id from public.profiles where id = actor_id;
  actor_confirmed := exists (
    select 1 from public.event_rsvps
    where event_id = target_event_id and profile_id = actor_id and status = 'confirmed'
  );

  if event_record.id is null
    or not event_record.attendee_list_visible
    or event_record.status not in ('published', 'completed')
    or event_record.moderation_restricted
    or not (
      event_record.visibility = 'public'
      or (event_record.visibility = 'campus' and event_record.campus_id = actor_campus_id)
      or actor_confirmed
    ) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'profileId', attendee.id,
      'displayName', attendee.display_name,
      'username', attendee.username,
      'avatarPath', attendee.avatar_path,
      'isFriend', ruckus_private.are_friends(actor_id, attendee.id)
    ) order by attendee.display_name, attendee.id)
    from (
      select profile.*
      from public.event_rsvps as rsvp
      join public.profiles as profile on profile.id = rsvp.profile_id
      join public.profile_preferences as preference on preference.profile_id = profile.id
      where rsvp.event_id = target_event_id
        and rsvp.status = 'confirmed'
        and profile.id <> actor_id
        and profile.deletion_requested_at is null
        and profile.banned_at is null
        and not public.is_blocked_between(actor_id, profile.id)
        and (
          (preference.attendance_visibility = 'friends'
            and ruckus_private.are_friends(actor_id, profile.id))
          or (preference.attendance_visibility = 'confirmed_attendees' and actor_confirmed)
        )
      order by profile.display_name, profile.id
      limit safe_page_size
    ) as attendee
  ), '[]'::jsonb);
end;
$$;

revoke execute on function ruckus_private.are_friends(uuid, uuid)
from public, anon, authenticated;
revoke execute on function ruckus_private.social_pair_allowed(uuid, uuid)
from public, anon, authenticated;
revoke execute on function ruckus_private.record_social_audit(uuid, text, uuid, jsonb)
from public, anon, authenticated;
revoke execute on function ruckus_private.queue_social_notification(uuid, text, uuid, uuid)
from public, anon, authenticated;
revoke execute on function ruckus_private.apply_social_block_override()
from public, anon, authenticated;

revoke execute on function public.set_social_preferences(
  public.profile_visibility,
  public.attendance_visibility,
  boolean,
  public.follow_policy,
  boolean
) from public, anon;
revoke execute on function public.follow_user(uuid) from public, anon;
revoke execute on function public.respond_to_follow_request(uuid, boolean) from public, anon;
revoke execute on function public.unfollow_user(uuid) from public, anon;
revoke execute on function public.send_friend_request(uuid) from public, anon;
revoke execute on function public.respond_to_friend_request(uuid, boolean) from public, anon;
revoke execute on function public.cancel_friend_request(uuid) from public, anon;
revoke execute on function public.remove_friend(uuid) from public, anon;
revoke execute on function public.unblock_user(uuid) from public, anon;
revoke execute on function public.get_social_overview() from public, anon;
revoke execute on function public.get_social_connections(text, timestamptz, uuid, integer)
from public, anon;
revoke execute on function public.get_social_suggestions(integer, uuid, integer)
from public, anon;
revoke execute on function public.get_social_profile(uuid) from public, anon;
revoke execute on function public.get_friends_attending(uuid, integer) from public, anon;

grant execute on function public.set_social_preferences(
  public.profile_visibility,
  public.attendance_visibility,
  boolean,
  public.follow_policy,
  boolean
) to authenticated;
grant execute on function public.follow_user(uuid) to authenticated;
grant execute on function public.respond_to_follow_request(uuid, boolean) to authenticated;
grant execute on function public.unfollow_user(uuid) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.get_social_overview() to authenticated;
grant execute on function public.get_social_connections(text, timestamptz, uuid, integer)
to authenticated;
grant execute on function public.get_social_suggestions(integer, uuid, integer)
to authenticated;
grant execute on function public.get_social_profile(uuid) to authenticated;
grant execute on function public.get_friends_attending(uuid, integer) to authenticated;

comment on table public.user_follows is
  'Private follow graph. pending rows are approval requests; direct client access is revoked.';
comment on table public.friendships is
  'Canonical undirected friendship pairs; the lower UUID is always stored first.';
comment on function public.get_friends_attending(uuid, integer) is
  'Returns only confirmed attendees allowed by event, relationship, block, and attendance privacy.';
