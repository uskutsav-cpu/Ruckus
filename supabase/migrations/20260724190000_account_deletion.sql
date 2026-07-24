-- Deletion requests immediately disable social participation. A scheduled Edge
-- Function hard-deletes the Auth user after the documented seven-day safety window;
-- profile-owned rows then cascade and retained group messages lose their sender.

create or replace function public.request_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  update public.profiles
  set deletion_requested_at = coalesce(deletion_requested_at, now())
  where id = actor_id;

  update public.push_tokens
  set invalidated_at = coalesce(invalidated_at, now())
  where profile_id = actor_id;

  update public.waitlist_entries
  set status = 'withdrawn'
  where profile_id = actor_id and status = 'waiting';

  update public.attendance_confirmations
  set status = 'declined', responded_at = now()
  where profile_id = actor_id and status = 'pending';

  update public.group_members
  set status = 'left', left_at = now()
  where profile_id = actor_id and status = 'active';
end;
$$;

comment on function public.request_account_deletion() is
  'Marks the account for scheduled hard deletion and immediately removes it from social participation.';
