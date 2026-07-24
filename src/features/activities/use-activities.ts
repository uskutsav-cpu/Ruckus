import { useEffect } from 'react';
import { Image } from 'expo-image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchActivities,
  flushSwipeQueue,
  removeLocalDecision,
  storeLocalDecision,
  submitSwipe
} from '@/features/activities/activity-service';
import type { Activity, SwipeDirection } from '@/features/activities/activity-types';
import { useAuth } from '@/providers/auth-provider';

export const activityKeys = {
  deck: (userId: string) => ['activities', 'deck', userId] as const
};

export function useActivities() {
  const { isDemo, user } = useAuth();
  const userId = user?.id ?? '';
  const query = useQuery({
    queryKey: activityKeys.deck(userId),
    queryFn: () => fetchActivities(userId, isDemo),
    enabled: Boolean(userId),
    staleTime: 15_000
  });

  useEffect(() => {
    if (!userId || isDemo) return;
    void flushSwipeQueue(userId);
  }, [isDemo, userId]);

  useEffect(() => {
    const urls = query.data
      ?.slice(0, 3)
      .map((activity) =>
        typeof activity.imageSource === 'object' ? activity.imageSource.uri : undefined
      )
      .filter((url): url is string => Boolean(url));
    if (urls?.length) void Image.prefetch(urls, 'memory-disk');
  }, [query.data]);

  return query;
}

export function useSwipeActivity() {
  const { isDemo, user } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      activity,
      direction
    }: {
      activity: Activity;
      direction: SwipeDirection;
    }) => submitSwipe(userId, activity.id, direction, isDemo),
    onMutate: async ({ activity, direction }) => {
      await queryClient.cancelQueries({ queryKey: activityKeys.deck(userId) });
      const previous =
        queryClient.getQueryData<Activity[]>(activityKeys.deck(userId)) ?? [];
      await storeLocalDecision(userId, activity.id, direction);
      queryClient.setQueryData<Activity[]>(
        activityKeys.deck(userId),
        previous.filter((item) => item.id !== activity.id)
      );
      return { previous, activityId: activity.id };
    },
    onError: async (_error, _variables, context) => {
      if (!context) return;
      await removeLocalDecision(userId, context.activityId);
      queryClient.setQueryData(activityKeys.deck(userId), context.previous);
    }
  });
}
