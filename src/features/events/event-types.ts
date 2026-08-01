import type { EventStatus, EventVisibility, RsvpStatus } from '@/types/database';

export type EventAvailability = 'available' | 'waitlist' | 'full';

export type EventSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  coverImagePath: string | null;
  campusId: string;
  campusName: string;
  organizationId: string | null;
  organizationName: string | null;
  organizationVerified: boolean;
  startsAt: string;
  endsAt: string;
  timezone: string;
  venueName: string;
  locationDescription: string;
  capacity: number;
  confirmedCount: number;
  availability: EventAvailability;
  waitlistEnabled: boolean;
  approvalRequired: boolean;
  visibility: EventVisibility;
  accessibilityInformation: string | null;
  costInformation: string | null;
  cancellationPolicy: string | null;
  recommendationScore: number;
};

export type OwnRsvp = {
  id: string;
  status: RsvpStatus;
  waitlistPosition: number | null;
  joinedAt: string;
};

export type EventDetail = EventSummary & {
  minAge: number;
  eligibilityRequirements: string | null;
  safetyRules: string | null;
  status: EventStatus;
  cancellationReason: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  ownRsvp: OwnRsvp | null;
  isHost: boolean;
  chatEnabled: boolean;
};

export type EventFeedCursor = {
  score: number;
  startsAt: string;
  id: string;
};

export type EventFeedPage = {
  items: EventSummary[];
  nextCursor: EventFeedCursor | null;
};

export type EventFilters = {
  search?: string;
  category?: string;
  startsAfter?: string;
  endsBefore?: string;
};

export type RsvpResult = {
  rsvpId?: string;
  eventId: string;
  status: RsvpStatus | 'hosting';
  waitlistPosition?: number | null;
  alreadyJoined: boolean;
  chatEnabled?: boolean;
};

export type MyEvent = {
  event: EventDetail;
  relationship: RsvpStatus | 'hosting';
};

export type EventMessage = {
  id: string;
  eventId: string;
  senderId: string | null;
  senderName: string;
  senderAvatarPath: string | null;
  kind: 'text' | 'system' | 'announcement';
  body: string;
  replyToId: string | null;
  clientId: string | null;
  removedAt: string | null;
  createdAt: string;
  reactions: EventMessageReaction[];
  delivery?: 'sending' | 'failed';
};

export type EventMessageReaction = {
  reaction: '👍' | '❤️' | '😂' | '🎉' | '❗';
  count: number;
  reactedByMe: boolean;
};

export type CreateEventInput = {
  title: string;
  description: string;
  category: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  venueName: string;
  locationDescription: string;
  capacity: number;
  waitlistEnabled: boolean;
  approvalRequired: boolean;
  visibility: EventVisibility;
  accessibilityInformation: string;
  costInformation: string;
  cancellationPolicy: string;
  safetyRules: string;
  organizationId?: string;
  publish?: boolean;
};

export type EventAttendee = {
  rsvpId: string;
  profileId: string;
  displayName: string;
  avatarPath: string | null;
  status: RsvpStatus;
  waitlistPosition: number | null;
  joinedAt: string;
  checkedInAt: string | null;
};

export type EventAttendeeDashboard = {
  attendees: EventAttendee[];
  counts: {
    confirmed: number;
    pending: number;
    waitlisted: number;
    checkedIn: number;
  };
};
