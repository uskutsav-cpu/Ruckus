import { describe, expect, it, vi } from 'vitest';

import {
  exportCampusAggregateCsv,
  fetchCampusAdminAccess,
  fetchCampusOverview,
  fetchPublishedAnnouncements
} from '@/features/campus-admin/campus-admin-service';
import {
  campusAdminCapabilities,
  hasCampusCapability
} from '@/features/campus-admin/campus-admin-types';

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => {
    throw new Error('Connected backend must not be used by demo adapter tests.');
  }
}));

const campusId = '00000000-0000-4000-8000-000000000001';

describe('campus administration demo adapter', () => {
  it('never reports a campus role as platform administration', async () => {
    const access = await fetchCampusAdminAccess(true);
    expect(access.platformAdministrator).toBe(false);
    expect(access.campuses).toHaveLength(1);
  });

  it('surfaces suppressed cohorts as null rather than a rounded number', async () => {
    const overview = await fetchCampusOverview(campusId, true);
    expect(overview.privacy.smallCohortsSuppressed).toBe(true);
    const suppressedTrend = overview.reportTrends.find((trend) => trend.suppressed);
    expect(suppressedTrend?.count).toBeNull();
  });

  it('exports aggregate rows without identifying columns', async () => {
    const csv = await exportCampusAggregateCsv(
      campusId,
      '2026-07-02',
      '2026-08-01',
      true
    );
    expect(csv).toContain('date,events,impressions');
    expect(csv).not.toContain('email');
    expect(csv).not.toContain('profile_id');
  });

  it('omits author identity from the student announcement feed', async () => {
    const announcements = await fetchPublishedAnnouncements(true);
    expect(announcements.length).toBeGreaterThan(0);
    for (const announcement of announcements) {
      expect(announcement).not.toHaveProperty('authorId');
      expect(announcement).not.toHaveProperty('approvedBy');
    }
  });
});

describe('campus capability mapping', () => {
  const access = {
    platformAdministrator: false,
    campuses: [
      { campusId, campusName: 'Demo State University', role: 'analyst' as const }
    ]
  };

  it('grants only the capabilities the held role maps to', () => {
    expect(hasCampusCapability(access, campusId, 'overview')).toBe(true);
    expect(hasCampusCapability(access, campusId, 'export')).toBe(true);
    expect(hasCampusCapability(access, campusId, 'verification')).toBe(false);
    expect(hasCampusCapability(access, campusId, 'announcements')).toBe(false);
    expect(hasCampusCapability(access, campusId, 'moderation')).toBe(false);
  });

  it('does not carry a campus role across campuses', () => {
    expect(
      hasCampusCapability(access, '00000000-0000-4000-8000-0000000000ff', 'overview')
    ).toBe(false);
  });

  it('keeps announcement authoring separate from audit reading', () => {
    expect(campusAdminCapabilities.announcements).not.toContain('viewer');
    expect(campusAdminCapabilities.audit).not.toContain('announcement_manager');
  });
});
