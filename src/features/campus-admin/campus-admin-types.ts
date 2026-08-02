import type { Database } from '@/types/database.generated';

export type CampusAdminRole = Database['public']['Enums']['campus_admin_role'];
export type CampusAnnouncementStatus =
  Database['public']['Enums']['campus_announcement_status'];
export type CampusAnnouncementAudience =
  Database['public']['Enums']['campus_announcement_audience'];

export type CampusAdminAssignment = {
  campusId: string;
  campusName: string;
  role: CampusAdminRole;
};

export type CampusAdminAccess = {
  platformAdministrator: boolean;
  campuses: CampusAdminAssignment[];
};

/**
 * Cohort counts small enough to identify an individual are withheld by the
 * database rather than rounded, so a suppressed metric arrives as null.
 */
export type CampusAdminOverview = {
  campusId: string;
  range: { start: string; end: string };
  privacyThreshold: number;
  counts: {
    activeUsers: number | null;
    activeUsersSuppressed: boolean;
    activeOrganizations: number;
    upcomingEvents: number;
    rsvps: number;
    attendance: number;
    verificationQueue: number;
    openModeration: number;
    safetyEscalations: number;
    noShows: number;
    checkins: number;
    repeatAttendance: number;
  };
  reportTrends: { date: string; count: number | null; suppressed: boolean }[];
  privacy: { smallCohortsSuppressed: boolean; minimumCohort: number };
};

export type CampusVerificationRequest = {
  id: string;
  organizationId: string;
  organizationName: string;
  requestKind: string;
  evidence: Record<string, unknown>;
  status: string;
  submittedAt: string;
};

export type CampusAnnouncement = {
  id: string;
  title: string;
  body: string;
  audience: CampusAnnouncementAudience;
  status: CampusAnnouncementStatus;
  deepLink: string | null;
  authorId: string;
  approvedBy: string | null;
  scheduledFor: string | null;
  expiresAt: string | null;
  publishedAt: string | null;
  createdAt: string;
};

export type PublishedAnnouncement = {
  id: string;
  title: string;
  body: string;
  audience: CampusAnnouncementAudience;
  deepLink: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
};

export type CampusAuditEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
};

export type CampusSafetyEscalation = {
  id: string;
  moderationCaseId: string;
  reason: string;
  resolvedAt: string | null;
  createdAt: string;
};

/** Roles permitted to act on each campus administration surface. */
export const campusAdminCapabilities = {
  overview: [
    'viewer',
    'analyst',
    'organization_verifier',
    'moderator',
    'announcement_manager',
    'administrator'
  ],
  verification: ['organization_verifier', 'administrator'],
  announcements: ['announcement_manager', 'administrator'],
  moderation: ['moderator', 'administrator'],
  audit: ['viewer', 'analyst', 'administrator'],
  export: ['analyst', 'administrator']
} as const satisfies Record<string, readonly CampusAdminRole[]>;

export type CampusAdminCapability = keyof typeof campusAdminCapabilities;

export function hasCampusCapability(
  access: CampusAdminAccess | undefined,
  campusId: string | null,
  capability: CampusAdminCapability
): boolean {
  if (!access) return false;
  if (access.platformAdministrator) return true;
  const allowed = campusAdminCapabilities[capability] as readonly CampusAdminRole[];
  return access.campuses.some(
    (assignment) =>
      (campusId === null || assignment.campusId === campusId) &&
      allowed.includes(assignment.role)
  );
}
