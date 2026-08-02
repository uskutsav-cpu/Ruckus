import { z } from 'zod';

import type {
  AnalyticsPeriod,
  EventAnalytics,
  OrganizerAttributionSource
} from '@/features/analytics/organizer-analytics-types';
import { requireSupabase } from '@/lib/supabase';

const nonnegativeInteger = z.coerce.number().int().nonnegative();
const rateSchema = z.object({
  numerator: nonnegativeInteger,
  denominator: nonnegativeInteger,
  value: z.coerce.number().min(0).nullable()
});
const analyticsSchema = z.object({
  eventId: z.string().uuid(),
  timezone: z.string().min(1),
  period: z.enum(['daily', 'weekly', 'monthly', 'semester', 'lifecycle']),
  range: z.object({ start: z.string(), end: z.string() }),
  counts: z.object({
    feedImpressions: nonnegativeInteger,
    eventCardOpens: nonnegativeInteger,
    joinAttempts: nonnegativeInteger,
    confirmedRsvps: nonnegativeInteger,
    pendingRequests: nonnegativeInteger,
    waitlistAdditions: nonnegativeInteger,
    cancellations: nonnegativeInteger,
    waitlistPromotions: nonnegativeInteger,
    shares: nonnegativeInteger,
    referralVisits: nonnegativeInteger,
    chatParticipants: nonnegativeInteger,
    checkins: nonnegativeInteger,
    noShows: nonnegativeInteger,
    ratings: nonnegativeInteger,
    ratingAverage: z.coerce.number().min(1).max(5).nullable(),
    repeatAttendees: nonnegativeInteger
  }),
  rates: z.object({
    detailView: rateSchema,
    rsvpConversion: rateSchema,
    attendanceConversion: rateSchema,
    cancellation: rateSchema,
    noShow: rateSchema,
    waitlistConversion: rateSchema,
    shareConversion: rateSchema,
    repeatAttendee: rateSchema
  }),
  attributionSources: z.record(z.string(), nonnegativeInteger),
  timeline: z.array(
    z.object({
      date: z.string(),
      rsvpVelocity: nonnegativeInteger,
      cancellations: nonnegativeInteger,
      checkins: nonnegativeInteger,
      chatParticipants: nonnegativeInteger,
      referralVisits: nonnegativeInteger
    })
  ),
  timeAndDayFunnel: z.array(
    z.object({
      dayOfWeek: z.coerce.number().int().min(0).max(6),
      hourOfDay: z.coerce.number().int().min(0).max(23),
      impressions: nonnegativeInteger.nullable(),
      opens: nonnegativeInteger.nullable(),
      joinAttempts: nonnegativeInteger.nullable(),
      suppressed: z.boolean()
    })
  ),
  privacy: z.object({
    eventCellThreshold: z.coerce.number().int().positive(),
    heatmapMeaning: z.string()
  })
});

const demoAnalytics: EventAnalytics = {
  eventId: '70000000-0000-4000-8000-000000000001',
  timezone: 'America/Chicago',
  period: 'lifecycle',
  range: { start: '2026-07-21', end: '2026-08-01' },
  counts: {
    feedImpressions: 428,
    eventCardOpens: 174,
    joinAttempts: 82,
    confirmedRsvps: 64,
    pendingRequests: 8,
    waitlistAdditions: 10,
    cancellations: 6,
    waitlistPromotions: 5,
    shares: 31,
    referralVisits: 48,
    chatParticipants: 36,
    checkins: 52,
    noShows: 6,
    ratings: 24,
    ratingAverage: 4.6,
    repeatAttendees: 18
  },
  rates: {
    detailView: { numerator: 174, denominator: 428, value: 0.4065 },
    rsvpConversion: { numerator: 82, denominator: 174, value: 0.4713 },
    attendanceConversion: { numerator: 52, denominator: 64, value: 0.8125 },
    cancellation: { numerator: 6, denominator: 70, value: 0.0857 },
    noShow: { numerator: 6, denominator: 58, value: 0.1034 },
    waitlistConversion: { numerator: 5, denominator: 10, value: 0.5 },
    shareConversion: { numerator: 48, denominator: 31, value: 1.5484 },
    repeatAttendee: { numerator: 18, denominator: 52, value: 0.3462 }
  },
  attributionSources: {
    event_share_link: 24,
    internal_recommendation: 14,
    qr_poster: 10
  },
  timeline: [
    {
      date: '2026-07-30',
      rsvpVelocity: 18,
      cancellations: 1,
      checkins: 0,
      chatParticipants: 9,
      referralVisits: 12
    },
    {
      date: '2026-08-01',
      rsvpVelocity: 9,
      cancellations: 2,
      checkins: 52,
      chatParticipants: 21,
      referralVisits: 8
    }
  ],
  timeAndDayFunnel: [],
  privacy: {
    eventCellThreshold: 3,
    heatmapMeaning: 'Time-and-day funnel activity; never a movement or location map.'
  }
};

export async function fetchEventAnalytics(
  eventId: string,
  period: AnalyticsPeriod,
  isDemo: boolean
): Promise<EventAnalytics> {
  if (isDemo) return { ...demoAnalytics, eventId, period };
  const { data, error } = await requireSupabase().rpc('get_event_analytics', {
    target_event_id: eventId,
    period_key: period
  });
  if (error) throw error;
  return analyticsSchema.parse(data) as EventAnalytics;
}

export async function exportEventAnalyticsCsv(
  eventId: string,
  period: AnalyticsPeriod,
  isDemo: boolean
): Promise<string> {
  if (isDemo) {
    return 'date,feed_impressions,event_card_opens,join_attempts,confirmed_rsvps,checkins\n"2026-08-01",428,174,82,64,52';
  }
  const { data, error } = await requireSupabase().rpc('export_event_analytics_csv', {
    target_event_id: eventId,
    period_key: period
  });
  if (error) throw error;
  return z.string().parse(data);
}

export async function createAttributionToken(
  eventId: string,
  source: OrganizerAttributionSource,
  isDemo: boolean
): Promise<string> {
  if (isDemo) return 'demo-attribution-token';
  const { data, error } = await requireSupabase().rpc('create_event_attribution_token', {
    target_event_id: eventId,
    attribution_source: source
  });
  if (error) throw error;
  return z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .parse(data);
}

export { analyticsSchema };
