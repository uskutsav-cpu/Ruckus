import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import { demoEventDetail, demoEvents } from '@/features/events/demo-events';
import type {
  CreateEventInput,
  EventDetail,
  EventAttendeeDashboard,
  EventFeedCursor,
  EventFeedPage,
  EventFilters,
  EventMessage,
  EventSummary,
  MyEvent,
  RsvpResult
} from '@/features/events/event-types';
import { requireSupabase } from '@/lib/supabase';

const eventSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  coverImagePath: z.string().nullable(),
  campusId: z.string().uuid(),
  campusName: z.string(),
  organizationId: z.string().uuid().nullable(),
  organizationName: z.string().nullable(),
  organizationVerified: z.boolean(),
  startsAt: z.string(),
  endsAt: z.string(),
  timezone: z.string(),
  venueName: z.string(),
  locationDescription: z.string(),
  capacity: z.number().int(),
  confirmedCount: z.number().int(),
  availability: z.enum(['available', 'waitlist', 'full']),
  waitlistEnabled: z.boolean(),
  approvalRequired: z.boolean(),
  visibility: z.enum(['campus', 'public', 'private']),
  accessibilityInformation: z.string().nullable(),
  costInformation: z.string().nullable(),
  cancellationPolicy: z.string().nullable(),
  recommendationScore: z.number().int()
});

const feedPageSchema = z.object({
  items: z.array(eventSummarySchema),
  nextCursor: z
    .object({ score: z.number().int(), startsAt: z.string(), id: z.string().uuid() })
    .nullable()
});

const detailSchema = eventSummarySchema.extend({
  minAge: z.number().int(),
  eligibilityRequirements: z.string().nullable(),
  safetyRules: z.string().nullable(),
  status: z.enum(['draft', 'published', 'cancelled', 'completed', 'archived', 'removed']),
  cancellationReason: z.string().nullable(),
  coordinates: z
    .object({ latitude: z.coerce.number(), longitude: z.coerce.number() })
    .nullable(),
  ownRsvp: z
    .object({
      id: z.string().uuid(),
      status: z.enum(['confirmed', 'waitlisted', 'pending', 'rejected', 'cancelled']),
      waitlistPosition: z.number().int().nullable(),
      joinedAt: z.string()
    })
    .nullable(),
  isHost: z.boolean(),
  chatEnabled: z.boolean()
});

const rsvpResultSchema = z.object({
  rsvpId: z.string().uuid().optional(),
  eventId: z.string().uuid(),
  status: z.enum([
    'confirmed',
    'waitlisted',
    'pending',
    'rejected',
    'cancelled',
    'hosting'
  ]),
  waitlistPosition: z.number().int().nullable().optional(),
  alreadyJoined: z.boolean(),
  chatEnabled: z.boolean().optional()
});

const eventMessageSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  senderId: z.string().uuid().nullable(),
  senderName: z.string(),
  senderAvatarPath: z.string().nullable(),
  kind: z.enum(['text', 'system', 'announcement']),
  body: z.string(),
  replyToId: z.string().uuid().nullable(),
  clientId: z.string().uuid().nullable(),
  removedAt: z.string().nullable(),
  createdAt: z.string(),
  reactions: z.array(
    z.object({
      reaction: z.enum(['👍', '❤️', '😂', '🎉', '❗']),
      count: z.coerce.number().int().positive(),
      reactedByMe: z.boolean()
    })
  )
});

const attendeeDashboardSchema = z.object({
  attendees: z.array(
    z.object({
      rsvpId: z.string().uuid(),
      profileId: z.string().uuid(),
      displayName: z.string(),
      avatarPath: z.string().nullable(),
      status: z.enum(['confirmed', 'waitlisted', 'pending', 'rejected', 'cancelled']),
      waitlistPosition: z.number().int().nullable(),
      joinedAt: z.string(),
      checkedInAt: z.string().nullable()
    })
  ),
  counts: z.object({
    confirmed: z.number().int(),
    pending: z.number().int(),
    waitlisted: z.number().int(),
    checkedIn: z.number().int()
  })
});

const demoRsvpKey = 'ruckus.demo.event-rsvps';
const demoDecisionKey = 'ruckus.demo.event-decisions';

async function demoRsvps(): Promise<Record<string, RsvpResult>> {
  const stored = await AsyncStorage.getItem(demoRsvpKey);
  return stored ? (JSON.parse(stored) as Record<string, RsvpResult>) : {};
}

