import { z } from 'zod';

import type {
  CampaignAssetKind,
  CampusGrowthAnalytics,
  CompetitionMetric,
  CompetitionStandings,
  CompetitionSummary,
  GrowthCampaign,
  GrowthCampaignKind
} from '@/features/growth/campaign-types';
import { requireSupabase } from '@/lib/supabase';

const nonnegativeInteger = z.coerce.number().int().nonnegative();
const campaignKind = z.enum(['welcome_week', 'orientation', 'club_fair', 'custom']);
const campaignStatus = z.enum(['draft', 'scheduled', 'active', 'completed', 'cancelled']);
const assetKind = z.enum(['qr_poster', 'short_link', 'table_card']);
const competitionMetric = z.enum([
  'verified_checkins',
  'events_hosted',
  'qualified_referrals'
]);

const campaignsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    kind: campaignKind,
    name: z.string(),
    status: campaignStatus,
    startsAt: z.string(),
    endsAt: z.string(),
    assets: z.array(
      z.object({
        id: z.string().uuid(),
        kind: assetKind,
        label: z.string(),
        token: z.string().regex(/^[a-f0-9]{32}$/),
        deepLink: z.string(),
        scans: nonnegativeInteger
      })
    )
  })
);

const competitionsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    metric: competitionMetric,
    startsOn: z.string(),
    endsOn: z.string(),
    isOpen: z.boolean()
  })
);

const standingsSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  metric: competitionMetric,
  startsOn: z.string(),
  endsOn: z.string(),
  standings: z.array(
    z.object({
      rank: z.coerce.number().int().positive(),
      organizationId: z.string().uuid(),
      organizationName: z.string(),
      score: nonnegativeInteger
    })
  )
});

const growthAnalyticsSchema = z.object({
  campusId: z.string().uuid(),
  range: z.object({ start: z.string(), end: z.string() }),
  privacy: z.object({
    smallCohortsSuppressed: z.boolean(),
    minimumCohort: z.coerce.number().int().positive()
  }),
  counts: z.object({
    newStudents: nonnegativeInteger.nullable(),
    newStudentsSuppressed: z.boolean(),
    referralsAttributed: nonnegativeInteger,
    referralsQualified: nonnegativeInteger,
    activeAmbassadors: nonnegativeInteger,
    campaignScans: nonnegativeInteger,
    openCompetitions: nonnegativeInteger
  }),
  referralFunnel: z.object({
    attributed: nonnegativeInteger,
    qualified: nonnegativeInteger,
    conversion: z.coerce.number().nullable()
  })
});

const demoCampusId = '00000000-0000-4000-8000-000000000001';

const demoCampaigns: GrowthCampaign[] = [
  {
    id: '97000000-0000-4000-8000-0000000000a1',
    kind: 'welcome_week',
    name: 'Welcome Week 2026',
    status: 'scheduled',
    startsAt: '2026-08-24T12:00:00.000Z',
    endsAt: '2026-08-31T12:00:00.000Z',
    assets: [
      {
        id: '97000000-0000-4000-8000-0000000000b1',
        kind: 'qr_poster',
        label: 'Union entrance poster',
        token: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
        deepLink: 'ruckus://discover',
        scans: 184
      },
      {
        id: '97000000-0000-4000-8000-0000000000b2',
        kind: 'table_card',
        label: 'Dining hall table card',
        token: 'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3',
        deepLink: 'ruckus://discover',
        scans: 62
      }
    ]
  },
  {
    id: '97000000-0000-4000-8000-0000000000a2',
    kind: 'orientation',
    name: 'Orientation 2026',
    status: 'active',
    startsAt: '2026-08-18T12:00:00.000Z',
    endsAt: '2026-08-24T12:00:00.000Z',
    assets: []
  }
];

const demoCompetitions: CompetitionSummary[] = [
  {
    id: '98000000-0000-4000-8000-0000000000c1',
    name: 'Fall Attendance Cup',
    metric: 'verified_checkins',
    startsOn: '2026-08-24',
    endsOn: '2026-10-24',
    isOpen: true
  }
];

