import { z } from 'zod';

import type {
  CampusAdminAccess,
  CampusAdminOverview,
  CampusAnnouncement,
  CampusAnnouncementAudience,
  CampusAuditEntry,
  CampusSafetyEscalation,
  CampusVerificationRequest,
  PublishedAnnouncement
} from '@/features/campus-admin/campus-admin-types';
import { requireSupabase } from '@/lib/supabase';

const nonnegativeInteger = z.coerce.number().int().nonnegative();
const campusAdminRole = z.enum([
  'viewer',
  'analyst',
  'organization_verifier',
  'moderator',
  'announcement_manager',
  'administrator'
]);
const announcementAudience = z.enum(['all', 'students', 'organizers']);
const announcementStatus = z.enum([
  'draft',
  'pending_approval',
  'approved',
  'scheduled',
  'published',
  'expired',
  'rejected',
  'cancelled'
]);

const accessSchema = z.object({
  platformAdministrator: z.boolean(),
  campuses: z.array(
    z.object({
      campusId: z.string().uuid(),
      campusName: z.string().min(1),
      role: campusAdminRole
    })
  )
});

const overviewSchema = z.object({
  campusId: z.string().uuid(),
  range: z.object({ start: z.string(), end: z.string() }),
  privacyThreshold: z.coerce.number().int().positive(),
  counts: z.object({
    activeUsers: nonnegativeInteger.nullable(),
    activeUsersSuppressed: z.boolean(),
    activeOrganizations: nonnegativeInteger,
    upcomingEvents: nonnegativeInteger,
    rsvps: nonnegativeInteger,
    attendance: nonnegativeInteger,
    verificationQueue: nonnegativeInteger,
    openModeration: nonnegativeInteger,
    safetyEscalations: nonnegativeInteger,
    noShows: nonnegativeInteger,
    checkins: nonnegativeInteger,
    repeatAttendance: nonnegativeInteger
  }),
  reportTrends: z.array(
    z.object({
      date: z.string(),
      count: nonnegativeInteger.nullable(),
      suppressed: z.boolean()
    })
  ),
  privacy: z.object({
    smallCohortsSuppressed: z.boolean(),
    minimumCohort: z.coerce.number().int().positive()
  })
});

const verificationQueueSchema = z.array(
  z.object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    organizationName: z.string(),
    requestKind: z.string(),
    evidence: z.record(z.string(), z.unknown()),
    status: z.string(),
    submittedAt: z.string()
  })
);

const announcementSchema = z.array(
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    body: z.string(),
    audience: announcementAudience,
    status: announcementStatus,
    deepLink: z.string().nullable(),
    authorId: z.string().uuid(),
    approvedBy: z.string().uuid().nullable(),
    scheduledFor: z.string().nullable(),
    expiresAt: z.string().nullable(),
    publishedAt: z.string().nullable(),
    createdAt: z.string()
  })
);

const publishedAnnouncementSchema = z.array(
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    body: z.string(),
    audience: announcementAudience,
    deepLink: z.string().nullable(),
    publishedAt: z.string().nullable(),
    expiresAt: z.string().nullable()
  })
);

const auditSchema = z.array(
  z.object({
    id: z.string().uuid(),
    action: z.string(),
    targetType: z.string(),
    targetId: z.string().uuid().nullable(),
    createdAt: z.string()
  })
);

const escalationSchema = z.array(
  z.object({
    id: z.string().uuid(),
    moderationCaseId: z.string().uuid(),
    reason: z.string(),
    resolvedAt: z.string().nullable(),
    createdAt: z.string()
  })
);

const demoCampusId = '00000000-0000-4000-8000-000000000001';

const demoAccess: CampusAdminAccess = {
  platformAdministrator: false,
  campuses: [
    { campusId: demoCampusId, campusName: 'Demo State University', role: 'administrator' }
  ]
};

