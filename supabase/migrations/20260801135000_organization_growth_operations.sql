-- Trusted organization membership, referral attribution, and privacy-request APIs.

create or replace function ruckus_private.organization_role_for(
  target_organization_id uuid,
  target_profile_id uuid
)
returns public.organization_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.organization_members
  where organization_id = target_organization_id
    and profile_id = target_profile_id
    and status = 'active';
$$;

create or replace function ruckus_private.get_my_organizations()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', organization.id,
      'slug', organization.slug,
      'name', organization.name,
      'description', organization.description,
      'campusId', organization.campus_id,
      'campusName', campus.name,
      'logoPath', organization.logo_path,
      'bannerPath', organization.banner_path,
      'websiteUrl', organization.website_url,
      'isVerified', organization.is_verified,
      'isRestricted', organization.is_restricted,
      'role', member.role,
      'membershipStatus', member.status
    ) order by organization.name
  ), '[]'::jsonb)
  from public.organization_members as member
  join public.organizations as organization on organization.id = member.organization_id
  join public.campuses as campus on campus.id = organization.campus_id
  where member.profile_id = (select auth.uid())
    and member.status in ('invited', 'active');
$$;

create or replace function public.get_my_organizations()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select ruckus_private.get_my_organizations();
$$;

create or replace function ruckus_private.get_organization_dashboard(
  target_organization_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  result jsonb;
begin
  if not exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and profile_id = actor_id
      and status in ('invited', 'active')
  ) and not public.is_admin() then
    raise exception using errcode = '42501', message = 'ORGANIZATION_MEMBERSHIP_REQUIRED';
  end if;

  select jsonb_build_object(
    'organization', jsonb_build_object(
      'id', organization.id,
      'slug', organization.slug,
      'name', organization.name,
      'description', organization.description,
      'campusId', organization.campus_id,
      'campusName', campus.name,
      'logoPath', organization.logo_path,
      'bannerPath', organization.banner_path,
      'contactEmail', case
        when ruckus_private.can_manage_organization(organization.id, actor_id)
          then organization.contact_email
        else null
      end,
      'websiteUrl', organization.website_url,
      'socialLinks', organization.social_links,
      'isVerified', organization.is_verified,
      'isRestricted', organization.is_restricted
    ),
    'membership', (
      select jsonb_build_object('role', own_member.role, 'status', own_member.status)
      from public.organization_members as own_member
      where own_member.organization_id = organization.id
        and own_member.profile_id = actor_id
    ),
    'members', case
      when ruckus_private.can_manage_organization(organization.id, actor_id)
        or public.is_admin()
      then coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', member.id,
          'profileId', member.profile_id,
          'displayName', profile.display_name,
          'username', profile.username,
          'role', member.role,
          'status', member.status,
          'invitedAt', member.invited_at,
          'acceptedAt', member.accepted_at
        ) order by
          case member.role when 'owner' then 1 when 'admin' then 2 else 3 end,
          profile.display_name,
          member.id
        )
        from public.organization_members as member
        join public.profiles as profile on profile.id = member.profile_id
        where member.organization_id = organization.id
          and member.status <> 'removed'
      ), '[]'::jsonb)
      else '[]'::jsonb
    end,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', event.id,
        'title', event.title,
        'startsAt', event.starts_at,
        'status', event.status,
        'capacity', event.capacity,
        'confirmedCount', (
          select count(*)
          from public.event_rsvps
          where event_id = event.id and status = 'confirmed'
        )
      ) order by event.starts_at desc, event.id)
      from public.events as event
      where event.organization_id = organization.id
        and (
          event.status = 'published'
          or ruckus_private.can_manage_organization(organization.id, actor_id)
          or public.is_admin()
        )
    ), '[]'::jsonb),
    'verificationRequests', case
      when ruckus_private.can_manage_organization(organization.id, actor_id)
        or public.is_admin()
      then coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', request.id,
          'requestKind', request.request_kind,
          'status', request.status,
          'createdAt', request.created_at,
          'reviewedAt', request.reviewed_at,
          'reviewNotes', request.review_notes
        ) order by request.created_at desc)
        from public.organization_verification_requests as request
        where request.organization_id = organization.id
      ), '[]'::jsonb)
      else '[]'::jsonb
    end
  ) into result
  from public.organizations as organization
  join public.campuses as campus on campus.id = organization.campus_id
  where organization.id = target_organization_id;

  if result is null then
    raise exception using errcode = 'P0002', message = 'ORGANIZATION_NOT_FOUND';
  end if;
  return result;
end;
$$;

