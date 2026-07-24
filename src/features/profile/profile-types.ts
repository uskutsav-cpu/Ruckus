import type { XpReason } from '@/types/database.generated';

export type XpEntry = {
  id: string;
  amount: number;
  reason: XpReason;
  createdAt: string;
};

export type ProfileDashboard = {
  xpTotal: number;
  avatarUrl: string | null;
  campusName: string;
  xpEntries: XpEntry[];
  selectedInterestIds: string[];
};

export type LeaderboardPeriod = 'week' | 'month' | 'all';

export type LeaderboardEntry = {
  profileId: string;
  displayName: string;
  avatarPath: string | null;
  xp: number;
  rank: number;
  isCurrentUser: boolean;
};