const demoStandings: CompetitionStandings = {
  id: '98000000-0000-4000-8000-0000000000c1',
  name: 'Fall Attendance Cup',
  metric: 'verified_checkins',
  startsOn: '2026-08-24',
  endsOn: '2026-10-24',
  standings: [
    {
      rank: 1,
      organizationId: '60000000-0000-4000-8000-000000000001',
      organizationName: 'Campus Outdoors Club',
      score: 148
    },
    {
      rank: 2,
      organizationId: '60000000-0000-4000-8000-000000000002',
      organizationName: 'Robotics Society',
      score: 121
    },
    {
      rank: 3,
      organizationId: '60000000-0000-4000-8000-000000000003',
      organizationName: 'Film Collective',
      score: 87
    }
  ]
};

const demoGrowthAnalytics: CampusGrowthAnalytics = {
  campusId: demoCampusId,
  range: { start: '2026-07-02', end: '2026-08-01' },
  privacy: { smallCohortsSuppressed: true, minimumCohort: 5 },
  counts: {
    newStudents: 214,
    newStudentsSuppressed: false,
    referralsAttributed: 96,
    referralsQualified: 41,
    activeAmbassadors: 12,
    campaignScans: 246,
    openCompetitions: 1
  },
  referralFunnel: { attributed: 96, qualified: 41, conversion: 0.4271 }
};

export async function fetchCampusCampaigns(
  campusId: string,
  isDemo: boolean
): Promise<GrowthCampaign[]> {
  if (isDemo) return demoCampaigns;
  const { data, error } = await requireSupabase().rpc('get_campus_campaigns', {
    target_campus_id: campusId
  });
  if (error) throw error;
  return campaignsSchema.parse(data);
}

export async function createGrowthCampaign(
  campusId: string,
  kind: GrowthCampaignKind,
  name: string,
  startsAt: string,
  endsAt: string,
  isDemo: boolean
): Promise<string> {
  if (isDemo) return 'demo-campaign-id';
  const { data, error } = await requireSupabase().rpc('create_growth_campaign', {
    target_campus_id: campusId,
    campaign_kind: kind,
    campaign_name: name,
    starts_at: startsAt,
    ends_at: endsAt
  });
  if (error) throw error;
  return z.string().uuid().parse(data);
}

export async function createCampaignAsset(
  campaignId: string,
  kind: CampaignAssetKind,
  label: string,
  deepLink: string,
  isDemo: boolean
): Promise<{ id: string; token: string; deepLink: string }> {
  if (isDemo) {
    return {
      id: 'demo-asset-id',
      token: 'demo0000demo0000demo0000demo0000',
      deepLink
    };
  }
  const { data, error } = await requireSupabase().rpc('create_campaign_asset', {
    target_campaign_id: campaignId,
    asset_kind: kind,
    asset_label: label,
    target_deep_link: deepLink
  });
  if (error) throw error;
  return z
    .object({ id: z.string().uuid(), token: z.string(), deepLink: z.string() })
    .parse(data);
}

export async function fetchCampusCompetitions(
  campusId: string,
  isDemo: boolean
): Promise<CompetitionSummary[]> {
  if (isDemo) return demoCompetitions;
  const { data, error } = await requireSupabase().rpc('get_campus_competitions', {
    target_campus_id: campusId
  });
  if (error) throw error;
  return competitionsSchema.parse(data);
}

export async function fetchCompetitionStandings(
  competitionId: string,
  isDemo: boolean
): Promise<CompetitionStandings> {
  if (isDemo) return demoStandings;
  const { data, error } = await requireSupabase().rpc('get_competition_standings', {
    target_competition_id: competitionId
  });
  if (error) throw error;
  return standingsSchema.parse(data);
}

export async function createOrganizationCompetition(
  campusId: string,
  name: string,
  metric: CompetitionMetric,
  startsOn: string,
  endsOn: string,
  isDemo: boolean
): Promise<string> {
  if (isDemo) return 'demo-competition-id';
  const { data, error } = await requireSupabase().rpc('create_organization_competition', {
    target_campus_id: campusId,
    competition_name: name,
    competition_metric: metric,
    starts_on: startsOn,
    ends_on: endsOn
  });
  if (error) throw error;
  return z.string().uuid().parse(data);
}

export async function fetchCampusGrowthAnalytics(
  campusId: string,
  isDemo: boolean
): Promise<CampusGrowthAnalytics> {
  if (isDemo) return demoGrowthAnalytics;
  const { data, error } = await requireSupabase().rpc('get_campus_growth_analytics', {
    target_campus_id: campusId
  });
  if (error) throw error;
  return growthAnalyticsSchema.parse(data);
}

export { campaignsSchema, standingsSchema, growthAnalyticsSchema };
