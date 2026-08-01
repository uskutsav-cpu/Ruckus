import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  applyModerationAction,
  fetchModerationQueue,
  updateModerationCase
} from '@/features/moderation/moderation-service';
import type {
  ModerationActionInput,
  ModerationFilters
} from '@/features/moderation/moderation-types';
import { useAuth } from '@/providers/auth-provider';
import type { ModerationCaseStatus } from '@/types/database';

export function useModerationQueue(filters: ModerationFilters) {
  const { isDemo, profile, user } = useAuth();
  return useQuery({
    queryKey: ['moderation-queue', filters, isDemo],
    queryFn: () => fetchModerationQueue(filters, isDemo),
    enabled: Boolean(user && profile?.role === 'admin')
  });
}

function useInvalidateModeration() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['moderation-queue'] });
}

export function useUpdateModerationCase() {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateModeration();
  return useMutation({
    mutationFn: (input: {
      caseId: string;
      status: ModerationCaseStatus;
      severity: number;
      notes: string;
    }) => updateModerationCase(input, isDemo),
    onSuccess: invalidate
  });
}

export function useApplyModerationAction() {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateModeration();
  return useMutation({
    mutationFn: (input: ModerationActionInput) => applyModerationAction(input, isDemo),
    onSuccess: invalidate
  });
}
