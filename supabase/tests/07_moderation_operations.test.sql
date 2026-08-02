begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(17);

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
  )
on conflict (event_id, profile_id) do update
set status = excluded.status,
    waitlist_position = null,
    cancelled_at = null;

insert into public.event_chat_members (event_id, profile_id)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  )
on conflict (event_id, profile_id) do update
set is_active = true, revoked_at = null;

select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');

insert into public.event_messages (id, event_id, sender_id, body)
values (
  '88000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Moderation report fixture'
);

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000002');

select isnt(
  public.report_event_message(
    '88000000-0000-4000-8000-000000000001',
    'Harassment in event chat',
    'Repeated unwanted comments.'
  ),
  null::uuid,
  'an eligible event-chat member can report another member message'
);

select is(
  (
    select count(*)
    from public.moderation_cases as moderation_case
    join public.reports as report on report.id = moderation_case.report_id
    where report.target_event_message_id = '88000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'a reporter cannot inspect the internal moderation case directly'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');

select ok(
  pg_temp.operation_fails(
    $$select public.report_event_message(
      '88000000-0000-4000-8000-000000000001',
      'Self report',
      null
    )$$
  ),
  'a sender cannot report their own event message'
);

select ok(
  pg_temp.operation_fails(
    $$select public.get_moderation_queue(null, null, null, 25, 0)$$
  ),
  'a non-admin cannot read the moderation queue'
);

select ok(
  pg_temp.operation_fails(
    $$select public.update_moderation_case(
      (
        select moderation_case.id
        from public.moderation_cases as moderation_case
        join public.reports as report on report.id = moderation_case.report_id
        where report.target_event_message_id = '88000000-0000-4000-8000-000000000001'
      ),
      'under_review',
      3,
      'Unauthorized update'
    )$$
  ),
  'a non-admin cannot update a moderation case'
);

select ok(
  pg_temp.operation_fails(
    $$select public.apply_moderation_action(
      (
        select moderation_case.id
        from public.moderation_cases as moderation_case
        join public.reports as report on report.id = moderation_case.report_id
        where report.target_event_message_id = '88000000-0000-4000-8000-000000000001'
      ),
      'remove_content',
      'Unauthorized action',
      null
    )$$
  ),
  'a non-admin cannot apply an enforcement action'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000008');

select is(
  public.get_moderation_queue(null, null, 'Harassment', 25, 0) #>> '{items,0,severity}',
  '3',
  'an admin can search the queue and receives the taxonomy-assigned severity'
);

select lives_ok(
  format(
    'select public.update_moderation_case(%L::uuid, %L::public.moderation_case_status, 4::smallint, %L::text)',
    (
      select moderation_case.id
      from public.moderation_cases as moderation_case
      join public.reports as report on report.id = moderation_case.report_id
      where report.target_event_message_id = '88000000-0000-4000-8000-000000000001'
    ),
    'under_review',
    'Safety review in progress'
  ),
  'an admin can assign and update a moderation case'
);

select is(
  (
    select moderation_case.assigned_to
    from public.moderation_cases as moderation_case
    join public.reports as report on report.id = moderation_case.report_id
    where report.target_event_message_id = '88000000-0000-4000-8000-000000000001'
  ),
  '10000000-0000-4000-8000-000000000008'::uuid,
  'moving a case under review assigns the acting admin'
);

select lives_ok(
  format(
    'select public.apply_moderation_action(%L, %L, %L, null)',
    (
      select moderation_case.id
      from public.moderation_cases as moderation_case
      join public.reports as report on report.id = moderation_case.report_id
      where report.target_event_message_id = '88000000-0000-4000-8000-000000000001'
    ),
    'remove_content',
    'Remove reported harassment'
  ),
  'an admin can remove reported message content'
);

select is(
  (
    select body
    from public.get_event_messages('70000000-0000-4000-8000-000000000001') as page,
      jsonb_array_elements_text(
        jsonb_path_query_array(page, '$[*] ? (@.id == "88000000-0000-4000-8000-000000000001").body')
      ) as body
    limit 1
  ),
  'Message removed',
  'removed event-message bodies are redacted by the trusted read model'
);

select is(
  (
    select count(*)
    from public.moderation_actions as action
    join public.moderation_cases as moderation_case on moderation_case.id = action.case_id
    join public.reports as report on report.id = moderation_case.report_id
    where report.target_event_message_id = '88000000-0000-4000-8000-000000000001'
      and action.action = 'remove_content'
  ),
  1::bigint,
  'the enforcement action is written to the audit history'
);

select is(
  (
    select moderation_case.status::text
    from public.moderation_cases as moderation_case
    join public.reports as report on report.id = moderation_case.report_id
    where report.target_event_message_id = '88000000-0000-4000-8000-000000000001'
  ),
  'resolved',
  'an enforcement action resolves the moderation case'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000002');
select set_config(
  'test.moderation.event_report_id',
  public.report_event(
    '70000000-0000-4000-8000-000000000001',
    'Unsafe event operation',
    'Fixture for event cancellation enforcement.'
  )::text,
  true
);
select pg_temp.set_actor('10000000-0000-4000-8000-000000000008');

select lives_ok(
  format(
    'select public.apply_moderation_action(%L, %L, %L, null)',
    (
      select id from public.moderation_cases
      where report_id = current_setting('test.moderation.event_report_id')::uuid
    ),
    'cancel_event',
    'Cancelled after verified safety review'
  ),
  'an admin can cancel a reported event without a schema error'
);
select is(
  (select status::text from public.events
    where id = '70000000-0000-4000-8000-000000000001'),
  'cancelled',
  'moderation cancellation moves the event into the cancelled lifecycle state'
);
select ok(
  not exists (
    select 1 from public.event_chat_members
    where event_id = '70000000-0000-4000-8000-000000000001' and is_active
  ),
  'moderation cancellation revokes event chat without violating membership constraints'
);
select is(
  (select count(*) from public.event_rsvps
    where event_id = '70000000-0000-4000-8000-000000000001'
      and status = 'cancelled'
      and status_reason = 'Cancelled after verified safety review'),
  2::bigint,
  'moderation cancellation records its reason in the RSVP status-reason field'
);

select * from finish();
rollback;
