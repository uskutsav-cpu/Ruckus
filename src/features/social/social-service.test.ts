import { describe, expect, it, vi } from 'vitest';

import {
  fetchSocialConnections,
  fetchSocialOverview,
  fetchSocialProfile,
  fetchSocialSuggestions,
  updateSocialPreferences
} from '@/features/social/social-service';

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => {
    throw new Error('Connected backend must not be used by demo adapter tests.');
  }
}));

describe('social demo adapter', () => {
  it('returns deterministic local preview data without a backend client', async () => {
    const [overview, connections, suggestions, profile] = await Promise.all([
      fetchSocialOverview(true),
      fetchSocialConnections('friends', null, true),
      fetchSocialSuggestions(null, true),
      fetchSocialProfile('10000000-0000-4000-8000-000000000002', true)
    ]);

    expect(overview.preferences.showInSuggestions).toBe(false);
    expect(connections.items).toHaveLength(2);
    expect(suggestions.items[0]?.explanation).toBe('2 mutual friends');
    expect(profile.displayName).toBe('Jordan');
    expect(profile.followStatus).toBeNull();
  });

  it('round-trips social privacy choices only in demo mode', async () => {
    const preferences = {
      profileVisibility: 'private' as const,
      attendanceVisibility: 'private' as const,
      allowFriendRequests: false,
      followPolicy: 'disabled' as const,
      showInSuggestions: false
    };

    await expect(updateSocialPreferences(preferences, true)).resolves.toEqual(
      preferences
    );
  });
});
