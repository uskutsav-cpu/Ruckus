import type { Activity } from '@/features/activities/activity-types';

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(18, 0, 0, 0);

function dateAfter(days: number, hour: number): Date {
  const value = new Date(tomorrow);
  value.setDate(value.getDate() + days);
  value.setHours(hour, 0, 0, 0);
  return value;
}

function activity(
  id: string,
  templateId: string,
  title: string,
  description: string,
  category: string,
  startsAt: Date,
  durationMinutes: number,
  imageSource: number,
  colors: readonly [string, string],
  campusArea: string,
  interestedCount: number
): Activity {
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const swipeClosesAt = new Date(startsAt.getTime() - 2 * 60 * 60_000);
  return {
    id,
    templateId,
    title,
    description,
    category,
    durationMinutes,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    swipeClosesAt: swipeClosesAt.toISOString(),
    capacity: 120,
    gradientStart: colors[0],
    gradientEnd: colors[1],
    imagePath: null,
    imageSource,
    campusArea,
    interestedCount
  };
}

const trailImage = require('../../../assets/activities/sunset-trail.png') as number;
const tacoImage = require('../../../assets/activities/taco-taste-off.png') as number;
const bowlingImage = require('../../../assets/activities/glow-bowling.png') as number;

export const demoActivities: Activity[] = [
  activity(
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'Sunset Trail Dash',
    'Catch golden hour on an easy social loop through the riverside trail.',
    'Outdoor',
    dateAfter(0, 18),
    90,
    trailImage,
    ['#F97316', '#7C3AED'],
    'Riverside trail',
    2
  ),
  activity(
    '40000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    'Taco Taste-Off',
    'Sample the student district taco spots and crown a campus champion.',
    'Food',
    dateAfter(1, 19),
    120,
    tacoImage,
    ['#EF4444', '#FBBF24'],
    'West Campus',
    3
  ),
  activity(
    '40000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000003',
    'Glow Bowling',
    'Neon lanes, team challenges, and absolutely no skill requirement.',
    'Games',
    dateAfter(2, 20),
    120,
    bowlingImage,
    ['#0EA5E9', '#EC4899'],
    'Student Union',
    1
  ),
  activity(
    '40000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000004',
    'Paint & Playlist',
    'Make a mini canvas while the group builds the night’s shared playlist.',
    'Arts',
    dateAfter(3, 18),
    90,
    tacoImage,
    ['#8B5CF6', '#22D3EE'],
    'Arts District',
    2
  ),
  activity(
    '40000000-0000-4000-8000-000000000005',
    '30000000-0000-4000-8000-000000000005',
    'Sand Volleyball Rally',
    'Low-stakes beach volleyball with rotating teams and a sunset final.',
    'Fitness',
    dateAfter(4, 17),
    90,
    trailImage,
    ['#14B8A6', '#F59E0B'],
    'Rec fields',
    3
  ),
  activity(
    '40000000-0000-4000-8000-000000000006',
    '30000000-0000-4000-8000-000000000006',
    'Open-Mic Quest',
    'Cheer on campus performers and complete a playful venue scavenger list.',
    'Music',
    dateAfter(5, 20),
    120,
    bowlingImage,
    ['#DB2777', '#4F46E5'],
    'Campus core',
    1
  )
];

export function localActivityImage(templateId: string): number {
  switch (templateId) {
    case '30000000-0000-4000-8000-000000000002':
    case '30000000-0000-4000-8000-000000000004':
      return tacoImage;
    case '30000000-0000-4000-8000-000000000003':
    case '30000000-0000-4000-8000-000000000006':
      return bowlingImage;
    default:
      return trailImage;
  }
}
