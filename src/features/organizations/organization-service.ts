import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import type {
  CreateOrganizationInput,
  MyOrganization,
  OrganizationDashboard
} from '@/features/organizations/organization-types';
import { requireSupabase } from '@/lib/supabase';
import type { OrganizationRole } from '@/types/database';

const roleSchema = z.enum(['owner', 'admin', 'event_manager', 'moderator', 'viewer']);
const membershipStatusSchema = z.enum(['invited', 'active', 'removed']);
const organizationSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  campusId: z.string().uuid(),
  campusName: z.string(),
  logoPath: z.string().nullable(),
  bannerPath: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  isVerified: z.boolean(),
  isRestricted: z.boolean()
});
const myOrganizationSchema = organizationSchema.extend({
  role: roleSchema,
  membershipStatus: membershipStatusSchema
});
const dashboardSchema = z.object({
  organization: organizationSchema.extend({
    contactEmail: z.string().nullable(),
    socialLinks: z.record(z.string(), z.unknown())
  }),
  membership: z.object({ role: roleSchema, status: membershipStatusSchema }).nullable(),
  members: z.array(
    z.object({
      id: z.string().uuid(),
      profileId: z.string().uuid(),
      displayName: z.string(),
      username: z.string().nullable(),
      role: roleSchema,
      status: membershipStatusSchema,
      invitedAt: z.string(),
      acceptedAt: z.string().nullable()
    })
  ),
  events: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      startsAt: z.string(),
      status: z.string(),
      capacity: z.number().int(),
      confirmedCount: z.number().int()
    })
  ),
  verificationRequests: z.array(
    z.object({
      id: z.string().uuid(),
      requestKind: z.enum(['verification', 'claim']),
      status: z.enum(['submitted', 'under_review', 'approved', 'rejected']),
      createdAt: z.string(),
      reviewedAt: z.string().nullable(),
      reviewNotes: z.string().nullable()
    })
  )
});

const demoOrganization: MyOrganization = {
  id: '60000000-0000-4000-8000-000000000001',
  slug: 'campus-outdoors-club',
  name: 'Campus Outdoors Club',
  description: 'A demo organization for previewing organizer tools.',
  campusId: '00000000-0000-4000-8000-000000000001',
  campusName: 'Demo University',
  logoPath: null,
  bannerPath: null,
  websiteUrl: null,
  isVerified: false,
  isRestricted: false,
  role: 'owner',
  membershipStatus: 'active'
};

export async function fetchMyOrganizations(isDemo: boolean): Promise<MyOrganization[]> {
  if (isDemo) return [demoOrganization];
  const { data, error } = await requireSupabase().rpc('get_my_organizations');
  if (error) throw error;
  return z.array(myOrganizationSchema).parse(data) as MyOrganization[];
}

export async function fetchOrganizationDashboard(
  organizationId: string,
  isDemo: boolean
): Promise<OrganizationDashboard> {
  if (isDemo) {
    return {
      organization: {
        ...demoOrganization,
        contactEmail: null,
        socialLinks: {}
      },
      membership: { role: 'owner', status: 'active' },
      members: [
        {
          id: Crypto.randomUUID(),
          profileId: '10000000-0000-4000-8000-000000000001',
          displayName: 'Maya',
          username: 'maya_demo',
          role: 'owner',
          status: 'active',
          invitedAt: new Date().toISOString(),
          acceptedAt: new Date().toISOString()
        }
      ],
      events: [],
      verificationRequests: []
    };
  }
  const { data, error } = await requireSupabase().rpc('get_organization_dashboard', {
    target_organization_id: organizationId
  });
  if (error) throw error;
  return dashboardSchema.parse(data) as OrganizationDashboard;
}

export async function createOrganization(
  input: CreateOrganizationInput,
  actor: { id: string; campusId: string },
  isDemo: boolean
): Promise<string> {
  if (isDemo) return demoOrganization.id;
  const id = Crypto.randomUUID();
  const slugBase = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  const { error } = await requireSupabase()
    .from('organizations')
    .insert({
      id,
      campus_id: actor.campusId,
      created_by: actor.id,
      slug: `${slugBase}-${id.slice(0, 8)}`,
      name: input.name.trim(),
      description: input.description.trim(),
      contact_email: input.contactEmail.trim().toLowerCase(),
      website_url: input.websiteUrl.trim() || null
    });
  if (error) throw error;
  return id;
}

export async function respondToInvitation(
  organizationId: string,
  accept: boolean,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc('respond_to_organization_invitation', {
    target_organization_id: organizationId,
    accept_invitation: accept
  });
  if (error) throw error;
}

export async function inviteOrganizationMember(
  organizationId: string,
  username: string,
  role: Exclude<OrganizationRole, 'owner'>,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc('invite_organization_member', {
    target_organization_id: organizationId,
    target_username: username,
    target_role: role
  });
  if (error) throw error;
}

export async function changeOrganizationMemberRole(
  organizationId: string,
  profileId: string,
  role: Exclude<OrganizationRole, 'owner'>,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc('change_organization_member_role', {
    target_organization_id: organizationId,
    target_profile_id: profileId,
    target_role: role
  });
  if (error) throw error;
}

export async function removeOrganizationMember(
  organizationId: string,
  profileId: string,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc('remove_organization_member', {
    target_organization_id: organizationId,
    target_profile_id: profileId
  });
  if (error) throw error;
}

export async function submitOrganizationVerification(
  organizationId: string,
  requestKind: 'verification' | 'claim',
  relationship: string,
  contact: string,
  isDemo: boolean
): Promise<void> {
  if (isDemo) return;
  const { error } = await requireSupabase().rpc('submit_organization_verification', {
    target_organization_id: organizationId,
    request_kind: requestKind,
    evidence: { relationship: relationship.trim(), contact: contact.trim() }
  });
  if (error) throw error;
}