const demoOverview: CampusAdminOverview = {
  campusId: demoCampusId,
  range: { start: '2026-07-02', end: '2026-08-01' },
  privacyThreshold: 5,
  counts: {
    activeUsers: 412,
    activeUsersSuppressed: false,
    activeOrganizations: 24,
    upcomingEvents: 18,
    rsvps: 963,
    attendance: 704,
    verificationQueue: 3,
    openModeration: 2,
    safetyEscalations: 1,
    noShows: 88,
    checkins: 704,
    repeatAttendance: 231
  },
  reportTrends: [
    { date: '2026-07-28', count: 6, suppressed: false },
    { date: '2026-07-30', count: null, suppressed: true }
  ],
  privacy: { smallCohortsSuppressed: true, minimumCohort: 5 }
};

const demoQueue: CampusVerificationRequest[] = [
  {
    id: '90000000-0000-4000-8000-0000000000a1',
    organizationId: '60000000-0000-4000-8000-000000000001',
    organizationName: 'Campus Outdoors Club',
    requestKind: 'verification',
    evidence: { officerEmail: 'officer@demo.edu' },
    status: 'submitted',
    submittedAt: '2026-07-30T15:00:00.000Z'
  }
];

const demoAnnouncements: CampusAnnouncement[] = [
  {
    id: '91000000-0000-4000-8000-0000000000b1',
    title: 'Welcome week hours',
    body: 'The student union extends its hours during welcome week.',
    audience: 'students',
    status: 'published',
    deepLink: null,
    authorId: '10000000-0000-4000-8000-000000000003',
    approvedBy: '10000000-0000-4000-8000-000000000004',
    scheduledFor: '2026-08-01T12:00:00.000Z',
    expiresAt: '2026-08-08T12:00:00.000Z',
    publishedAt: '2026-08-01T12:00:00.000Z',
    createdAt: '2026-07-31T09:00:00.000Z'
  }
];

const demoAudit: CampusAuditEntry[] = [
  {
    id: '92000000-0000-4000-8000-0000000000c1',
    action: 'organization_verified',
    targetType: 'organization',
    targetId: '60000000-0000-4000-8000-000000000001',
    createdAt: '2026-08-01T10:30:00.000Z'
  }
];

const demoEscalations: CampusSafetyEscalation[] = [
  {
    id: '93000000-0000-4000-8000-0000000000d1',
    moderationCaseId: '94000000-0000-4000-8000-0000000000e1',
    reason: 'Repeated safety reports at a recurring off-campus event.',
    resolvedAt: null,
    createdAt: '2026-07-29T18:20:00.000Z'
  }
];

export async function fetchCampusAdminAccess(
  isDemo: boolean
): Promise<CampusAdminAccess> {
  if (isDemo) return demoAccess;
  const { data, error } = await requireSupabase().rpc('get_my_campus_admin_access');
  if (error) throw error;
  return accessSchema.parse(data);
}

export async function fetchCampusOverview(
  campusId: string,
  isDemo: boolean
): Promise<CampusAdminOverview> {
  if (isDemo) return { ...demoOverview, campusId };
  const { data, error } = await requireSupabase().rpc('get_campus_admin_overview', {
    target_campus_id: campusId
  });
  if (error) throw error;
  return overviewSchema.parse(data);
}

export async function fetchVerificationQueue(
  campusId: string,
  isDemo: boolean
): Promise<CampusVerificationRequest[]> {
  if (isDemo) return demoQueue;
  const { data, error } = await requireSupabase().rpc('get_campus_verification_queue', {
    target_campus_id: campusId
  });
  if (error) throw error;
  return verificationQueueSchema.parse(data) as CampusVerificationRequest[];
}

export async function reviewVerificationRequest(
  requestId: string,
  approve: boolean,
  notes: string,
  isDemo: boolean
): Promise<string> {
  if (isDemo) return approve ? 'approved' : 'rejected';
  const { data, error } = await requireSupabase().rpc(
    'review_campus_organization_verification',
    { target_request_id: requestId, approve, reviewer_notes: notes }
  );
  if (error) throw error;
  return z.string().parse(data);
}

