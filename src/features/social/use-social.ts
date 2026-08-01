import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';

import {
  fetchSocialConnections,
  fetchSocialOverview,
  fetchSocialProfile,
  fetchSocialSuggestions,
  followProfile,
  removeFriend,
  respondToFollowRequest,
  respondToFriendRequest,
  sendFriendRequest,
  unfollowProfile,
  updateSocialPreferences
} from '@/features/social/social-service';
import type {
  SocialConnectionCursor,
  SocialConnectionKind,
  SocialPreferences,
  SocialSuggestionCursor
} from '@/features/social/social-types';
import { useAuth } from '@/providers/auth-provider';

export function useSocialOverview() {
  const { isDemo, user } = useAuth();
  return useQuery({
    queryKey: ['social-overview', user?.id, isDemo],
    queryFn: () => fetchSocialOverview(isDemo),
    enabled: Boolean(user)
  });
}

export function useSocialConnections(kind: SocialConnectionKind) {
  const { isDemo, user } = useAuth();
  return useInfiniteQuery({
    queryKey: ['social-connections', kind, user?.id, isDemo],
    queryFn: ({ pageParam }) => fetchSocialConnections(kind, pageParam, isDemo),
    initialPageParam: null as SocialConnectionCursor | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: Boolean(user)
  });
}

export function useSocialSuggestions() {
  const { isDemo, user } = useAuth();
  return useInfiniteQuery({
    queryKey: ['social-suggestions', user?.id, isDemo],
    queryFn: ({ pageParam }) => fetchSocialSuggestions(pageParam, isDemo),
    initialPageParam: null as SocialSuggestionCursor | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: Boolean(user)
  });
}

export function useSocialProfile(profileId: string) {
  const { isDemo, user } = useAuth();
  return useQuery({
    queryKey: ['social-profile', profileId, user?.id, isDemo],
    queryFn: () => fetchSocialProfile(profileId, isDemo),
    enabled: Boolean(user && profileId)
  });
}

function useInvalidateSocial(profileId?: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['social-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['social-connections'] }),
      queryClient.invalidateQueries({ queryKey: ['social-suggestions'] }),
      ...(profileId
        ? [queryClient.invalidateQueries({ queryKey: ['social-profile', profileId] })]
        : [])
    ]);
  };
}

export function useUpdateSocialPreferences() {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateSocial();
  return useMutation({
    mutationFn: (input: SocialPreferences) => updateSocialPreferences(input, isDemo),
    onSuccess: invalidate
  });
}

export function useFollowProfile(profileId: string) {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateSocial(profileId);
  return useMutation({
    mutationFn: () => followProfile(profileId, isDemo),
    onSuccess: invalidate
  });
}

export function useUnfollowProfile(profileId: string) {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateSocial(profileId);
  return useMutation({
    mutationFn: () => unfollowProfile(profileId, isDemo),
    onSuccess: invalidate
  });
}

export function useSendFriendRequest(profileId: string) {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateSocial(profileId);
  return useMutation({
    mutationFn: () => sendFriendRequest(profileId, isDemo),
    onSuccess: invalidate
  });
}

export function useRespondToFriendRequest() {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateSocial();
  return useMutation({
    mutationFn: (input: { requestId: string; accept: boolean }) =>
      respondToFriendRequest(input.requestId, input.accept, isDemo),
    onSuccess: invalidate
  });
}

export function useRespondToFollowRequest() {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateSocial();
  return useMutation({
    mutationFn: (input: { profileId: string; accept: boolean }) =>
      respondToFollowRequest(input.profileId, input.accept, isDemo),
    onSuccess: invalidate
  });
}

export function useRemoveFriend(profileId: string) {
  const { isDemo } = useAuth();
  const invalidate = useInvalidateSocial(profileId);
  return useMutation({
    mutationFn: () => removeFriend(profileId, isDemo),
    onSuccess: invalidate
  });
}
