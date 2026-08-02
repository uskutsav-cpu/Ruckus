import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createCampaignAsset,
  createGrowthCampaign,
  createOrganizationCompetition,
  fetchCampusCampaigns,
  fetchCampusCompetitions,
  fetchCampusGrowthAnalytics,
  fetchCompetitionStandings
} from '@/features/growth/campaign-service';
import type {
  CampaignAssetKind,
  CompetitionMetric,
  GrowthCampaignKind
} from '@/features/growth/campaign-types';
import { useAuth } from '@/providers/auth-provider';

export function useCampusCampaigns(campusId: string | null, enabled: boolean) {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['campus-campaigns', campusId, isDemo],
    queryFn: () => fetchCampusCampaigns(campusId as string, isDemo),
    enabled: Boolean(campusId) && enabled,
    staleTime: 30_000
  });
}

export function useCreateGrowthCampaign(campusId: string | null) {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      kind: GrowthCampaignKind;
      name: string;
      startsAt: string;
      endsAt: string;
    }) =>
      createGrowthCampaign(
        campusId as string,
        input.kind,
        input.name,
        input.startsAt,
        input.endsAt,
        isDemo
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['campus-campaigns', campusId] });
      void queryClient.invalidateQueries({ queryKey: ['campus-audit-log', campusId] });
    }
  });
}

export function useCreateCampaignAsset(campusId: string | null) {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      campaignId: string;
      kind: CampaignAssetKind;
      label: string;
      deepLink: string;
    }) =>
      createCampaignAsset(
        input.campaignId,
        input.kind,
        input.label,
        input.deepLink,
        isDemo
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['campus-campaigns', campusId] });
    }
  });
}

export function useCampusCompetitions(campusId: string | null) {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['campus-competitions', campusId, isDemo],
    queryFn: () => fetchCampusCompetitions(campusId as string, isDemo),
    enabled: Boolean(campusId),
    staleTime: 60_000
  });
}

export function useCompetitionStandings(competitionId: string | null) {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['competition-standings', competitionId, isDemo],
    queryFn: () => fetchCompetitionStandings(competitionId as string, isDemo),
    enabled: Boolean(competitionId),
    staleTime: 60_000
  });
}

export function useCreateCompetition(campusId: string | null) {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      metric: CompetitionMetric;
      startsOn: string;
      endsOn: string;
    }) =>
      createOrganizationCompetition(
        campusId as string,
        input.name,
        input.metric,
        input.startsOn,
        input.endsOn,
        isDemo
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['campus-competitions', campusId] });
    }
  });
}

export function useCampusGrowthAnalytics(campusId: string | null, enabled: boolean) {
  const { isDemo } = useAuth();
  return useQuery({
    queryKey: ['campus-growth-analytics', campusId, isDemo],
    queryFn: () => fetchCampusGrowthAnalytics(campusId as string, isDemo),
    enabled: Boolean(campusId) && enabled,
    staleTime: 60_000
  });
}
