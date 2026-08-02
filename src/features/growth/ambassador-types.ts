import type { Database } from '@/types/database.generated';

export type AmbassadorStatus = Database['public']['Enums']['ambassador_status'];
export type AmbassadorTier = Database['public']['Enums']['ambassador_tier'];
export type AmbassadorApplicationStatus =
  Database['public']['Enums']['ambassador_application_status'];

export type AmbassadorDashboard =
  | { isAmbassador: false }
  | {
      isAmbassador: true;
      status: AmbassadorStatus;
      tier: AmbassadorTier;
      activatedAt: string;
      /** Null once the ambassador is retired and their code is deactivated. */
      referralCode: string | null;
      counts: { attributed: number; qualified: number };
      nextTier: { tier: AmbassadorTier; qualifiedNeeded: number } | null;
      privacy: string;
    };

export type AmbassadorApplication = {
  id: string;
  profileId: string;
  displayName: string | null;
  motivation: string;
  status: AmbassadorApplicationStatus;
  createdAt: string;
};

export type SemesterLeaderboardEntry = {
  rank: number;
  profileId: string;
  displayName: string | null;
  avatarPath: string | null;
  xpTotal: number;
};

export type SemesterLeaderboard = {
  semester: { id: string; name: string; startsOn: string; endsOn: string } | null;
  entries: SemesterLeaderboardEntry[];
  /** Present even when the viewer has opted out of appearing in standings. */
  viewer: { xpTotal: number; rank: number } | null;
};

export const ambassadorTierLabels: Record<AmbassadorTier, string> = {
  rookie: 'Rookie',
  builder: 'Builder',
  leader: 'Leader'
};
