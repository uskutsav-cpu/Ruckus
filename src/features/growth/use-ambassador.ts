import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  applyForAmbassadorProgram,
  fetchAmbassadorApplications,
  fetchAmbassadorDashboard,
  fetchSemesterLeaderboard,
  retireAmbassador,
  reviewAmbassadorApplication
} from '@/features/growth/ambassador-service';
import { useAuth } from '@/providers/auth-provider';

export function useAmbassadorDashboard() {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['ambassador-dashboard', isDemo],
    queryFn: () => fetchAmbassadorDashboard(isDemo),
    staleTime: 60_000
  });
}

export function useApplyForAmbassadorProgram() {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (motivation: string) => applyForAmbassadorProgram(motivation, isDemo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ambassador-dashboard'] });
    }
  });
}

export function useAmbassadorApplications(campusId: string | null, enabled: boolean) {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['ambassador-applications', campusId, isDemo],
    queryFn: () => fetchAmbassadorApplications(campusId as string, isDemo),
    enabled: Boolean(campusId) && enabled,
    staleTime: 30_000
  });
}

export function useReviewAmbassadorApplication(campusId: string | null) {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { applicationId: string; approve: boolean; notes: string }) =>
      reviewAmbassadorApplication(
        input.applicationId,
        input.approve,
        input.notes,
        isDemo
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['ambassador-applications', campusId]
      });
      void queryClient.invalidateQueries({ queryKey: ['campus-audit-log', campusId] });
    }
  });
}

export function useRetireAmbassador(campusId: string | null) {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { ambassadorId: string; reason: string }) =>
      retireAmbassador(input.ambassadorId, input.reason, isDemo),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['ambassador-applications', campusId]
      });
    }
  });
}

export function useSemesterLeaderboard() {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['semester-leaderboard', isDemo],
    queryFn: () => fetchSemesterLeaderboard(isDemo),
    staleTime: 60_000
  });
}
