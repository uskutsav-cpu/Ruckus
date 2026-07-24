-- Server-synced notification categories and at-most-once scheduled dispatch markers.

create table public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  chat_messages boolean not null default true,
  activity_reminders boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

create table public.notification_dispatches (
  id uuid primary key default extensions.gen_random_uuid(),
  event_type text not null,
  source_id uuid not null,
  dispatched_at timestamptz not null default now(),
  unique (event_type, source_id),
  constraint notification_dispatches_event_length check (
    char_length(event_type) between 3 and 80
  )
);

alter table public.notification_preferences enable row level security;
alter table public.notification_dispatches enable row level security;
revoke all on table public.notification_preferences from anon, authenticated;
revoke all on table public.notification_dispatches from anon, authenticated;
grant select on public.notification_preferences to authenticated;

create policy notification_preferences_read_own
on public.notification_preferences for select
to authenticated
using (profile_id = (select auth.uid()));

create or replace function public.set_notification_preferences(
  enabled_value boolean,
  chat_messages_value boolean,
  activity_reminders_value boolean
)
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

  insert into public.notification_preferences (
    profile_id,
    enabled,
    chat_messages,
    activity_reminders
  )
  values (
    actor_id,
    enabled_value,
    chat_messages_value,
    activity_reminders_value
  )
  on conflict (profile_id) do update
  set enabled = excluded.enabled,
      chat_messages = excluded.chat_messages,
      activity_reminders = excluded.activity_reminders;
end;
$$;

revoke all on function public.set_notification_preferences(boolean, boolean, boolean)
from public, anon;
grant execute on function public.set_notification_preferences(boolean, boolean, boolean)
to authenticated;

comment on table public.notification_dispatches is
  'Service-role-only idempotency markers for scheduled push notification events.';
