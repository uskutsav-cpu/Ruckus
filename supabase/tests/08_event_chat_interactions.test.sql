begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

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

insert into public.event_rsvps (event_id, profile_id, status)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'confirmed'
  ),
  (
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'confirmed'
  );

insert into public.event_chat_members (event_id, profile_id)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  );

select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');

insert into public.event_messages (id, event_id, sender_id, body)
values (
  '89000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Reaction fixture'
);

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000002');

select lives_ok(
  $$select public.set_event_message_reaction(
    '89000000-0000-4000-8000-000000000001', '👍', true
  )$$,
  'a confirmed chat member can react to a visible message'
);

select lives_ok(
  $$select public.set_event_message_reaction(
    '89000000-0000-4000-8000-000000000001', '👍', true
  )$$,
  'adding the same reaction is idempotent'
);

select is(
  public.get_event_messages('70000000-0000-4000-8000-000000000001')
    #>> '{0,reactions,0,count}',
  '1',
  'an idempotent reaction creates only one row'
);

select is(
  public.get_event_messages('70000000-0000-4000-8000-000000000001')
    #>> '{0,reactions,0,reaction}',
  '👍',
  'the trusted message model returns only an aggregate reaction value'
);

select is(
  public.get_event_messages('70000000-0000-4000-8000-000000000001')
    #>> '{0,reactions,0,reactedByMe}',
  'true',
  'the aggregate identifies the current user reaction without listing reactors'
);

select ok(
  pg_temp.operation_fails(
    $$select public.set_event_message_reaction(
      '89000000-0000-4000-8000-000000000001', 'custom', true
    )$$
  ),
  'arbitrary reaction payloads are rejected'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000003');

select ok(
  pg_temp.operation_fails(
    $$select public.set_event_message_reaction(
      '89000000-0000-4000-8000-000000000001', '❤️', true
    )$$
  ),
  'a nonmember cannot react to a private event message'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000002');

select lives_ok(
  $$select public.set_event_message_reaction(
    '89000000-0000-4000-8000-000000000001', '👍', false
  )$$,
  'a member can remove only their own reaction idempotently'
);

select * from finish();
rollback;