export async function revokeOrganizationVerification(
  organizationId: string,
  reason: string,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc(
    'revoke_campus_organization_verification',
    {
      target_organization_id: organizationId,
      revocation_reason: reason
    }
  );
  if (error) throw error;
}

export async function fetchCampusAnnouncements(
  campusId: string,
  isDemo: boolean
): Promise<CampusAnnouncement[]> {
  if (isDemo) return demoAnnouncements;
  const { data, error } = await requireSupabase().rpc('list_campus_announcements', {
    target_campus_id: campusId,
    page_size: 50
  });
  if (error) throw error;
  return announcementSchema.parse(data);
}

export async function fetchPublishedAnnouncements(
  isDemo: boolean
): Promise<PublishedAnnouncement[]> {
  if (isDemo) {
    return demoAnnouncements.map(
      ({ id, title, body, audience, deepLink, publishedAt, expiresAt }) => ({
        id,
        title,
        body,
        audience,
        deepLink,
        publishedAt,
        expiresAt
      })
    );
  }
  const { data, error } = await requireSupabase().rpc('get_campus_announcements');
  if (error) throw error;
  return publishedAnnouncementSchema.parse(data);
}

export async function createAnnouncement(
  campusId: string,
  title: string,
  body: string,
  audience: CampusAnnouncementAudience,
  isDemo: boolean
): Promise<string> {
  if (isDemo) return 'demo-announcement-id';
  const { data, error } = await requireSupabase().rpc('create_campus_announcement', {
    target_campus_id: campusId,
    announcement_title: title,
    announcement_body: body,
    target_audience: audience
  });
  if (error) throw error;
  return z.string().uuid().parse(data);
}

export async function submitAnnouncementForApproval(
  announcementId: string,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc(
    'submit_campus_announcement_for_approval',
    {
      target_announcement_id: announcementId
    }
  );
  if (error) throw error;
}

export async function approveAnnouncement(
  announcementId: string,
  publishAt: string,
  expireAt: string,
  approve: boolean,
  isDemo: boolean
): Promise<string> {
  if (isDemo) return approve ? 'scheduled' : 'rejected';
  const { data, error } = await requireSupabase().rpc('approve_campus_announcement', {
    target_announcement_id: announcementId,
    publish_at: publishAt,
    expire_at: expireAt,
    approve
  });
  if (error) throw error;
  return z.string().parse(data);
}

export async function fetchCampusAuditLog(
  campusId: string,
  isDemo: boolean
): Promise<CampusAuditEntry[]> {
  if (isDemo) return demoAudit;
  const { data, error } = await requireSupabase().rpc('get_campus_admin_audit_log', {
    target_campus_id: campusId,
    page_size: 50
  });
  if (error) throw error;
  return auditSchema.parse(data);
}

export async function fetchSafetyEscalations(
  campusId: string,
  isDemo: boolean
): Promise<CampusSafetyEscalation[]> {
  if (isDemo) return demoEscalations;
  const { data, error } = await requireSupabase().rpc('get_campus_safety_escalations', {
    target_campus_id: campusId
  });
  if (error) throw error;
  return escalationSchema.parse(data);
}

export async function resolveSafetyEscalation(
  escalationId: string,
  note: string,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc('resolve_campus_safety_escalation', {
    target_escalation_id: escalationId,
    resolution_note: note
  });
  if (error) throw error;
}

export async function exportCampusAggregateCsv(
  campusId: string,
  rangeStart: string,
  rangeEnd: string,
  isDemo: boolean
): Promise<string> {
  if (isDemo) {
    return 'date,events,impressions,rsvps,checkins,no_shows,repeat_attendees\n2026-08-01,18,4210,963,704,88,231';
  }
  const { data, error } = await requireSupabase().rpc('export_campus_aggregate_csv', {
    target_campus_id: campusId,
    range_start: rangeStart,
    range_end: rangeEnd
  });
  if (error) throw error;
  return z.string().parse(data);
}

export { accessSchema, overviewSchema };