create or replace function public.get_organization_dashboard(target_organization_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select ruckus_private.get_organization_dashboard(target_organization_id);
$$;

create or replace function ruckus_private.invite_organization_member(
  target_organization_id uuid,
  target_username text,
  target_role public.organization_role
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.organization_role;
  target_profile public.profiles%rowtype;
  organization_record public.organizations%rowtype;
  member_id uuid;
begin
  actor_role := ruckus_private.organization_role_for(target_organization_id, actor_id);
  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception using errcode = '42501', message = 'ORGANIZATION_ADMIN_REQUIRED';
  end if;
  if target_role = 'owner' or (target_role = 'admin' and actor_role <> 'owner') then
    raise exception using errcode = '42501', message = 'ORGANIZATION_ROLE_NOT_ASSIGNABLE';
  end if;

  select * into organization_record
  from public.organizations where id = target_organization_id and not is_restricted;
  select * into target_profile
  from public.profiles where lower(username) = lower(trim(target_username));

  if target_profile.id is null
    or target_profile.campus_id <> organization_record.campus_id
    or not ruckus_private.profile_is_ready(target_profile.id)
  then
    raise exception using errcode = 'P0002', message = 'ELIGIBLE_MEMBER_NOT_FOUND';
  end if;
  if target_profile.id = actor_id then
    raise exception using errcode = '22023', message = 'CANNOT_INVITE_SELF';
  end if;

  insert into public.organization_members (
    organization_id, profile_id, role, status, invited_by, invited_at,
    accepted_at, removed_at
  ) values (
    target_organization_id, target_profile.id, target_role, 'invited', actor_id, now(),
    null, null
  )
  on conflict (organization_id, profile_id) do update
  set role = excluded.role,
      status = 'invited',
      invited_by = actor_id,
      invited_at = now(),
      accepted_at = null,
      removed_at = null,
      updated_at = now()
  where organization_members.status = 'removed'
  returning id into member_id;

  if member_id is null then
    raise exception using errcode = '23505', message = 'MEMBERSHIP_ALREADY_EXISTS';
  end if;

  insert into public.organization_audit_log (
    organization_id, actor_id, action, target_profile_id, metadata
  ) values (
    target_organization_id, actor_id, 'member_invited', target_profile.id,
    jsonb_build_object('role', target_role)
  );
  return member_id;
end;
$$;

create or replace function public.invite_organization_member(
  target_organization_id uuid,
  target_username text,
  target_role public.organization_role
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.invite_organization_member(
    target_organization_id, target_username, target_role
  );
$$;

create or replace function ruckus_private.respond_to_organization_invitation(
  target_organization_id uuid,
  accept_invitation boolean
)
returns public.organization_membership_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  next_status public.organization_membership_status;
begin
  next_status := case when accept_invitation then 'active' else 'removed' end;
  update public.organization_members
  set status = next_status,
      accepted_at = case when accept_invitation then now() else null end,
      removed_at = case when accept_invitation then null else now() end,
      updated_at = now()
  where organization_id = target_organization_id
    and profile_id = actor_id
    and status = 'invited';
  if not found then
    raise exception using errcode = 'P0002', message = 'INVITATION_NOT_FOUND';
  end if;

  insert into public.organization_audit_log (
    organization_id, actor_id, action, target_profile_id
  ) values (
    target_organization_id,
    actor_id,
    case when accept_invitation then 'invitation_accepted' else 'invitation_declined' end,
    actor_id
  );
  return next_status;
end;
$$;

create or replace function public.respond_to_organization_invitation(
  target_organization_id uuid,
  accept_invitation boolean
)
returns public.organization_membership_status
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.respond_to_organization_invitation(
    target_organization_id, accept_invitation
  );
$$;

create or replace function ruckus_private.change_organization_member_role(
  target_organization_id uuid,
  target_profile_id uuid,
  target_role public.organization_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.organization_role;
  existing_role public.organization_role;
begin
  actor_role := ruckus_private.organization_role_for(target_organization_id, actor_id);
  existing_role := ruckus_private.organization_role_for(
    target_organization_id, target_profile_id
  );
  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception using errcode = '42501', message = 'ORGANIZATION_ADMIN_REQUIRED';
  end if;
  if existing_role is null then
    raise exception using errcode = 'P0002', message = 'ACTIVE_MEMBER_NOT_FOUND';
  end if;
  if existing_role = 'owner' or target_role = 'owner'
    or (actor_role = 'admin' and (existing_role = 'admin' or target_role = 'admin'))
  then
    raise exception using errcode = '42501', message = 'ORGANIZATION_ROLE_NOT_ASSIGNABLE';
  end if;

  update public.organization_members
  set role = target_role, updated_at = now()
  where organization_id = target_organization_id
    and profile_id = target_profile_id
    and status = 'active';

  insert into public.organization_audit_log (
    organization_id, actor_id, action, target_profile_id, metadata
  ) values (
    target_organization_id, actor_id, 'member_role_changed', target_profile_id,
    jsonb_build_object('fromRole', existing_role, 'toRole', target_role)
  );
end;
$$;

create or replace function public.change_organization_member_role(
  target_organization_id uuid,
  target_profile_id uuid,
  target_role public.organization_role
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.change_organization_member_role(
    target_organization_id, target_profile_id, target_role
  );
$$;

create or replace function ruckus_private.remove_organization_member(
  target_organization_id uuid,
  target_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.organization_role;
  target_current_role public.organization_role;
begin
  actor_role := ruckus_private.organization_role_for(target_organization_id, actor_id);
  target_current_role := ruckus_private.organization_role_for(
    target_organization_id, target_profile_id
  );
  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception using errcode = '42501', message = 'ORGANIZATION_ADMIN_REQUIRED';
  end if;
  if target_current_role is null then
    raise exception using errcode = 'P0002', message = 'ACTIVE_MEMBER_NOT_FOUND';
  end if;
  if target_current_role = 'owner'
    or (actor_role = 'admin' and target_current_role = 'admin')
  then
    raise exception using errcode = '42501', message = 'ORGANIZATION_MEMBER_NOT_REMOVABLE';
  end if;

  update public.organization_members
  set status = 'removed', removed_at = now(), accepted_at = null, updated_at = now()
  where organization_id = target_organization_id and profile_id = target_profile_id;

  insert into public.organization_audit_log (
    organization_id, actor_id, action, target_profile_id,
    metadata
  ) values (
    target_organization_id, actor_id, 'member_removed', target_profile_id,
    jsonb_build_object('previousRole', target_current_role)
  );
end;
$$;

create or replace function public.remove_organization_member(
  target_organization_id uuid,
  target_profile_id uuid
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.remove_organization_member(
    target_organization_id, target_profile_id
  );
$$;

create or replace function ruckus_private.submit_organization_verification(
  target_organization_id uuid,
  request_kind text,
  evidence jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  request_id uuid;
begin
  if not ruckus_private.can_manage_organization(target_organization_id, actor_id) then
    raise exception using errcode = '42501', message = 'ORGANIZATION_MANAGER_REQUIRED';
  end if;
  if request_kind not in ('verification', 'claim')
    or jsonb_typeof(evidence) <> 'object'
    or pg_column_size(evidence) > 8192
  then
    raise exception using errcode = '22023', message = 'INVALID_VERIFICATION_REQUEST';
  end if;
  if not (evidence ? 'relationship' and evidence ? 'contact')
    or char_length(trim(evidence->>'relationship')) < 10
    or char_length(trim(evidence->>'contact')) < 3
  then
    raise exception using errcode = '22023', message = 'VERIFICATION_EVIDENCE_REQUIRED';
  end if;

  insert into public.organization_verification_requests (
    organization_id, requested_by, request_kind, evidence
  ) values (target_organization_id, actor_id, request_kind, evidence)
  returning id into request_id;

  insert into public.organization_audit_log (
    organization_id, actor_id, action, metadata
  ) values (
    target_organization_id, actor_id, 'verification_requested',
    jsonb_build_object('requestId', request_id, 'requestKind', request_kind)
  );
  return request_id;
end;
$$;

create or replace function public.submit_organization_verification(
  target_organization_id uuid,
  request_kind text,
  evidence jsonb
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.submit_organization_verification(
    target_organization_id, request_kind, evidence
  );
$$;

create or replace function ruckus_private.ensure_user_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_campus_id uuid;
  existing_code text;
  candidate text;
begin
  if not ruckus_private.profile_is_ready(actor_id) then
    raise exception using errcode = '42501', message = 'PROFILE_NOT_READY';
  end if;
  select code into existing_code
  from public.referral_codes
  where owner_profile_id = actor_id and kind = 'user' and is_active
  order by created_at limit 1;
  if existing_code is not null then return existing_code; end if;

  select campus_id into actor_campus_id from public.profiles where id = actor_id;
  loop
    candidate := upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 10));
    begin
      insert into public.referral_codes (code, kind, owner_profile_id, campus_id)
      values (candidate, 'user', actor_id, actor_campus_id);
      return candidate;
    exception when unique_violation then
      null;
    end;
  end loop;
end;
$$;

create or replace function public.ensure_user_referral_code()
returns text
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.ensure_user_referral_code();
$$;

create or replace function ruckus_private.attribute_referral(referral_code text)
returns public.referral_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  code_record public.referral_codes%rowtype;
  actor_campus_id uuid;
  existing_status public.referral_status;
begin
  if not ruckus_private.profile_is_ready(actor_id) then
    raise exception using errcode = '42501', message = 'PROFILE_NOT_READY';
  end if;
  select * into code_record
  from public.referral_codes
  where code = upper(trim(referral_code)) and is_active;
  if code_record.id is null then
    raise exception using errcode = 'P0002', message = 'REFERRAL_CODE_NOT_FOUND';
  end if;
  if code_record.owner_profile_id = actor_id then
    raise exception using errcode = '22023', message = 'SELF_REFERRAL_NOT_ALLOWED';
  end if;
  select campus_id into actor_campus_id from public.profiles where id = actor_id;
  if actor_campus_id <> code_record.campus_id then
    raise exception using errcode = '22023', message = 'REFERRAL_CAMPUS_MISMATCH';
  end if;

  select status into existing_status
  from public.referrals where referred_profile_id = actor_id;
  if existing_status is not null then return existing_status; end if;
  insert into public.referrals (referral_code_id, referred_profile_id)
  values (code_record.id, actor_id);
  return 'attributed';
end;
$$;

create or replace function public.attribute_referral(referral_code text)
returns public.referral_status
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.attribute_referral(referral_code);
$$;

create or replace function ruckus_private.qualify_referral_after_checkin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  referral_record record;
begin
  select referral.id, code.owner_profile_id, code.campus_id
  into referral_record
  from public.referrals as referral
  join public.referral_codes as code on code.id = referral.referral_code_id
  where referral.referred_profile_id = new.profile_id
    and referral.status = 'attributed'
  for update of referral;
  if referral_record.id is null then return new; end if;

  update public.referrals
  set status = 'qualified', qualified_at = now(), updated_at = now()
  where id = referral_record.id;
  if referral_record.owner_profile_id is not null then
    insert into public.xp_ledger (
      profile_id, campus_id, amount, reason, source_type, source_id, note
    ) values (
      referral_record.owner_profile_id,
      referral_record.campus_id,
      25,
      'qualified_referral',
      'referral',
      referral_record.id,
      'Referral qualified after a verified event check-in'
    ) on conflict (profile_id, reason, source_type, source_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger qualify_referral_after_event_checkin
after insert on public.event_checkins
for each row execute function ruckus_private.qualify_referral_after_checkin();

create or replace function ruckus_private.request_data_export()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  request_record public.data_export_requests%rowtype;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  select * into request_record
  from public.data_export_requests
  where profile_id = actor_id and status in ('requested', 'processing', 'ready')
  order by requested_at desc limit 1;
  if request_record.id is null then
    insert into public.data_export_requests (profile_id)
    values (actor_id) returning * into request_record;
  end if;
  return jsonb_build_object(
    'id', request_record.id,
    'status', request_record.status,
    'requestedAt', request_record.requested_at,
    'expiresAt', request_record.expires_at
  );
end;
$$;

create or replace function public.request_data_export()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select ruckus_private.request_data_export();
$$;

grant execute on function ruckus_private.organization_role_for(uuid, uuid) to authenticated;
grant execute on function ruckus_private.get_my_organizations() to authenticated;
grant execute on function ruckus_private.get_organization_dashboard(uuid) to authenticated;
grant execute on function ruckus_private.invite_organization_member(
  uuid, text, public.organization_role
) to authenticated;
grant execute on function ruckus_private.respond_to_organization_invitation(uuid, boolean)
to authenticated;
grant execute on function ruckus_private.change_organization_member_role(
  uuid, uuid, public.organization_role
) to authenticated;
grant execute on function ruckus_private.remove_organization_member(uuid, uuid)
to authenticated;
grant execute on function ruckus_private.submit_organization_verification(
  uuid, text, jsonb
) to authenticated;
grant execute on function ruckus_private.ensure_user_referral_code() to authenticated;
grant execute on function ruckus_private.attribute_referral(text) to authenticated;
grant execute on function ruckus_private.request_data_export() to authenticated;
grant execute on function public.get_my_organizations() to authenticated;
grant execute on function public.get_organization_dashboard(uuid) to authenticated;
grant execute on function public.invite_organization_member(
  uuid, text, public.organization_role
) to authenticated;
grant execute on function public.respond_to_organization_invitation(uuid, boolean)
to authenticated;
grant execute on function public.change_organization_member_role(
  uuid, uuid, public.organization_role
) to authenticated;
grant execute on function public.remove_organization_member(uuid, uuid) to authenticated;
grant execute on function public.submit_organization_verification(uuid, text, jsonb)
to authenticated;
grant execute on function public.ensure_user_referral_code() to authenticated;
grant execute on function public.attribute_referral(text) to authenticated;
grant execute on function public.request_data_export() to authenticated;
