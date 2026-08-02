import { useMutation, useQuery } from '@tanstack/react-query';

import {
  createAttributionToken,
  exportEventAnalyticsCsv,
  fetchEventAnalytics
} from '@/features/analytics/organizer-analytics-service';
import type {
  AnalyticsPeriod,
  OrganizerAttributionSource
} from '@/features/analytics/organizer-analytics-types';
import { useAuth } from '@/providers/auth-provider';

export function useEventAnalytics(eventId: string, period: AnalyticsPeriod) {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['event-analytics', eventId, period, isDemo],
    queryFn: () => fetchEventAnalytics(eventId, period, isDemo),
    enabled: Boolean(eventId),
    staleTime: 60_000
  });
}

export function useEventAnalyticsExport(eventId: string, period: AnalyticsPeriod) {
  const { isDemo } = useAuth();
  return useMutation({
    mutationFn: () => exportEventAnalyticsCsv(eventId, period, isDemo)
  });
}

export function useCreateAttributionToken(eventId: string) {
  const { isDemo } = useAuth();
  return useMutation({
    mutationFn: (source: OrganizerAttributionSource) =>
      createAttributionToken(eventId, source, isDemo)
  });
}
