import { useState } from 'react';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

import { AppScreen } from '@/components/ui/app-screen';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { StatePanel } from '@/components/ui/state-panel';
import { ActivityCard } from '@/features/activities/activity-card';
import { MatchCelebration } from '@/features/activities/match-celebration';
import { SwipeCard } from '@/features/activities/swipe-card';
import type { SwipeDirection } from '@/features/activities/activity-types';
import { useActivities, useSwipeActivity } from '@/features/activities/use-activities';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function DeckScreen() {
  const { theme } = useTheme();
  const network = useNetInfo();
  const activities = useActivities();
  const swipe = useSwipeActivity();
  const [celebrating, setCelebrating] = useState(false);
  const cards = activities.data ?? [];
  const current = cards[0];

  const handleSwipe = async (direction: SwipeDirection) => {
    if (!current || swipe.isPending) return;
    await Haptics.notificationAsync(
      direction === 'right'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
    swipe.mutate(
      { activity: current, direction },
      {
        onSuccess: (result) => {
          if (result.state === 'matched') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCelebrating(true);
          }
        }
      }
    );
  };

  if (activities.isLoading) return <LoadingScreen label="Dealing today’s activities…" />;

  return (
    <AppScreen scroll={false}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.logo, { color: theme.text }]}>Campus Clash</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Swipe on plans you’d actually attend
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.push('/profile')}
          style={[styles.avatar, { backgroundColor: theme.surfaceMuted }]}
        >
          <Text style={styles.avatarText}>⚡</Text>
        </Pressable>
      </View>

      {network.isConnected === false ? (
        <View style={styles.offline} accessibilityRole="alert">
          <Text style={styles.offlineText}>
            Offline · your choice will send when you reconnect
          </Text>
        </View>
      ) : null}

      {activities.isError ? (
        <StatePanel
          icon="📡"
          title="The deck didn’t load"
          message="Check your connection. Your previous swipes are still safe."
          actionLabel="Try again"
          onAction={() => void activities.refetch()}
        />
      ) : cards.length === 0 ? (
        <StatePanel
          icon="🛹"
          title="You cleared the deck"
          message="Fresh activities drop regularly. Check pending matches while the next round gets ready."
          actionLabel="View pending matches"
          onAction={() => router.push('/pending')}
        />
      ) : (
        <>
          <View style={styles.deck}>
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
                        opacity: 1 - depth * 0.12
                      }
                    ]}
                  >
                    <ActivityCard activity={activity} onDetails={() => undefined} />
                  </View>
                );
              })}
            {current ? (
              <SwipeCard
                key={current.id}
                activity={current}
                disabled={swipe.isPending}
                onDetails={() =>
                  router.push({ pathname: '/activity/[id]', params: { id: current.id } })
                }
                onSwipe={(direction) => void handleSwipe(direction)}
              />
            ) : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Pass on ${current?.title ?? 'activity'}`}
              disabled={swipe.isPending}
              onPress={() => void handleSwipe('left')}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: theme.surface,
                  borderColor: tokens.color.coral,
                  opacity: pressed || swipe.isPending ? 0.55 : 1
                }
              ]}
            >
              <Text style={styles.passIcon}>✕</Text>
              <Text style={[styles.actionLabel, { color: theme.text }]}>Pass</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Join waitlist for ${current?.title ?? 'activity'}`}
              disabled={swipe.isPending}
              onPress={() => void handleSwipe('right')}
              style={({ pressed }) => [
                styles.actionButton,
                styles.interestedButton,
                {
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                  opacity: pressed || swipe.isPending ? 0.65 : 1
                }
              ]}
            >
              <Text style={styles.interestedIcon}>⚡</Text>
              <Text style={[styles.actionLabel, { color: '#FFFFFF' }]}>I’m in</Text>
            </Pressable>
          </View>
          {swipe.isError ? (
            <Text
              accessibilityRole="alert"
              style={[styles.error, { color: theme.danger }]}
            >
              Couldn’t save that swipe. The card is back—please try again.
            </Text>
          ) : null}
        </>
      )}
      <MatchCelebration
        visible={celebrating}
        onClose={() => {
          setCelebrating(false);
          router.push('/groups');
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.space.md
  },
  logo: { fontSize: 25, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { marginTop: 2, fontSize: 12, fontWeight: '700' },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16
  },
  avatarText: { fontSize: 23 },
  offline: {
    borderRadius: tokens.radius.sm,
    backgroundColor: '#78350F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: tokens.space.sm
  },
  offlineText: { color: '#FEF3C7', fontSize: 12, fontWeight: '800' },
  deck: { flex: 1, minHeight: 440, marginBottom: tokens.space.md },
  nextCard: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  actions: {
    minHeight: 66,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.space.md
  },
  actionButton: {
    minWidth: 124,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.lg
  },
  interestedButton: { minWidth: 150 },
  passIcon: {
    marginRight: 8,
    color: tokens.color.coral,
    fontSize: 23,
    fontWeight: '900'
  },
  interestedIcon: { marginRight: 8, fontSize: 21 },
  actionLabel: { fontSize: 16, fontWeight: '900' },
  error: { marginTop: 4, fontSize: 12, textAlign: 'center' }
});
