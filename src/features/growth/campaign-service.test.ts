import { describe, expect, it, vi } from 'vitest';

import {
  fetchCampusCampaigns,
  fetchCampusGrowthAnalytics,
  fetchCompetitionStandings
} from '@/features/growth/campaign-service';
import { competitionMetricRules } from '@/features/growth/campaign-types';

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => {
    throw new Error('Connected backend must not be used by demo adapter tests.');
  }
}));

const campusId = '00000000-0000-4000-8000-000000000001';

describe('campaign demo adapter', () => {
  it('exposes an opaque asset token that carries no campus identifier', async () => {
    const campaigns = await fetchCampusCampaigns(campusId, true);
    const assets = campaigns.flatMap((campaign) => campaign.assets);
    expect(assets.length).toBeGreaterThan(0);
    for (const asset of assets) {
      expect(asset.token).toMatch(/^[a-f0-9]{32}$/);
      expect(asset.token).not.toContain(campusId);
    }
  });

  it('keeps campaign destinations on the ruckus scheme', async () => {
    const campaigns = await fetchCampusCampaigns(campusId, true);
    for (const asset of campaigns.flatMap((campaign) => campaign.assets)) {
      expect(asset.deepLink.startsWith('ruckus://')).toBe(true);
    }
  });
});

describe('competition standings demo adapter', () => {
  it('ranks organizations and never individual students', async () => {
    const standings = await fetchCompetitionStandings(
      '98000000-0000-4000-8000-0000000000c1',
      true
    );
    const serialized = JSON.stringify(standings);
    expect(serialized).not.toContain('profileId');
    expect(serialized).not.toContain('@');
    expect(standings.standings[0]?.rank).toBe(1);
  });

  it('publishes a scoring rule for every metric it can rank', async () => {
    const standings = await fetchCompetitionStandings(
      '98000000-0000-4000-8000-0000000000c1',
      true
    );
    expect(competitionMetricRules[standings.metric]).toBeTruthy();
    expect(competitionMetricRules.qualified_referrals).toContain('verified check-in');
  });
});

describe('growth analytics demo adapter', () => {
  it('separates qualified referrals from raw attribution', async () => {
    const analytics = await fetchCampusGrowthAnalytics(campusId, true);
    expect(analytics.counts.referralsQualified).toBeLessThanOrEqual(
      analytics.counts.referralsAttributed
    );
    expect(analytics.referralFunnel.conversion).toBeLessThanOrEqual(1);
  });

  it('declares the cohort suppression threshold', async () => {
    const analytics = await fetchCampusGrowthAnalytics(campusId, true);
    expect(analytics.privacy.smallCohortsSuppressed).toBe(true);
    expect(analytics.privacy.minimumCohort).toBeGreaterThan(1);
  });
});
