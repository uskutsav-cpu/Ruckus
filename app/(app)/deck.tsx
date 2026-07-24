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
import { ActivityCard } from '@/features/activities/activity-card';
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
        eyebrow="Tonight on campus"
        title="Pick your next move."
        subtitle={
          activities.isLoading
            ? 'Finding fresh plans…'
            : `${cards.length} ${cards.length === 1 ? 'activity' : 'activities'} waiting`
        }
        action={
          <IconButton
            icon="⚡"
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
          title="The deck took a timeout"
          message="Check your connection. Your previous choices are still safe."
          actionLabel="Try again"
          onAction={() => void activities.refetch()}
        />
      ) : cards.length === 0 ? (
        <EmptyState
          icon="✓"
          title="You cleared the deck"
          message="Fresh activities drop regularly. Check your pending picks while the next round gets ready."
          actionLabel="View pending picks"
          onAction={() => router.push('/pending')}
        />
      ) : (
        <>
          <View
            style={[
              styles.deck,
              { minHeight: deckMinHeight, marginBottom: compact ? 10 : 16 }
            ]}
          >
            {cards
              .slice(1, 3)
              .reverse()
              .map((activity, reverseIndex, array) => {
                const depth = array.length - reverseIndex;
                return (
                  <View
                    key={activity.id}
                    pointerEvents="none"
                    style={[
                      styles.nextCard,
                      {
                        transform: [
                          { translateY: depth * 9 },
                          { scale: 1 - depth * 0.025 }
                        ],
                        opacity: 1 - depth * 0.14
                      }
                    ]}
                  >
                    <ActivityCard activity={activity} onDetails={() => undefined} />
                  </View>
                );
              })}
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
              leadingIcon="×"
              accessibilityLabel={`Pass on ${current!.title}`}
              disabled={swipe.isPending}
              haptic={false}
              onPress={() => void handleSwipe('left')}
              style={styles.passButton}
            />
            <PrimaryButton
              label="I’m in"
              leadingIcon="↗"
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
  deck: { flex: 1 },
  nextCard: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  actions: { flexDirection: 'row', gap: tokens.space.sm },
  passButton: { flex: 0.8 },
  joinButton: { flex: 1.2 },
  error: { marginTop: tokens.space.sm }
});
