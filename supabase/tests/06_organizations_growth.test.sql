begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(20);

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
select pg_temp.set_actor('10000000-0000-4000-8000-000000000007');

select is(
  jsonb_array_length(public.get_my_organizations()),
  1,
  'the seeded owner can list the organization'
);

select is(
  public.get_organization_dashboard('60000000-0000-4000-8000-000000000001')
    #>> '{membership,role}',
  'owner',
  'the dashboard returns the caller organization role'
);

select lives_ok(
  $$select public.invite_organization_member(
    '60000000-0000-4000-8000-000000000001',
    'jordan_demo',
    'event_manager'
  )$$,
  'an owner can invite an eligible same-campus username'
);

select is(
  (
    select status::text
    from public.organization_members
    where organization_id = '60000000-0000-4000-8000-000000000001'
      and profile_id = '10000000-0000-4000-8000-000000000002'
  ),
  'invited',
  'the invitation remains pending until the target accepts'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000001');

select ok(
  pg_temp.operation_fails(
    $$select public.invite_organization_member(
      '60000000-0000-4000-8000-000000000001',
      'avery_demo',
      'viewer'
    )$$
  ),
  'an unrelated user cannot invite organization members'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000002');

select is(
  (public.get_organization_dashboard('60000000-0000-4000-8000-000000000001')
    -> 'members'),
  '[]'::jsonb,
  'an invited member cannot enumerate the officer directory'
);

select is(
  public.respond_to_organization_invitation(
    '60000000-0000-4000-8000-000000000001', true
  )::text,
  'active',
  'the invited user can accept their own invitation'
);

select is(
  public.get_organization_dashboard('60000000-0000-4000-8000-000000000001')
    #>> '{membership,role}',
  'event_manager',
  'the accepted user receives only the invited role'
);

select ok(
  pg_temp.operation_fails(
    $$select public.change_organization_member_role(
      '60000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'admin'
    )$$
  ),
  'an event manager cannot promote themselves'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000007');

select lives_ok(
  $$select public.change_organization_member_role(
    '60000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'moderator'
  )$$,
  'the owner can assign a scoped non-owner role'
);

select is(
  (
    select count(*)
    from public.organization_audit_log
    where organization_id = '60000000-0000-4000-8000-000000000001'
      and action = 'member_role_changed'
  ),
  1::bigint,
  'a role change creates an organization audit entry'
);

select lives_ok(
  $$select public.submit_organization_verification(
    '60000000-0000-4000-8000-000000000001',
    'verification',
    '{"relationship":"Registered campus club officer","contact":"activities@example.edu"}'::jsonb
  )$$,
  'an organization manager can submit reviewable verification evidence'
);

select ok(
  pg_temp.operation_fails(
    $$select public.submit_organization_verification(
      '60000000-0000-4000-8000-000000000001',
      'verification',
      '{"relationship":"Registered campus club officer","contact":"activities@example.edu"}'::jsonb
    )$$
  ),
  'only one open verification request is permitted'
);

select is(
  public.ensure_user_referral_code(),
  public.ensure_user_referral_code(),
  'a user referral code is stable and idempotent'
);

select set_config('test.referral_code', public.ensure_user_referral_code(), true);

select ok(
  pg_temp.operation_fails(
    format(
      'select public.attribute_referral(%L)',
      public.ensure_user_referral_code()
    )
  ),
  'self-referral is rejected'
);

select pg_temp.set_actor('10000000-0000-4000-8000-000000000003');

select is(
  public.attribute_referral(current_setting('test.referral_code'))::text,
  'attributed',
  'an eligible same-campus user can attribute one referral code'
);

select ok(
  pg_temp.operation_fails(
    $$insert into public.referrals (referral_code_id, referred_profile_id)
      select id, '10000000-0000-4000-8000-000000000004'
      from public.referral_codes limit 1$$
  ),
  'clients cannot forge referral rows directly'
);

select is(
  public.request_data_export() ->> 'id',
  public.request_data_export() ->> 'id',
  'an open data-export request is idempotent'
);

reset role;

insert into public.event_checkin_tokens (
  id, event_id, created_by, token_digest, valid_from, expires_at
) values (
  '83000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000007',
  repeat('a', 64),
  now(),
  now() + interval '5 minutes'
);

insert into public.event_checkins (event_id, profile_id, checkin_token_id)
values (
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000003',
  '83000000-0000-4000-8000-000000000001'
);

select is(
  (
    select status::text from public.referrals
    where referred_profile_id = '10000000-0000-4000-8000-000000000003'
  ),
  'qualified',
  'a referral qualifies only after a verified event check-in'
);

set local role authenticated;
select pg_temp.set_actor('10000000-0000-4000-8000-000000000003');

select ok(
  pg_temp.operation_fails(
    $$update public.organizations
      set is_verified = true
      where id = '60000000-0000-4000-8000-000000000001'$$
  ),
  'a client cannot grant an organization verified status'
);

select * from finish();
rollback;
