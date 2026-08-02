import { describe, expect, it, vi } from 'vitest';

import {
  createAttributionToken,
  exportEventAnalyticsCsv,
  fetchEventAnalytics
} from '@/features/analytics/organizer-analytics-service';

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => {
    throw new Error('Connected backend must not be used by demo adapter tests.');
  }
}));

describe('organizer analytics demo adapter', () => {
  it('returns explicit funnel denominators and privacy metadata', async () => {
    const analytics = await fetchEventAnalytics(
      '70000000-0000-4000-8000-000000000001',
      'monthly',
      true
    );
    expect(analytics.period).toBe('monthly');
    expect(analytics.rates.attendanceConversion.denominator).toBe(64);
    expect(analytics.privacy.heatmapMeaning).toContain('never a movement');
  });

  it('exports aggregate-only CSV and creates a demo token locally', async () => {
    const eventId = '70000000-0000-4000-8000-000000000001';
    const csv = await exportEventAnalyticsCsv(eventId, 'lifecycle', true);
    expect(csv).toContain('feed_impressions');
    expect(csv).not.toContain('email');
    await expect(createAttributionToken(eventId, 'qr_poster', true)).resolves.toBe(
      'demo-attribution-token'
    );
  });
});
