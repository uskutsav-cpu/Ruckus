import type { OrganizationRole } from '@/types/database';

export type OrganizationMembershipStatus = 'invited' | 'active' | 'removed';

export type MyOrganization = {
  id: string;
  slug: string;
  name: string;
  description: string;
  campusId: string;
  campusName: string;
  logoPath: string | null;
  bannerPath: string | null;
  websiteUrl: string | null;
  isVerified: boolean;
  isRestricted: boolean;
  role: OrganizationRole;
  membershipStatus: OrganizationMembershipStatus;
};

export type OrganizationMember = {
  id: string;
  profileId: string;
  displayName: string;
  username: string | null;
  role: OrganizationRole;
  status: OrganizationMembershipStatus;
  invitedAt: string;
  acceptedAt: string | null;
};

export type OrganizationEvent = {
  id: string;
  title: string;
  startsAt: string;
  status: string;
  capacity: number;
  confirmedCount: number;
};

export type OrganizationDashboard = {
  organization: Omit<MyOrganization, 'role' | 'membershipStatus'> & {
    contactEmail: string | null;
    socialLinks: Record<string, unknown>;
  };
  membership: {
    role: OrganizationRole;
    status: OrganizationMembershipStatus;
  } | null;
  members: OrganizationMember[];
  events: OrganizationEvent[];
  verificationRequests: {
    id: string;
    requestKind: 'verification' | 'claim';
    status: 'submitted' | 'under_review' | 'approved' | 'rejected';
    createdAt: string;
    reviewedAt: string | null;
    reviewNotes: string | null;
  }[];
};

export type CreateOrganizationInput = {
  name: string;
  description: string;
  contactEmail: string;
  websiteUrl: string;
};
