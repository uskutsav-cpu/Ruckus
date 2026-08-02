export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'semester' | 'lifecycle';

export type AnalyticsRate = {
  numerator: number;
  denominator: number;
  value: number | null;
};

export type EventAnalytics = {
  eventId: string;
  timezone: string;
  period: AnalyticsPeriod;
  range: { start: string; end: string };
  counts: {
    feedImpressions: number;
    eventCardOpens: number;
    joinAttempts: number;
    confirmedRsvps: number;
    pendingRequests: number;
    waitlistAdditions: number;
    cancellations: number;
    waitlistPromotions: number;
    shares: number;
    referralVisits: number;
    chatParticipants: number;
    checkins: number;
    noShows: number;
    ratings: number;
    ratingAverage: number | null;
    repeatAttendees: number;
  };
  rates: {
    detailView: AnalyticsRate;
    rsvpConversion: AnalyticsRate;
    attendanceConversion: AnalyticsRate;
    cancellation: AnalyticsRate;
    noShow: AnalyticsRate;
    waitlistConversion: AnalyticsRate;
    shareConversion: AnalyticsRate;
    repeatAttendee: AnalyticsRate;
  };
  attributionSources: Record<string, number>;
  timeline: {
    date: string;
    rsvpVelocity: number;
    cancellations: number;
    checkins: number;
    chatParticipants: number;
    referralVisits: number;
  }[];
  timeAndDayFunnel: {
    dayOfWeek: number;
    hourOfDay: number;
    impressions: number | null;
    opens: number | null;
    joinAttempts: number | null;
    suppressed: boolean;
  }[];
  privacy: { eventCellThreshold: number; heatmapMeaning: string };
};

export type OrganizerAttributionSource =
  'event_share_link' | 'organization_page' | 'qr_poster';
