import { describe, expect, it, vi } from 'vitest';

import {
  fetchAmbassadorDashboard,
  fetchSemesterLeaderboard
} from '@/features/growth/ambassador-service';

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => {
    throw new Error('Connected backend must not be used by demo adapter tests.');
  }
}));

describe('ambassador demo adapter', () => {
  it('reports referral impact as counts and never as identities', async () => {
    const dashboard = await fetchAmbassadorDashboard(true);
    expect(dashboard.isAmbassador).toBe(true);
    const serialized = JSON.stringify(dashboard);
    expect(serialized).not.toContain('referredProfileId');
    expect(serialized).not.toContain('@');
  });

  it('counts qualified referrals separately from raw signups', async () => {
    const dashboard = await fetchAmbassadorDashboard(true);
    if (!dashboard.isAmbassador) throw new Error('expected an ambassador dashboard');
    expect(dashboard.counts.qualified).toBeLessThanOrEqual(dashboard.counts.attributed);
    expect(dashboard.nextTier?.qualifiedNeeded).toBeGreaterThan(0);
  });
});

describe('semester leaderboard demo adapter', () => {
  it('returns the viewer standing alongside ranked entries', async () => {
    const leaderboard = await fetchSemesterLeaderboard(true);
    expect(leaderboard.semester?.name).toBe('Fall 2026');
    expect(leaderboard.viewer?.rank).toBeGreaterThan(0);
    expect(leaderboard.entries[0]?.rank).toBe(1);
  });

  it('never exposes contact details in standings', async () => {
    const leaderboard = await fetchSemesterLeaderboard(true);
    expect(JSON.stringify(leaderboard)).not.toContain('@');
  });
});
