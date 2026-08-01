import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  changeOrganizationMemberRole,
  createOrganization,
  fetchMyOrganizations,
  fetchOrganizationDashboard,
  inviteOrganizationMember,
  removeOrganizationMember,
  respondToInvitation,
  submitOrganizationVerification
} from '@/features/organizations/organization-service';
import type { CreateOrganizationInput } from '@/features/organizations/organization-types';
import { useAuth } from '@/providers/auth-provider';
import type { OrganizationRole } from '@/types/database';

export function useMyOrganizations() {
  const { isDemo, user } = useAuth();
  return useQuery({
    queryKey: ['my-organizations', user?.id, isDemo],
    queryFn: () => fetchMyOrganizations(isDemo),
    enabled: Boolean(user)
  });
}

export function useOrganizationDashboard(organizationId: string) {
  const { isDemo, user } = useAuth();
  return useQuery({
    queryKey: ['organization-dashboard', organizationId, user?.id, isDemo],
    queryFn: () => fetchOrganizationDashboard(organizationId, isDemo),
    enabled: Boolean(user && organizationId)
  });
}

function useInvalidateOrganization(organizationId?: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-organizations'] }),
      ...(organizationId
        ? [
            queryClient.invalidateQueries({
              queryKey: ['organization-dashboard', organizationId]
            })
          ]
        : [])
    ]);
  };
}

export function useCreateOrganization() {
  const { isDemo, profile, user } = useAuth();
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: (input: CreateOrganizationInput) => {
      if (!user || !profile) throw new Error('AUTHENTICATION_REQUIRED');
      return createOrganization(
        input,
        { id: user.id, campusId: profile.campus_id },
        isDemo
      );
    },
    onSuccess: invalidate
  });
}

export function useRespondToOrganizationInvitation(organizationId: string) {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateOrganization(organizationId);
  return useMutation({
    mutationFn: (accept: boolean) => respondToInvitation(organizationId, accept, isDemo),
    onSuccess: invalidate
  });
}

export function useInviteOrganizationMember(organizationId: string) {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateOrganization(organizationId);
  return useMutation({
    mutationFn: (input: { username: string; role: Exclude<OrganizationRole, 'owner'> }) =>
      inviteOrganizationMember(organizationId, input.username, input.role, isDemo),
    onSuccess: invalidate
  });
}

export function useChangeOrganizationMemberRole(organizationId: string) {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateOrganization(organizationId);
  return useMutation({
    mutationFn: (input: {
      profileId: string;
      role: Exclude<OrganizationRole, 'owner'>;
    }) =>
      changeOrganizationMemberRole(organizationId, input.profileId, input.role, isDemo),
    onSuccess: invalidate
  });
}

export function useRemoveOrganizationMember(organizationId: string) {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateOrganization(organizationId);
  return useMutation({
    mutationFn: (profileId: string) =>
      removeOrganizationMember(organizationId, profileId, isDemo),
    onSuccess: invalidate
  });
}

export function useSubmitOrganizationVerification(organizationId: string) {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateOrganization(organizationId);
  return useMutation({
    mutationFn: (input: {
      requestKind: 'verification' | 'claim';
      relationship: string;
      contact: string;
    }) =>
      submitOrganizationVerification(
        organizationId,
        input.requestKind,
        input.relationship,
        input.contact,
        isDemo
      ),
    onSuccess: invalidate
  });
}
