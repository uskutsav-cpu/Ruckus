import { useState } from 'react';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

import { AppScreen } from '@/components/ui/app-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { IconButton } from '@/components/ui/icon-button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ActivityCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SecondaryButton } from '@/components/ui/secondary-button';
import type { SwipeDirection } from '@/features/activities/activity-types';
import { MatchCelebration } from '@/features/activities/match-celebration';
import { SwipeCard } from '@/features/activities/swipe-card';
import { useActivities, useSwipeActivity } from '@/features/activities/use-activities';
import { tokens } from '@/theme/tokens';

type Celebration = {
  activityTitle: string;
  memberCount: number | undefined;
  confirmationDeadline: string | undefined;
};

export default function DeckScreen() {
  const { height } = useWindowDimensions();
  const network = useNetInfo();
  const activities = useActivities();
  const swipe = useSwipeActivity();
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const cards = activities.data ?? [];
  const current = cards[0];
  const compact = height < tokens.layout.compactPhoneHeight;
  const deckMinHeight = height < 620 ? 250 : compact ? 350 : 430;

  const handleSwipe = async (direction: SwipeDirection) => {
    if (!current || swipe.isPending) return;
    const swipedActivity = current;

    await Haptics.notificationAsync(
      direction === 'right'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
    swipe.mutate(
      { activity: swipedActivity, direction },
      {
        onSuccess: (result) => {
          if (result.state === 'matched') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCelebration({
              activityTitle: swipedActivity.title,
              memberCount: result.memberCount,
              confirmationDeadline: result.confirmationDeadline
            });
          }
        }
      }
    );
  };

  return (
    <AppScreen scroll={false} contentStyle={styles.screen}>
      <ScreenHeader
        compact={compact}
        eyebrow="Tonight"
        title="Find something to do."
        subtitle={
          activities.isLoading
            ? 'Loading activities…'
            : `${cards.length} ${cards.length === 1 ? 'activity' : 'activities'} available`
        }
        action={
          <IconButton
            icon="person"
            accessibilityLabel="Open profile"
            onPress={() => router.push('/profile')}
          />
        }
      />

      {network.isConnected === false ? (
        <InlineNotice
          tone="offline"
          icon="↯"
          message="Offline — your choice will send when you reconnect."
        />
      ) : null}

      {activities.isLoading ? (
        <ActivityCardSkeleton />
      ) : activities.isError ? (
        <ErrorState
          icon="↻"
          title="Activities are unavailable"
          message="Check your connection and try again."
          actionLabel="Try again"
          onAction={() => void activities.refetch()}
        />
      ) : cards.length === 0 ? (
        <EmptyState
          icon="✓"
          title="No more activities right now"
          message="Check your pending activities or come back later."
          actionLabel="View pending picks"
          onAction={() => router.push('/pending')}
        />
      ) : (
        <>
          <View style={[styles.deck, { minHeight: deckMinHeight }]}>
            <SwipeCard
              key={current!.id}
              activity={current!}
              disabled={swipe.isPending}
              onDetails={() =>
                router.push({
                  pathname: '/activity/[id]',
                  params: { id: current!.id }
                })
              }
              onSwipe={(direction) => void handleSwipe(direction)}
            />
          </View>

          <View style={styles.actions}>
            <SecondaryButton
              label="Pass"
              leadingIcon="close"
              accessibilityLabel={`Pass on ${current!.title}`}
              disabled={swipe.isPending}
              haptic={false}
              onPress={() => void handleSwipe('left')}
              style={styles.passButton}
            />
            <PrimaryButton
              label="Join"
              leadingIcon="check"
              accessibilityLabel={`Join waitlist for ${current!.title}`}
              loading={swipe.isPending}
              haptic={false}
              onPress={() => void handleSwipe('right')}
              style={styles.joinButton}
            />
          </View>
          {swipe.isError ? (
            <View style={styles.error}>
              <InlineNotice
                tone="error"
                icon="!"
                message="That choice didn’t save. The card is back — try again."
              />
            </View>
          ) : null}
        </>
      )}

      <MatchCelebration
        visible={celebration !== null}
        activityTitle={celebration?.activityTitle}
        memberCount={celebration?.memberCount}
        confirmationDeadline={celebration?.confirmationDeadline}
        onClose={() => {
          setCelebration(null);
          router.push('/groups');
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: tokens.space.md },
  deck: { flex: 1, marginBottom: tokens.space.md },
  actions: { flexDirection: 'row', gap: tokens.space.sm },
  passButton: { flex: 1 },
  joinButton: { flex: 1 },
  error: { marginTop: tokens.space.sm }
});