export async function fetchEventFeed(
  isDemo: boolean,
  filters: EventFilters,
  cursor: EventFeedCursor | null = null
): Promise<EventFeedPage> {
  if (isDemo) {
    const decisionsValue = await AsyncStorage.getItem(demoDecisionKey);
    const decisions = decisionsValue
      ? (JSON.parse(decisionsValue) as Record<string, 'passed' | 'saved'>)
      : {};
    const search = filters.search?.trim().toLowerCase();
    const items = demoEvents.filter(
      (event) =>
        decisions[event.id] !== 'passed' &&
        (!search ||
          event.title.toLowerCase().includes(search) ||
          event.description.toLowerCase().includes(search) ||
          event.organizationName?.toLowerCase().includes(search)) &&
        (!filters.category || event.category === filters.category)
    );
    return { items, nextCursor: null };
  }

  const supabase = requireSupabase();
  const args = {
    page_size: 20,
    ...(filters.search?.trim() ? { search_text: filters.search.trim() } : {}),
    ...(filters.category ? { category_filter: filters.category } : {}),
    ...(filters.startsAfter ? { starts_after: filters.startsAfter } : {}),
    ...(filters.endsBefore ? { ends_before: filters.endsBefore } : {}),
    ...(cursor
      ? {
          cursor_score: cursor.score,
          cursor_starts_at: cursor.startsAt,
          cursor_id: cursor.id
        }
      : {})
  };
  const { data, error } = await supabase.rpc('get_event_feed', args);
  if (error) throw error;
  return feedPageSchema.parse(data) as EventFeedPage;
}

export async function fetchEventDetail(
  eventId: string,
  isDemo: boolean
): Promise<EventDetail> {
  if (isDemo) {
    const detail = demoEventDetail(eventId);
    if (!detail) throw new Error('EVENT_NOT_FOUND');
    const own = (await demoRsvps())[eventId];
    return {
      ...detail,
      ownRsvp:
        own && own.status !== 'hosting'
          ? {
              id: own.rsvpId ?? eventId,
              status: own.status,
              waitlistPosition: own.waitlistPosition ?? null,
              joinedAt: new Date().toISOString()
            }
          : null,
      chatEnabled: own?.status === 'confirmed'
    };
  }
  const { data, error } = await requireSupabase().rpc('get_event_detail', {
    target_event_id: eventId
  });
  if (error) throw error;
  return detailSchema.parse(data) as EventDetail;
}

export async function joinEvent(eventId: string, isDemo: boolean): Promise<RsvpResult> {
  if (isDemo) {
    const detail = demoEventDetail(eventId);
    if (!detail) throw new Error('EVENT_NOT_FOUND');
    const current = await demoRsvps();
    if (current[eventId]) return { ...current[eventId], alreadyJoined: true };
    const status = detail.approvalRequired
      ? 'pending'
      : detail.availability === 'available'
        ? 'confirmed'
        : detail.waitlistEnabled
          ? 'waitlisted'
          : 'rejected';
    const result: RsvpResult = {
      rsvpId: Crypto.randomUUID(),
      eventId,
      status,
      waitlistPosition: status === 'waitlisted' ? 1 : null,
      alreadyJoined: false,
      chatEnabled: status === 'confirmed'
    };
    await AsyncStorage.setItem(
      demoRsvpKey,
      JSON.stringify({ ...current, [eventId]: result })
    );
    return result;
  }
  const { data, error } = await requireSupabase().rpc('join_event', {
    target_event_id: eventId,
    request_key: Crypto.randomUUID()
  });
  if (error) throw error;
  return rsvpResultSchema.parse(data) as RsvpResult;
}

export async function cancelEventRsvp(eventId: string, isDemo: boolean): Promise<void> {
  if (isDemo) {
    const current = await demoRsvps();
    delete current[eventId];
    await AsyncStorage.setItem(demoRsvpKey, JSON.stringify(current));
    return;
  }
  const { error } = await requireSupabase().rpc('cancel_event_rsvp', {
    target_event_id: eventId,
    cancellation_reason: 'Cancelled by attendee'
  });
  if (error) throw error;
}

export async function setEventDecision(
  userId: string,
  eventId: string,
  decision: 'passed' | 'saved',
  isDemo: boolean
): Promise<void> {
  if (isDemo) {
    const value = await AsyncStorage.getItem(demoDecisionKey);
    const current = value
      ? (JSON.parse(value) as Record<string, 'passed' | 'saved'>)
      : {};
    await AsyncStorage.setItem(
      demoDecisionKey,
      JSON.stringify({ ...current, [eventId]: decision })
    );
    return;
  }
  const { error } = await requireSupabase()
    .from('event_discovery_decisions')
    .upsert({ profile_id: userId, event_id: eventId, decision });
  if (error) throw error;
}

