import type { Database } from '@/types/database.generated';

export type GrowthCampaignKind = Database['public']['Enums']['growth_campaign_kind'];
export type GrowthCampaignStatus = Database['public']['Enums']['growth_campaign_status'];
export type CampaignAssetKind = Database['public']['Enums']['campaign_asset_kind'];
export type CompetitionMetric = Database['public']['Enums']['competition_metric'];

export type CampaignAsset = {
  id: string;
  kind: CampaignAssetKind;
  label: string;
  /** Opaque token printed into the QR code; carries no campus identifier. */
  token: string;
  deepLink: string;
  scans: number;
};

export type GrowthCampaign = {
  id: string;
  kind: GrowthCampaignKind;
  name: string;
  status: GrowthCampaignStatus;
  startsAt: string;
  endsAt: string;
  assets: CampaignAsset[];
};

export type CompetitionSummary = {
  id: string;
  name: string;
  metric: CompetitionMetric;
  startsOn: string;
  endsOn: string;
  isOpen: boolean;
};

export type CompetitionStanding = {
  rank: number;
  organizationId: string;
  organizationName: string;
  score: number;
};

export type CompetitionStandings = {
  id: string;
  name: string;
  metric: CompetitionMetric;
  startsOn: string;
  endsOn: string;
  standings: CompetitionStanding[];
};

export type CampusGrowthAnalytics = {
  campusId: string;
  range: { start: string; end: string };
  privacy: { smallCohortsSuppressed: boolean; minimumCohort: number };
  counts: {
    newStudents: number | null;
    newStudentsSuppressed: boolean;
    referralsAttributed: number;
    referralsQualified: number;
    activeAmbassadors: number;
    campaignScans: number;
    openCompetitions: number;
  };
  referralFunnel: {
    attributed: number;
    qualified: number;
    conversion: number | null;
  };
};

export const campaignKindLabels: Record<GrowthCampaignKind, string> = {
  welcome_week: 'Welcome week',
  orientation: 'Orientation',
  club_fair: 'Club fair',
  custom: 'Custom'
};

export const campaignAssetKindLabels: Record<CampaignAssetKind, string> = {
  qr_poster: 'QR poster',
  short_link: 'Short link',
  table_card: 'Table card'
};

export const competitionMetricLabels: Record<CompetitionMetric, string> = {
  verified_checkins: 'Verified attendance',
  events_hosted: 'Events hosted',
  qualified_referrals: 'Qualified referrals'
};

/**
 * How each competition metric is scored, shown to students so a leaderboard is
 * never an unexplained ranking.
 */
export const competitionMetricRules: Record<CompetitionMetric, string> = {
  verified_checkins:
    'One point per verified check-in at an event this organization hosted. Self-reported attendance never counts.',
  events_hosted:
    'One point per event that actually reached completion inside the competition window.',
  qualified_referrals:
    'One point per referral that qualified, which requires the referred student to complete a verified check-in.'
};
