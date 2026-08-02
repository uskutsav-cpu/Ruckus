import { z } from 'zod';

import type {
  AmbassadorApplication,
  AmbassadorDashboard,
  SemesterLeaderboard
} from '@/features/growth/ambassador-types';
import { requireSupabase } from '@/lib/supabase';

const nonnegativeInteger = z.coerce.number().int().nonnegative();
const ambassadorTier = z.enum(['rookie', 'builder', 'leader']);
const ambassadorStatus = z.enum(['active', 'paused', 'retired']);
const applicationStatus = z.enum([
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'withdrawn'
]);

const dashboardSchema = z.union([
  z.object({ isAmbassador: z.literal(false) }),
  z.object({
    isAmbassador: z.literal(true),
    status: ambassadorStatus,
    tier: ambassadorTier,
    activatedAt: z.string(),
    referralCode: z.string().nullable(),
    counts: z.object({
      attributed: nonnegativeInteger,
      qualified: nonnegativeInteger
    }),
    nextTier: z
      .object({ tier: ambassadorTier, qualifiedNeeded: nonnegativeInteger })
      .nullable(),
    privacy: z.string()
  })
]);

const applicationsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    profileId: z.string().uuid(),
    displayName: z.string().nullable(),
    motivation: z.string(),
    status: applicationStatus,
    createdAt: z.string()
  })
);

const leaderboardSchema = z.object({
  semester: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      startsOn: z.string(),
      endsOn: z.string()
    })
    .nullable(),
  entries: z.array(
    z.object({
      rank: z.coerce.number().int().positive(),
      profileId: z.string().uuid(),
      displayName: z.string().nullable(),
      avatarPath: z.string().nullable(),
      xpTotal: nonnegativeInteger
    })
  ),
  viewer: z
    .object({ xpTotal: nonnegativeInteger, rank: z.coerce.number().int().positive() })
    .nullable()
});

const demoDashboard: AmbassadorDashboard = {
  isAmbassador: true,
  status: 'active',
  tier: 'builder',
  activatedAt: '2026-06-14T12:00:00.000Z',
  referralCode: 'RUCKUS7Q2A',
  counts: { attributed: 14, qualified: 9 },
  nextTier: { tier: 'leader', qualifiedNeeded: 11 },
  privacy: 'Referral counts are aggregate. Ambassadors never see who used their code.'
};

const demoLeaderboard: SemesterLeaderboard = {
  semester: {
    id: '95000000-0000-4000-8000-0000000000f1',
    name: 'Fall 2026',
    startsOn: '2026-08-24',
    endsOn: '2026-12-18'
  },
  entries: [
    {
      rank: 1,
      profileId: '10000000-0000-4000-8000-000000000002',
      displayName: 'Priya',
      avatarPath: null,
      xpTotal: 420
    },
    {
      rank: 2,
      profileId: '10000000-0000-4000-8000-000000000003',
      displayName: 'Marcus',
      avatarPath: null,
      xpTotal: 365
    }
  ],
  viewer: { xpTotal: 180, rank: 7 }
};

export async function fetchAmbassadorDashboard(
  isDemo: boolean
): Promise<AmbassadorDashboard> {
  if (isDemo) return demoDashboard;
  const { data, error } = await requireSupabase().rpc('get_my_ambassador_dashboard');
  if (error) throw error;
  return dashboardSchema.parse(data) as AmbassadorDashboard;
}

export async function applyForAmbassadorProgram(
  motivation: string,
  isDemo: boolean
): Promise<string> {
  if (isDemo) return 'demo-application-id';
  const { data, error } = await requireSupabase().rpc('apply_for_ambassador_program', {
    application_motivation: motivation
  });
  if (error) throw error;
  return z.string().uuid().parse(data);
}

export async function fetchAmbassadorApplications(
  campusId: string,
  isDemo: boolean
): Promise<AmbassadorApplication[]> {
  if (isDemo) {
    return [
      {
        id: '96000000-0000-4000-8000-0000000000a1',
        profileId: '10000000-0000-4000-8000-000000000005',
        displayName: 'Jordan',
        motivation:
          'I run the outdoors club and want to help more first-year students find events on campus.',
        status: 'submitted',
        createdAt: '2026-07-28T14:00:00.000Z'
      }
    ];
  }
  const { data, error } = await requireSupabase().rpc(
    'get_campus_ambassador_applications',
    { target_campus_id: campusId }
  );
  if (error) throw error;
  return applicationsSchema.parse(data);
}

export async function reviewAmbassadorApplication(
  applicationId: string,
  approve: boolean,
  notes: string,
  isDemo: boolean
): Promise<string> {
  if (isDemo) return approve ? 'approved' : 'rejected';
  const { data, error } = await requireSupabase().rpc('review_ambassador_application', {
    target_application_id: applicationId,
    approve,
    notes
  });
  if (error) throw error;
  return z.string().parse(data);
}

export async function retireAmbassador(
  ambassadorId: string,
  reason: string,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc('retire_ambassador', {
    target_ambassador_id: ambassadorId,
    reason
  });
  if (error) throw error;
}

export async function fetchSemesterLeaderboard(
  isDemo: boolean
): Promise<SemesterLeaderboard> {
  if (isDemo) return demoLeaderboard;
  const { data, error } = await requireSupabase().rpc('get_semester_leaderboard', {
    page_size: 25
  });
  if (error) throw error;
  return leaderboardSchema.parse(data);
}

export { dashboardSchema, leaderboardSchema };
