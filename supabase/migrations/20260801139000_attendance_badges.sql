-- Focused attendance badges awarded only from verified event check-ins.

insert into public.badge_definitions (id, name, description, icon)
values
  ('first_checkin', 'First check-in', 'Completed a first verified Ruckus event check-in.', 'check'),
  ('campus_regular', 'Campus regular', 'Completed three verified Ruckus event check-ins.', 'trophy')
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    is_active = true;

create or replace function ruckus_private.award_attendance_badges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attendance_count integer;
begin
  select count(*) into attendance_count
  from public.event_checkins
  where profile_id = new.profile_id;

  if attendance_count >= 1 then
    insert into public.user_badges (profile_id, badge_id, source_type, source_id)
    values (new.profile_id, 'first_checkin', 'event_checkin', new.id)
    on conflict (profile_id, badge_id) do nothing;
  end if;

  if attendance_count >= 3 then
    insert into public.user_badges (profile_id, badge_id, source_type, source_id)
    values (new.profile_id, 'campus_regular', 'event_checkin', new.id)
    on conflict (profile_id, badge_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger award_attendance_badges
after insert on public.event_checkins
for each row execute function ruckus_private.award_attendance_badges();