export async function fetchMyEvents(userId: string, isDemo: boolean): Promise<MyEvent[]> {
  if (isDemo) {
    const rsvps = await demoRsvps();
    return (
      await Promise.all(
        Object.values(rsvps).map(async (rsvp) => ({
          event: await fetchEventDetail(rsvp.eventId, true),
          relationship: rsvp.status
        }))
      )
    ).filter((item) => item.relationship !== 'cancelled');
  }

  const supabase = requireSupabase();
  const [{ data: rsvpRows, error: rsvpError }, { data: hostRows, error: hostError }] =
    await Promise.all([
      supabase
        .from('event_rsvps')
        .select('event_id,status')
        .eq('profile_id', userId)
        .in('status', ['confirmed', 'waitlisted', 'pending']),
      supabase.from('event_hosts').select('event_id').eq('profile_id', userId)
    ]);
  if (rsvpError) throw rsvpError;
  if (hostError) throw hostError;

  const relationships = new Map<string, MyEvent['relationship']>();
  rsvpRows?.forEach((row) => relationships.set(row.event_id, row.status));
  hostRows?.forEach((row) => relationships.set(row.event_id, 'hosting'));
  return Promise.all(
    [...relationships].map(async ([eventId, relationship]) => ({
      event: await fetchEventDetail(eventId, false),
      relationship
    }))
  );
}

export async function fetchEventMessages(
  eventId: string,
  isDemo: boolean
): Promise<EventMessage[]> {
  if (isDemo) return [];
  const { data, error } = await requireSupabase().rpc('get_event_messages', {
    target_event_id: eventId,
    page_size: 50
  });
  if (error) throw error;
  return z.array(eventMessageSchema).parse(data) as EventMessage[];
}

export async function sendEventMessage(input: {
  eventId: string;
  senderId: string;
  body: string;
  clientId: string;
  replyToId?: string | null;
  isDemo: boolean;
}): Promise<EventMessage> {
  if (input.isDemo) {
    return {
      id: input.clientId,
      eventId: input.eventId,
      senderId: input.senderId,
      senderName: 'You',
      senderAvatarPath: null,
      kind: 'text',
      body: input.body,
      replyToId: input.replyToId ?? null,
      clientId: input.clientId,
      removedAt: null,
      createdAt: new Date().toISOString(),
      reactions: []
    };
  }
  const { error } = await requireSupabase()
    .from('event_messages')
    .insert({
      event_id: input.eventId,
      sender_id: input.senderId,
      kind: 'text',
      body: input.body,
      client_id: input.clientId,
      reply_to_id: input.replyToId ?? null
    });
  if (error) throw error;
  return {
    id: input.clientId,
    eventId: input.eventId,
    senderId: input.senderId,
    senderName: 'You',
    senderAvatarPath: null,
    kind: 'text',
    body: input.body,
    replyToId: input.replyToId ?? null,
    clientId: input.clientId,
    removedAt: null,
    createdAt: new Date().toISOString(),
    reactions: []
  };
}

export async function setEventMessageReaction(input: {
  messageId: string;
  reaction: '👍' | '❤️' | '😂' | '🎉' | '❗';
  enabled: boolean;
  isDemo: boolean;
}): Promise<void> {
  if (input.isDemo) return;
  const { error } = await requireSupabase().rpc('set_event_message_reaction', {
    target_message_id: input.messageId,
    reaction_value: input.reaction,
    enabled: input.enabled
  });
  if (error) throw error;
}

export async function createEvent(
  input: CreateEventInput,
  actor: { id: string; campusId: string },
  isDemo: boolean
): Promise<string> {
  if (isDemo) return Crypto.randomUUID();
  const supabase = requireSupabase();
  const { error: acceptanceError } = await supabase.from('legal_acceptances').upsert(
    [
      { profile_id: actor.id, document_type: 'terms', document_version: 'beta-2026-08' },
      {
        profile_id: actor.id,
        document_type: 'community_guidelines',
        document_version: 'beta-2026-08'
      }
    ],
    {
      onConflict: 'profile_id,document_type,document_version',
      ignoreDuplicates: true
    }
  );
  if (acceptanceError) throw acceptanceError;
  const eventId = Crypto.randomUUID();
  const slug = `${input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72)}-${eventId.slice(0, 8)}`;
  const { error: insertError } = await supabase.from('events').insert({
    id: eventId,
    campus_id: actor.campusId,
    ...(input.organizationId ? { organization_id: input.organizationId } : {}),
    created_by: actor.id,
    slug,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    timezone: input.timezone,
    venue_name: input.venueName.trim(),
    location_description: input.locationDescription.trim(),
    capacity: input.capacity,
    waitlist_enabled: input.waitlistEnabled,
    approval_required: input.approvalRequired,
    visibility: input.visibility,
    min_age: 18,
    accessibility_information: input.accessibilityInformation.trim() || null,
    cost_information: input.costInformation.trim() || null,
    cancellation_policy: input.cancellationPolicy.trim() || null,
    safety_rules: input.safetyRules.trim() || null,
    status: 'draft'
  });
  if (insertError) throw insertError;
  if (input.publish !== false) {
    const { error: publishError } = await supabase.rpc('publish_event', {
      target_event_id: eventId
    });
    if (publishError) throw publishError;
  }
  return eventId;
}

