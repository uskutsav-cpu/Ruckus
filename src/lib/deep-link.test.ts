import { describe, expect, it } from 'vitest';

import { safeDeepLinkPath } from '@/lib/deep-link';

const eventId = '70000000-0000-4000-8000-000000000001';

describe('safeDeepLinkPath', () => {
  it('accepts current and legacy event links', () => {
    expect(safeDeepLinkPath(`ruckus://event/${eventId}`)).toBe(`/event/${eventId}`);
    expect(safeDeepLinkPath(`campusclash://event/${eventId}`)).toBe(`/event/${eventId}`);
  });

  it('keeps check-in tokens only on the check-in route', () => {
    expect(safeDeepLinkPath(`ruckus://check-in/${eventId}?token=opaque`)).toBe(
      `/check-in/${eventId}?token=opaque`
    );
    expect(safeDeepLinkPath('ruckus://public?token=opaque')).toBe('/public');
  });

  it('accepts bounded referral paths without forwarding arbitrary query data', () => {
    expect(safeDeepLinkPath('ruckus://public/referral/RUCKUS123?token=opaque')).toBe(
      '/public/referral/RUCKUS123'
    );
    expect(safeDeepLinkPath('ruckus://public/referral/too-short')).toBe('/public');
  });

  it('falls back safely for unknown protocols and paths', () => {
    expect(safeDeepLinkPath('javascript:alert(1)')).toBe('/public');
    expect(safeDeepLinkPath('ruckus://admin/secrets')).toBe('/public');
  });
});
