-- Hosted staging only. Apply deliberately after verifying the linked project ref.
-- This file creates no Auth users, passwords, private messages, or production data.
-- Do not add this file to supabase/config.toml or run it against production.

begin;

insert into public.campuses (
  id,
  name,
  email_domain,
  timezone,
  min_group_size,
  target_group_size,
  max_group_size
)
values (
  '51000000-0000-4000-8000-000000000001',
  'The University of Texas at Austin',
  'utexas.edu',
  'America/Chicago',
  4,
  6,
  8
)
on conflict (id) do update
set name = excluded.name,
    email_domain = excluded.email_domain,
    timezone = excluded.timezone,
    min_group_size = excluded.min_group_size,
    target_group_size = excluded.target_group_size,
    max_group_size = excluded.max_group_size,
    is_active = true;

insert into public.interests (id, campus_id, name, emoji, sort_order)
values
  (
    '52000000-0000-4000-8000-000000000001',
    '51000000-0000-4000-8000-000000000001',
    'Outdoor',
    '🌲',
    1
  ),
  (
    '52000000-0000-4000-8000-000000000002',
    '51000000-0000-4000-8000-000000000001',
    'Food',
    '🌮',
    2
  ),
  (
    '52000000-0000-4000-8000-000000000003',
    '51000000-0000-4000-8000-000000000001',
    'Games',
    '🎲',
    3
  ),
  (
    '52000000-0000-4000-8000-000000000004',
    '51000000-0000-4000-8000-000000000001',
    'Arts',
    '🎨',
    4
  ),
  (
    '52000000-0000-4000-8000-000000000005',
    '51000000-0000-4000-8000-000000000001',
    'Fitness',
    '🏐',
    5
  ),
  (
    '52000000-0000-4000-8000-000000000006',
    '51000000-0000-4000-8000-000000000001',
    'Music',
    '🎧',
    6
  )
on conflict (id) do update
set name = excluded.name,
    emoji = excluded.emoji,
    sort_order = excluded.sort_order;

insert into public.activity_templates (
  id,
  campus_id,
  title,
  description,
  category,
  duration_minutes,
  image_path,
  gradient_start,
  gradient_end
)
values
  (
    '53000000-0000-4000-8000-000000000001',
    '51000000-0000-4000-8000-000000000001',
    'Campus Sunset Walk',
    'Take an easy social walk with a small group near the UT Austin campus.',
    'Outdoor',
    90,
    null,
    '#F97316',
    '#7C3AED'
  ),
  (
    '53000000-0000-4000-8000-000000000002',
    '51000000-0000-4000-8000-000000000001',
    'Taco Taste-Off',
    'Try a few nearby taco favorites and vote on the group’s top pick.',
    'Food',
    120,
    null,
    '#EF4444',
    '#FBBF24'
  ),
  (
    '53000000-0000-4000-8000-000000000003',
    '51000000-0000-4000-8000-000000000001',
    'Casual Game Night',
    'Meet for low-pressure table games with rotating teams and quick rounds.',
    'Games',
    120,
    null,
    '#0EA5E9',
    '#EC4899'
  )
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    category = excluded.category,
    duration_minutes = excluded.duration_minutes,
    image_path = excluded.image_path,
    gradient_start = excluded.gradient_start,
    gradient_end = excluded.gradient_end,
    is_active = true;

insert into public.activity_sessions (
  id,
  activity_template_id,
  campus_id,
  starts_at,
  ends_at,
  swipe_closes_at,
  public_venue_name,
  public_venue_address,
  venue_notes,
  checkin_opens_at,
  checkin_closes_at
)
select
  seeded.id,
  seeded.template_id,
  '51000000-0000-4000-8000-000000000001',
  seeded.starts_at,
  seeded.starts_at + seeded.duration,
  seeded.starts_at - interval '2 hours',
  seeded.venue,
  seeded.address,
  'Meet at the staffed public entrance. Ruckus does not collect live location.',
  seeded.starts_at - interval '15 minutes',
  seeded.starts_at + interval '30 minutes'
from (
  values
    (
      '54000000-0000-4000-8000-000000000001'::uuid,
      '53000000-0000-4000-8000-000000000001'::uuid,
      date_trunc('day', now()) + interval '1 day 18 hours',
      interval '90 minutes',
      'Texas Union Information Desk',
      '2308 Whitis Avenue, Austin, TX 78712'
    ),
    (
      '54000000-0000-4000-8000-000000000002'::uuid,
      '53000000-0000-4000-8000-000000000002'::uuid,
      date_trunc('day', now()) + interval '2 days 19 hours',
      interval '2 hours',
      'Texas Union Information Desk',
      '2308 Whitis Avenue, Austin, TX 78712'
    ),
    (
      '54000000-0000-4000-8000-000000000003'::uuid,
      '53000000-0000-4000-8000-000000000003'::uuid,
      date_trunc('day', now()) + interval '3 days 19 hours',
      interval '2 hours',
      'Texas Union Information Desk',
      '2308 Whitis Avenue, Austin, TX 78712'
    )
) as seeded(id, template_id, starts_at, duration, venue, address)
on conflict (id) do update
set starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    swipe_closes_at = excluded.swipe_closes_at,
    public_venue_name = excluded.public_venue_name,
    public_venue_address = excluded.public_venue_address,
    venue_notes = excluded.venue_notes,
    checkin_opens_at = excluded.checkin_opens_at,
    checkin_closes_at = excluded.checkin_closes_at,
    status = 'scheduled';

commit;