export async function duplicateHostedEvent(
  eventId: string,
  isDemo: boolean
): Promise<string> {
  if (isDemo) return Crypto.randomUUID();
  const { data, error } = await requireSupabase().rpc('duplicate_event', {
    target_event_id: eventId
  });
  if (error) throw error;
  return data;
}

export async function fetchEventAttendees(
  eventId: string,
  isDemo: boolean
): Promise<EventAttendeeDashboard> {
  if (isDemo) {
    return {
      attendees: [],
      counts: { confirmed: 0, pending: 0, waitlisted: 0, checkedIn: 0 }
    };
  }
  const { data, error } = await requireSupabase().rpc('get_event_attendees', {
    target_event_id: eventId
  });
  if (error) throw error;
  return attendeeDashboardSchema.parse(data) as EventAttendeeDashboard;
}

export async function reviewEventRsvp(
  rsvpId: string,
  approve: boolean,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc('review_event_rsvp', {
    target_rsvp_id: rsvpId,
    approve,
    review_reason: approve ? 'Approved by event host' : 'Declined by event host'
  });
  if (error) throw error;
}

export async function createEventAnnouncement(
  eventId: string,
  title: string,
  body: string,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc('create_event_announcement', {
    target_event_id: eventId,
    announcement_title: title,
    announcement_body: body
  });
  if (error) throw error;
}

export async function cancelHostedEvent(
  eventId: string,
  reason: string,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc('cancel_event', {
    target_event_id: eventId,
    cancellation_reason: reason
  });
  if (error) throw error;
}

export async function archiveHostedEvent(
  eventId: string,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc('archive_event', {
    target_event_id: eventId
  });
  if (error) throw error;
}

export async function createEventCheckinCode(
  eventId: string,
  isDemo: boolean
): Promise<string> {
  const rawToken =
    Crypto.randomUUID().replace(/-/g, '') + Crypto.randomUUID().replace(/-/g, '');
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawToken
  );
  if (!isDemo) {
    const { error } = await requireSupabase().rpc('create_event_checkin_token_digest', {
      target_event_id: eventId,
      target_digest: digest,
      ttl_seconds: 60
    });
    if (error) throw error;
  }
  return `ruckus-event-checkin:v1:${eventId}:${rawToken}`;
}

export async function redeemEventCheckinCode(
  payload: string,
  expectedEventId: string,
  isDemo: boolean
): Promise<{ alreadyCheckedIn: boolean; verifiedAt: string }> {
  const [namespace, version, eventId, rawToken, extra] = payload.trim().split(':');
  if (
    namespace !== 'ruckus-event-checkin' ||
    version !== 'v1' ||
    eventId !== expectedEventId ||
    !rawToken ||
    extra ||
    !/^[0-9a-f]{64}$/i.test(rawToken)
  ) {
    throw new Error('CHECKIN_CODE_INVALID');
  }
  if (isDemo) return { alreadyCheckedIn: false, verifiedAt: new Date().toISOString() };
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawToken
  );
  const { data, error } = await requireSupabase().rpc(
    'redeem_event_checkin_token_digest',
    {
      target_digest: digest
    }
  );
  if (error) throw error;
  const parsed = z
    .object({ alreadyCheckedIn: z.boolean(), verifiedAt: z.string() })
    .parse(data);
  return parsed;
}

export function eventErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('EVENT_AT_CAPACITY')) return 'This event just filled up.';
  if (message.includes('EVENT_NOT_JOINABLE')) return 'This event is no longer open.';
  if (message.includes('EVENT_NOT_ELIGIBLE'))
    return 'This event is not available to your account.';
  if (message.includes('AGE_ELIGIBILITY'))
    return 'This beta is limited to verified 18+ students.';
  if (message.includes('EVENT_CREATION_NOT_ALLOWED')) {
    return 'Create events through an authorized organization or a trusted host account.';
  }
  return 'Something changed while saving. Refresh and try again.';
}

export function summarizeEventForShare(event: EventSummary): string {
  return `${event.title}\n${new Date(event.startsAt).toLocaleString()}\n${event.venueName}`;
}
