import type { EventDetail, EventSummary } from '@/features/events/event-types';

function futureIso(days: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export const demoEvents: EventSummary[] = [
  {
    id: '70000000-0000-4000-8000-000000000001',
    slug: 'sunset-campus-picnic-demo',
    title: 'Sunset Campus Picnic',
    description:
      'Bring a blanket and meet new people at a low-key sunset picnic by the fountain.',
    category: 'Outdoor',
    coverImagePath: null,
    campusId: '00000000-0000-4000-8000-000000000001',
    campusName: 'Demo State University',
    organizationId: '60000000-0000-4000-8000-000000000001',
    organizationName: 'Campus Outdoors Club',
    organizationVerified: false,
    startsAt: futureIso(2, 18),
    endsAt: futureIso(2, 20),
    timezone: 'America/Chicago',
    venueName: 'South Lawn',
    locationDescription: 'Meet by the public fountain.',
    capacity: 24,
    confirmedCount: 14,
    availability: 'available',
    waitlistEnabled: true,
    approvalRequired: false,
    visibility: 'public',
    accessibilityInformation: 'Paved route from the east entrance.',
    costInformation: 'Free',
    cancellationPolicy: 'Cancel before the event so another student can join.',
    recommendationScore: 61
  },
  {
    id: '70000000-0000-4000-8000-000000000002',
    slug: 'board-game-night-demo',
    title: 'Board Game Night',
    description:
      'Learn a new tabletop game with a small group. Beginners are welcome and supplies are provided.',
    category: 'Games',
    coverImagePath: null,
    campusId: '00000000-0000-4000-8000-000000000001',
    campusName: 'Demo State University',
    organizationId: '60000000-0000-4000-8000-000000000001',
    organizationName: 'Campus Outdoors Club',
    organizationVerified: false,
    startsAt: futureIso(4, 19),
    endsAt: futureIso(4, 21),
    timezone: 'America/Chicago',
    venueName: 'Student Union Commons',
    locationDescription: 'Use the north entrance and follow signs for the commons.',
    capacity: 24,
    confirmedCount: 21,
    availability: 'available',
    waitlistEnabled: true,
    approvalRequired: true,
    visibility: 'campus',
    accessibilityInformation: 'Elevator access is available from the north entrance.',
    costInformation: 'Free',
    cancellationPolicy: 'Please cancel at least two hours before the start time.',
    recommendationScore: 54
  },
  {
    id: '70000000-0000-4000-8000-000000000003',
    slug: 'open-mic-under-the-lights-demo',
    title: 'Open Mic Under the Lights',
    description: 'Cheer on student performers or sign up for a five-minute set.',
    category: 'Music',
    coverImagePath: null,
    campusId: '00000000-0000-4000-8000-000000000001',
    campusName: 'Demo State University',
    organizationId: null,
    organizationName: 'Student Arts Council',
    organizationVerified: true,
    startsAt: futureIso(6, 20),
    endsAt: futureIso(6, 22),
    timezone: 'America/Chicago',
    venueName: 'Union Courtyard',
    locationDescription: 'Outdoor stage beside the main union entrance.',
    capacity: 80,
    confirmedCount: 80,
    availability: 'waitlist',
    waitlistEnabled: true,
    approvalRequired: false,
    visibility: 'public',
    accessibilityInformation: 'Step-free courtyard entrance and reserved seating area.',
    costInformation: 'Free',
    cancellationPolicy: 'Leave the waitlist anytime.',
    recommendationScore: 43
  }
];

export function demoEventDetail(eventId: string): EventDetail | null {
  const event = demoEvents.find((candidate) => candidate.id === eventId);
  if (!event) return null;
  return {
    ...event,
    minAge: 18,
    eligibilityRequirements: 'Current campus students age 18 or older.',
    safetyRules:
      'Meet in public, respect organizer instructions, and use report or block tools when needed.',
    status: 'published',
    cancellationReason: null,
    coordinates: null,
    ownRsvp: null,
    isHost: false,
    chatEnabled: false
  };
}
