import { describe, expect, it } from 'vitest';

import { sanitizeAnalyticsProperties } from '@/lib/analytics';

describe('sanitizeAnalyticsProperties', () => {
  it('removes sensitive property classes', () => {
    expect(
      sanitizeAnalyticsProperties({
        eventType: 'outdoor',
        messageBody: 'private chat',
        reportDescription: 'private report',
        preciseLocation: 'private location'
      })
    ).toEqual({ eventType: 'outdoor' });
  });

  it('bounds retained string values', () => {
    expect(
      String(sanitizeAnalyticsProperties({ source: 'a'.repeat(200) }).source).length
    ).toBe(120);
  });
});
