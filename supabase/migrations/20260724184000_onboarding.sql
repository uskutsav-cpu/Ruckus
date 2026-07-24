-- Transactional profile gates used by the protected mobile route groups.

create or replace function public.attest_age_and_safety()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  result public.profiles%rowtype;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  update public.profiles
  set
    age_attested = true,
    age_attested_at = coalesce(age_attested_at, now()),
    safety_acknowledged_at = coalesce(safety_acknowledged_at, now())
  where id = actor_id
    and email_domain_verified_at is not null
    and deletion_requested_at is null
  returning * into result;

  if result.id is null then
    raise exception using errcode = '42501', message = 'ATTESTATION_NOT_ALLOWED';
  end if;

  return result;
end;
$$;

create or replace function public.complete_onboarding(
  display_name_value text,
  graduation_year_value smallint,
  bio_value text,
  interest_ids uuid[]
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_campus_id uuid;
  valid_interest_count integer;
  result public.profiles%rowtype;
begin
  if actor_id is null
    or char_length(trim(display_name_value)) not between 2 and 40
    or graduation_year_value not between extract(year from now())::smallint
      and (extract(year from now()) + 10)::smallint
    or char_length(trim(coalesce(bio_value, ''))) > 280
    or cardinality(interest_ids) not between 3 and 5
    or cardinality(interest_ids) <> (
      select count(distinct selected.interest_id)
      from unnest(interest_ids) as selected(interest_id)
    )
  then
    raise exception using errcode = '22023', message = 'INVALID_ONBOARDING_INPUT';
  end if;

  select campus_id
  into actor_campus_id
  from public.profiles
  where id = actor_id
    and email_domain_verified_at is not null
    and age_attested
    and safety_acknowledged_at is not null
    and deletion_requested_at is null
  for update;

  if actor_campus_id is null then
    raise exception using errcode = '42501', message = 'ONBOARDING_NOT_ALLOWED';
  end if;

  select count(*)
  into valid_interest_count
  from public.interests
  where id = any(interest_ids) and campus_id = actor_campus_id;

  if valid_interest_count <> cardinality(interest_ids) then
    raise exception using errcode = '22023', message = 'INVALID_INTEREST_SELECTION';
  end if;

  delete from public.profile_interests where profile_id = actor_id;
  insert into public.profile_interests (profile_id, interest_id)
  select actor_id, unnest(interest_ids);

  update public.profiles
  set
    display_name = trim(display_name_value),
    graduation_year = graduation_year_value,
    bio = nullif(trim(coalesce(bio_value, '')), ''),
    onboarding_completed_at = now()
  where id = actor_id
  returning * into result;

  return result;
end;
$$;

revoke update (
  age_attested,
  age_attested_at,
  safety_acknowledged_at,
  onboarding_completed_at
) on public.profiles from authenticated;

grant execute on function public.attest_age_and_safety() to authenticated;
grant execute on function public.complete_onboarding(text, smallint, text, uuid[])
to authenticated;
