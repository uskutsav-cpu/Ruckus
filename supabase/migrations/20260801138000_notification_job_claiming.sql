-- Atomic, service-role-only notification job claiming for concurrent workers.

create or replace function ruckus_private.claim_notification_jobs(max_jobs integer)
returns setof public.notification_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if max_jobs not between 1 and 100 then
    raise exception using errcode = '22023', message = 'INVALID_NOTIFICATION_BATCH_SIZE';
  end if;

  return query
  with candidates as (
    select job.id
    from public.notification_jobs as job
    where job.status = 'pending'
      and job.scheduled_for <= now()
    order by job.scheduled_for, job.id
    limit max_jobs
    for update skip locked
  )
  update public.notification_jobs as job
  set status = 'processing',
      attempts = job.attempts + 1,
      updated_at = now()
  from candidates
  where job.id = candidates.id
  returning job.*;
end;
$$;

create or replace function public.claim_notification_jobs(max_jobs integer default 50)
returns setof public.notification_jobs
language sql
security invoker
set search_path = ''
as $$
  select * from ruckus_private.claim_notification_jobs(max_jobs);
$$;

revoke all on function ruckus_private.claim_notification_jobs(integer)
from public, anon, authenticated;
grant execute on function ruckus_private.claim_notification_jobs(integer)
to service_role;
revoke all on function public.claim_notification_jobs(integer)
from public, anon, authenticated;
grant execute on function public.claim_notification_jobs(integer)
to service_role;
