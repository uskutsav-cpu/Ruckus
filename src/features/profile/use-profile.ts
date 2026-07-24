import { useQuery } from '@tanstack/react-query';

import {
  fetchLeaderboard,
  fetchProfileDashboard
} from '@/features/profile/profile-service';
import type { LeaderboardPeriod } from '@/features/profile/profile-types';
import { useAuth } from '@/providers/auth-provider';

export function useProfileDashboard() {
  const { isDemo, profile, user } = useAuth();
  return useQuery({
    queryKey: ['profile-dashboard', user?.id, profile?.avatar_path, isDemo],
    queryFn: () =>
      fetchProfileDashboard(user?.id ?? '', profile?.avatar_path ?? null, isDemo),
    enabled: Boolean(user)
  });
}

export function useLeaderboard(period: LeaderboardPeriod) {
  const { isDemo, user } = useAuth();
  return useQuery({
    queryKey: ['leaderboard', period, isDemo],
    queryFn: () => fetchLeaderboard(period, isDemo),
    enabled: Boolean(user)
  });
}
