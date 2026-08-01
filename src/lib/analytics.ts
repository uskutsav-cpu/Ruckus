import { logger } from '@/lib/logger';

export type ProductEventName =
  | 'onboarding_completed'
  | 'discovery_card_viewed'
  | 'event_passed'
  | 'join_attempted'
  | 'rsvp_confirmed'
  | 'rsvp_waitlisted'
  | 'rsvp_cancelled'
  | 'event_shared'
  | 'chat_opened'
  | 'message_sent'
  | 'checkin_completed'
  | 'rating_submitted'
  | 'event_created'
  | 'event_published'
  | 'referral_completed';

type AnalyticsValue = string | number | boolean | null;
export type AnalyticsProperties = Readonly<Record<string, AnalyticsValue>>;

const sensitiveKey =
  /body|description|detail|email|name|password|token|secret|location|coordinate|report/i;

export function sanitizeAnalyticsProperties(
  properties: AnalyticsProperties
): AnalyticsProperties {
  const sanitized: Record<string, AnalyticsValue> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (sensitiveKey.test(key)) continue;
    sanitized[key] = typeof value === 'string' ? value.slice(0, 120) : value;
  }
  return sanitized;
}

export const analytics = {
  track(event: ProductEventName, properties: AnalyticsProperties = {}): void {
    logger.debug(`analytics.${event}`, sanitizeAnalyticsProperties(properties));
  },
  startTiming(metric: string): () => void {
    const start = performance.now();
    return () => {
      logger.debug('performance.timing', {
        metric: metric.slice(0, 80),
        durationMs: Math.round(performance.now() - start)
      });
    };
  },
  captureError(boundary: string, error: unknown): void {
    logger.error('error.captured', {
      boundary: boundary.slice(0, 80),
      errorType: error instanceof Error ? error.name : 'UnknownError'
    });
  }
};
