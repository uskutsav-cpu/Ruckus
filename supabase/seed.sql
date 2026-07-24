-- Local-only deterministic demo data.
-- Test password for every seeded account: CampusClash1!

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
  '00000000-0000-4000-8000-000000000001',
  'Demo State University',
  'example.edu',
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
    max_group_size = excluded.max_group_size;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
select
  '00000000-0000-0000-0000-000000000000',
  seeded.id,
  'authenticated',
  'authenticated',
  seeded.email,
  extensions.crypt('CampusClash1!', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', seeded.display_name),
  now(),
  now(),
  '',
  '',
  '',
  ''
from (
  values
    (
      '10000000-0000-4000-8000-000000000001'::uuid,
      'demo1@example.edu',
      'Maya'
    ),
    (
      '10000000-0000-4000-8000-000000000002'::uuid,
      'demo2@example.edu',
      'Jordan'
    ),
    (
      '10000000-0000-4000-8000-000000000003'::uuid,
      'demo3@example.edu',
      'Avery'
    ),
    (
      '10000000-0000-4000-8000-000000000004'::uuid,
      'demo4@example.edu',
      'Sam'
    ),
    (
      '10000000-0000-4000-8000-000000000005'::uuid,
      'demo5@example.edu',
      'Priya'
    ),
    (
      '10000000-0000-4000-8000-000000000006'::uuid,
      'demo6@example.edu',
      'Leo'
    ),
    (
      '10000000-0000-4000-8000-000000000007'::uuid,
      'host@example.edu',
      'Casey'
    ),
    (
      '10000000-0000-4000-8000-000000000008'::uuid,
      'admin@example.edu',
      'Campus Safety'
    )
) as seeded(id, email, display_name)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  seeded.id,
  seeded.id::text,
  seeded.id,
  jsonb_build_object(
    'sub', seeded.id::text,
    'email', seeded.email,
    'email_verified', true
  ),
  'email',
  now(),
  now(),
  now()
from (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'demo1@example.edu'),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'demo2@example.edu'),
    ('10000000-0000-4000-8000-000000000003'::uuid, 'demo3@example.edu'),
    ('10000000-0000-4000-8000-000000000004'::uuid, 'demo4@example.edu'),
    ('10000000-0000-4000-8000-000000000005'::uuid, 'demo5@example.edu'),
    ('10000000-0000-4000-8000-000000000006'::uuid, 'demo6@example.edu'),
    ('10000000-0000-4000-8000-000000000007'::uuid, 'host@example.edu'),
    ('10000000-0000-4000-8000-000000000008'::uuid, 'admin@example.edu')
) as seeded(id, email)
on conflict (provider_id, provider) do nothing;

update public.profiles
set
  age_attested = true,
  age_attested_at = now(),
  safety_acknowledged_at = now(),
  email_domain_verified_at = now(),
  onboarding_completed_at = now(),
  bio = 'Always down for a new campus adventure.',
  graduation_year = 2028
where id between
  '10000000-0000-4000-8000-000000000001'
  and '10000000-0000-4000-8000-000000000008';

update public.profiles
set role = 'host'
where id = '10000000-0000-4000-8000-000000000007';

update public.profiles
set role = 'admin'
where id = '10000000-0000-4000-8000-000000000008';

insert into public.interests (id, campus_id, name, emoji, sort_order)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Outdoor',
    '🌲',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'Food',
    '🌮',
    2
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    'Games',
    '🎲',
    3
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000001',
    'Arts',
    '🎨',
    4
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000001',
    'Fitness',
    '🏐',
    5
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000001',
    'Music',
    '🎧',
    6
  )
on conflict (id) do nothing;

insert into public.profile_interests (profile_id, interest_id)
select profile.id, interest.id
from public.profiles as profile
cross join public.interests as interest
where profile.id between
    '10000000-0000-4000-8000-000000000001'
    and '10000000-0000-4000-8000-000000000008'
  and interest.sort_order <= 4
