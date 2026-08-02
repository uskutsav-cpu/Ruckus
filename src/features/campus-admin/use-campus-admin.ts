import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  approveAnnouncement,
  createAnnouncement,
  exportCampusAggregateCsv,
  fetchCampusAdminAccess,
  fetchCampusAnnouncements,
  fetchCampusAuditLog,
  fetchCampusOverview,
  fetchPublishedAnnouncements,
  fetchSafetyEscalations,
  fetchVerificationQueue,
  resolveSafetyEscalation,
  reviewVerificationRequest,
  revokeOrganizationVerification,
  submitAnnouncementForApproval
} from '@/features/campus-admin/campus-admin-service';
import type { CampusAnnouncementAudience } from '@/features/campus-admin/campus-admin-types';
import { useAuth } from '@/providers/auth-provider';

export function useCampusAdminAccess() {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['campus-admin-access', isDemo],
    queryFn: () => fetchCampusAdminAccess(isDemo),
    staleTime: 300_000
  });
}

export function useCampusOverview(campusId: string | null) {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['campus-admin-overview', campusId, isDemo],
    queryFn: () => fetchCampusOverview(campusId as string, isDemo),
    enabled: Boolean(campusId),
    staleTime: 60_000
  });
}

export function useCampusVerificationQueue(campusId: string | null, enabled: boolean) {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['campus-verification-queue', campusId, isDemo],
    queryFn: () => fetchVerificationQueue(campusId as string, isDemo),
    enabled: Boolean(campusId) && enabled,
    staleTime: 30_000
  });
}

export function useReviewVerification(campusId: string | null) {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { requestId: string; approve: boolean; notes: string }) =>
      reviewVerificationRequest(input.requestId, input.approve, input.notes, isDemo),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['campus-verification-queue', campusId]
      });
      void queryClient.invalidateQueries({
        queryKey: ['campus-admin-overview', campusId]
      });
      void queryClient.invalidateQueries({ queryKey: ['campus-audit-log', campusId] });
    }
  });
}

export function useRevokeVerification(campusId: string | null) {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { organizationId: string; reason: string }) =>
      revokeOrganizationVerification(input.organizationId, input.reason, isDemo),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['campus-verification-queue', campusId]
      });
      void queryClient.invalidateQueries({ queryKey: ['campus-audit-log', campusId] });
    }
  });
}

export function useCampusAnnouncements(campusId: string | null, enabled: boolean) {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['campus-announcements', campusId, isDemo],
    queryFn: () => fetchCampusAnnouncements(campusId as string, isDemo),
    enabled: Boolean(campusId) && enabled,
    staleTime: 30_000
  });
}

export function usePublishedAnnouncements() {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['published-announcements', isDemo],
    queryFn: () => fetchPublishedAnnouncements(isDemo),
    staleTime: 120_000
  });
}

export function useCreateAnnouncement(campusId: string | null) {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      title: string;
      body: string;
      audience: CampusAnnouncementAudience;
    }) =>
      createAnnouncement(
        campusId as string,
        input.title,
        input.body,
        input.audience,
        isDemo
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['campus-announcements', campusId]
      });
    }
  });
}

export function useSubmitAnnouncement(campusId: string | null) {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (announcementId: string) =>
      submitAnnouncementForApproval(announcementId, isDemo),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['campus-announcements', campusId]
      });
    }
  });
}

export function useApproveAnnouncement(campusId: string | null) {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      announcementId: string;
      publishAt: string;
      expireAt: string;
      approve: boolean;
    }) =>
      approveAnnouncement(
        input.announcementId,
        input.publishAt,
        input.expireAt,
        input.approve,
        isDemo
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['campus-announcements', campusId]
      });
      void queryClient.invalidateQueries({ queryKey: ['campus-audit-log', campusId] });
    }
  });
}

export function useCampusAuditLog(campusId: string | null, enabled: boolean) {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['campus-audit-log', campusId, isDemo],
    queryFn: () => fetchCampusAuditLog(campusId as string, isDemo),
    enabled: Boolean(campusId) && enabled,
    staleTime: 30_000
  });
}

export function useCampusSafetyEscalations(campusId: string | null, enabled: boolean) {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['campus-safety-escalations', campusId, isDemo],
    queryFn: () => fetchSafetyEscalations(campusId as string, isDemo),
    enabled: Boolean(campusId) && enabled,
    staleTime: 30_000
  });
}

export function useResolveEscalation(campusId: string | null) {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { escalationId: string; note: string }) =>
      resolveSafetyEscalation(input.escalationId, input.note, isDemo),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['campus-safety-escalations', campusId]
      });
      void queryClient.invalidateQueries({
        queryKey: ['campus-admin-overview', campusId]
      });
    }
  });
}

export function useCampusAggregateExport(campusId: string | null) {
  const { isDemo } = useAuth();
  return useMutation({
    mutationFn: (input: { rangeStart: string; rangeEnd: string }) =>
      exportCampusAggregateCsv(
        campusId as string,
        input.rangeStart,
        input.rangeEnd,
        isDemo
      )
  });
}
