begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(27);

create function pg_temp.set_actor(actor_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', actor_id, 'role', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', actor_id::text, true);
end;
$$;

create function pg_temp.operation_fails(command text)
returns boolean
language plpgsql
as $$
begin
  execute command;
  return false;
exception when others then
  return true;
end;
$$;

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');

select is(
  public.get_social_overview() #>> '{counts,friends}',
  '0',
  'a user starts with no friendships'
);

select lives_ok(
  $$select public.set_social_preferences(
    'campus', 'friends', true, 'public', true
  )$$,
  'a user can update only their own social privacy preferences'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000002');
select lives_ok(
  $$select public.set_social_preferences(
    'campus', 'friends', true, 'public', true
  )$$,
  'a target can opt into public follows and campus suggestions'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select is(
  public.follow_user('10000000-0000-4000-8000-000000000002')::text,
  'active',
  'public follow policy activates a follow immediately'
);

select is(
  public.follow_user('10000000-0000-4000-8000-000000000002')::text,
  'active',
  'following is idempotent'
);

select is(
  public.get_social_overview() #>> '{counts,following}',
  '1',
  'the social overview counts active following relationships'
);

select is(
  public.send_friend_request('10000000-0000-4000-8000-000000000002') ->> 'status',
  'pending',
  'an eligible same-campus user can send a friend request'
);

select is(
  public.send_friend_request('10000000-0000-4000-8000-000000000002') ->> 'alreadyPending',
  'true',
  'friend request retries return the existing open request'
);

select is(
  public.get_social_profile('10000000-0000-4000-8000-000000000002')
    ->> 'friendRequestStatus',
  'pending',
  'a social profile exposes the pending request state to its requester'
);

select is(
  public.get_social_profile('10000000-0000-4000-8000-000000000002')
    ->> 'friendRequestDirection',
  'outgoing',
  'a social profile identifies the requester direction without exposing the table'
);

select set_config(
  'test.friend_request_id',
  public.send_friend_request('10000000-0000-4000-8000-000000000002') ->> 'id',
  true
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000002');
select is(
  public.get_social_connections('friend_requests') #>> '{items,0,profileId}',
  '10000000-0000-4000-8000-000000000001',
  'only the addressee can list the incoming request'
);

select is(
  public.respond_to_friend_request(
    current_setting('test.friend_request_id')::uuid,
    true
  )::text,
  'accepted',
  'the addressee can accept the friend request'
);

select is(
  public.get_social_overview() #>> '{counts,friends}',
  '1',
  'an accepted request creates one canonical friendship'
);

select ok(
  pg_temp.operation_fails($$select count(*) from public.friendships$$),
  'relationship tables cannot be directly enumerated by clients'
);

reset role;
update public.events
set attendee_list_visible = true
where id = '70000000-0000-4000-8000-000000000001';
insert into public.event_rsvps (event_id, profile_id, status)
values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'confirmed'),
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'confirmed')
on conflict (event_id, profile_id) do update
set status = 'confirmed', waitlist_position = null, cancelled_at = null;

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select is(
  public.get_friends_attending('70000000-0000-4000-8000-000000000001')
    #>> '{0,profileId}',
  '10000000-0000-4000-8000-000000000002',
  'friends attending exposes only confirmed privacy-eligible friends'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000002');
select lives_ok(
  $$select public.set_social_preferences(
    'campus', 'private', true, 'public', true
  )$$,
  'attendance can be made private independently from profile visibility'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select is(
  jsonb_array_length(
    public.get_friends_attending('70000000-0000-4000-8000-000000000001')
  ),
  0,
  'private attendance is not exposed even to friends'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000003');
select lives_ok(
  $$select public.set_social_preferences(
    'campus', 'friends', true, 'approval', true
  )$$,
  'a user can opt into suggestions while requiring follow approval'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select is(
  public.get_social_suggestions() #>> '{items,0,profileId}',
  '10000000-0000-4000-8000-000000000003',
  'suggestions return an opted-in eligible campus profile'
);

select is(
  public.follow_user('10000000-0000-4000-8000-000000000003')::text,
  'pending',
  'approval follow policy creates a pending follow request'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000003');
select is(
  public.respond_to_follow_request(
    '10000000-0000-4000-8000-000000000001', true
  ),
  'active',
  'a target can accept an incoming follow request'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select lives_ok(
  $$select public.block_user('10000000-0000-4000-8000-000000000002')$$,
  'the existing trusted block operation remains callable'
);

select ok(
  jsonb_array_length(public.get_social_connections('friends') -> 'items') = 0,
  'blocking immediately removes friendship visibility'
);

select ok(
  pg_temp.operation_fails(
    $$select public.send_friend_request('10000000-0000-4000-8000-000000000002')$$
  ),
  'blocking prevents new social relationships'
);

select ok(
  public.unblock_user('10000000-0000-4000-8000-000000000002'),
  'the blocker can explicitly unblock the target'
);

reset role;
insert into public.campuses (id, name, email_domain)
values (
  '00000000-0000-4000-8000-000000000002',
  'Second Test Campus',
  'second.example.edu'
);
update public.profiles
set campus_id = '00000000-0000-4000-8000-000000000002'
where id = '10000000-0000-4000-8000-000000000004';

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');
select ok(
  pg_temp.operation_fails(
    $$select public.send_friend_request('10000000-0000-4000-8000-000000000004')$$
  ),
  'cross-campus friend requests are denied'
);

select ok(
  pg_temp.operation_fails(
    $$insert into public.friendships (user_low_id, user_high_id)
      values (
        '10000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000003'
      )$$
  ),
  'clients cannot forge friendships directly'
);

select * from finish();
rollback;