on conflict do nothing;

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
    '30000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Sunset Trail Dash',
    'Catch golden hour on an easy social loop through the riverside trail.',
    'Outdoor',
    90,
    null,
    '#F97316',
    '#7C3AED'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'Taco Taste-Off',
    'Sample the student district taco spots and crown a campus champion.',
    'Food',
    120,
    null,
    '#EF4444',
    '#FBBF24'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    'Glow Bowling',
    'Neon lanes, team challenges, and absolutely no skill requirement.',
    'Games',
    120,
    null,
    '#0EA5E9',
    '#EC4899'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000001',
    'Paint & Playlist',
    'Make a mini canvas while the crew builds the night’s shared playlist.',
    'Arts',
    90,
    null,
    '#8B5CF6',
    '#22D3EE'
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000001',
    'Sand Volleyball Rally',
    'Low-stakes beach volleyball with rotating teams and a sunset final.',
    'Fitness',
    90,
    null,
    '#14B8A6',
    '#F59E0B'
  ),
  (
    '30000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000001',
    'Open-Mic Quest',
    'Cheer on campus performers and complete a playful venue scavenger list.',
    'Music',
    120,
    null,
    '#DB2777',
    '#4F46E5'
  )
on conflict (id) do nothing;

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
  '00000000-0000-4000-8000-000000000001',
  seeded.starts_at,
  seeded.starts_at + seeded.duration,
  seeded.starts_at - interval '2 hours',
  seeded.venue,
  seeded.address,
  'Meet near the staffed front entrance. No exact live location is collected.',
  seeded.starts_at - interval '15 minutes',
  seeded.starts_at + interval '30 minutes'
from (
  values
    (
      '40000000-0000-4000-8000-000000000001'::uuid,
      '30000000-0000-4000-8000-000000000001'::uuid,
      date_trunc('day', now()) + interval '1 day 18 hours',
      interval '90 minutes',
      'Riverside Park Welcome Pavilion',
      '100 River Walk'
    ),
    (
      '40000000-0000-4000-8000-000000000002'::uuid,
      '30000000-0000-4000-8000-000000000002'::uuid,
      date_trunc('day', now()) + interval '2 days 19 hours',
      interval '2 hours',
      'Student District Visitor Center',
      '25 College Avenue'
    ),
    (
      '40000000-0000-4000-8000-000000000003'::uuid,
      '30000000-0000-4000-8000-000000000003'::uuid,
      date_trunc('day', now()) + interval '3 days 20 hours',
      interval '2 hours',
      'Union Lanes Main Desk',
      '1 University Union'
    ),
    (
      '40000000-0000-4000-8000-000000000004'::uuid,
      '30000000-0000-4000-8000-000000000004'::uuid,
      date_trunc('day', now()) + interval '4 days 18 hours',
      interval '90 minutes',
      'City Arts Center Lobby',
      '80 Market Street'
    ),
    (
      '40000000-0000-4000-8000-000000000005'::uuid,
      '30000000-0000-4000-8000-000000000005'::uuid,
      date_trunc('day', now()) + interval '5 days 17 hours',
      interval '90 minutes',
      'Recreation Center Front Desk',
      '12 Campus Drive'
    ),
    (
      '40000000-0000-4000-8000-000000000006'::uuid,
      '30000000-0000-4000-8000-000000000006'::uuid,
      date_trunc('day', now()) + interval '6 days 20 hours',
      interval '2 hours',
      'Civic Theater Box Office',
      '200 Main Street'
    )
) as seeded(id, template_id, starts_at, duration, venue, address)
on conflict (id) do update
set starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    swipe_closes_at = excluded.swipe_closes_at,
    checkin_opens_at = excluded.checkin_opens_at,
    checkin_closes_at = excluded.checkin_closes_at,
    status = 'scheduled';
