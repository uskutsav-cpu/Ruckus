import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppScreen } from '@/components/ui/app-screen';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ErrorState } from '@/components/ui/error-state';
import { IconButton } from '@/components/ui/icon-button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { ActivityMetadata } from '@/features/activities/activity-metadata';
import { demoActivities } from '@/features/activities/demo-activities';
import { MatchCelebration } from '@/features/activities/match-celebration';
import { useActivities, useSwipeActivity } from '@/features/activities/use-activities';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const activities = useActivities();
  const swipe = useSwipeActivity();
  const [celebration, setCelebration] = useState<{
    memberCount: number | undefined;
    confirmationDeadline: string | undefined;
  } | null>(null);
  const activity =
    activities.data?.find((item) => item.id === id) ??
    demoActivities.find((item) => item.id === id);

  if (activities.isLoading && !activity) {
    return <LoadingScreen label="Opening the plan…" />;
  }

  if (!activity) {
    return (
      <AppScreen>
        <ErrorState
          icon="↙"
          title="This plan moved on"
          message="It may have closed or been cancelled. Your deck is ready with other options."
          actionLabel="Back to the deck"
          onAction={() => router.back()}
        />
      </AppScreen>
    );
  }

  const choose = (direction: 'left' | 'right') => {
    swipe.mutate(
      { activity, direction },
      {
        onSuccess: (result) => {
          if (result.state === 'matched') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCelebration({
              memberCount: result.memberCount,
              confirmationDeadline: result.confirmationDeadline
            });
            return;
          }
          router.back();
        }
      }
    );
  };
  const heroHeight = Math.min(Math.max(height * 0.42, 280), 390);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <BottomSheet
        header={
          <View style={[styles.hero, { height: heroHeight }]}>
            <Image
              source={activity.imageSource}
              contentFit="cover"
              accessibilityLabel={activity.title}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(9,10,13,0.08)', 'rgba(9,10,13,0.12)', '#090A0D']}
              locations={[0, 0.46, 1]}
              style={StyleSheet.absoluteFill}
            />
            <IconButton
              icon="×"
              accessibilityLabel="Close activity details"
              onPress={() => router.back()}
              tone="dark"
              style={[styles.close, { top: Math.max(insets.top, tokens.space.md) }]}
            />
            <View style={styles.heroCopy}>
              <StatusPill label={activity.category.toUpperCase()} tone="success" />
              <Text style={styles.title}>{activity.title.toUpperCase()}</Text>
            </View>
          </View>
        }
        footer={
          <View style={styles.actions}>
            <SecondaryButton
              label="Pass"
              leadingIcon="×"
              onPress={() => choose('left')}
              disabled={swipe.isPending}
              style={styles.passButton}
            />
            <PrimaryButton
              label="I’m in"
              leadingIcon="↗"
              onPress={() => choose('right')}
              loading={swipe.isPending}
              style={styles.joinButton}
            />
          </View>
        }
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>
            <ActivityMetadata activity={activity} />
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.accent }]}>THE PLAN</Text>
              <Text style={[styles.description, { color: theme.text }]}>
                {activity.description}
              </Text>
            </View>
            <View
              style={[
                styles.safety,
                { backgroundColor: theme.surfaceMuted, borderColor: theme.border }
              ]}
            >
              <View style={[styles.safetyIcon, { backgroundColor: theme.primary }]}>
                <Text style={[styles.safetyIconText, { color: theme.onPrimary }]}>✓</Text>
              </View>
              <View style={styles.safetyCopy}>
                <Text style={[styles.safetyTitle, { color: theme.text }]}>
                  Public-venue meetup
                </Text>
                <Text style={[styles.safetyBody, { color: theme.textMuted }]}>
                  The approved meeting spot stays hidden until enough group members
                  confirm. Ruckus never shares exact live location.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </BottomSheet>
      <MatchCelebration
        visible={celebration !== null}
        activityTitle={activity.title}
        memberCount={celebration?.memberCount}
        confirmationDeadline={celebration?.confirmationDeadline}
        onClose={() => {
          setCelebration(null);
          router.replace('/groups');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: {
    overflow: 'hidden',
    backgroundColor: tokens.color.inkSoft
  },
  close: { position: 'absolute', top: tokens.space.md, right: tokens.space.md },
  heroCopy: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    padding: tokens.layout.screenPadding
  },
  title: {
    maxWidth: 410,
    marginTop: tokens.space.md,
    color: tokens.color.white,
    fontSize: 36,
    lineHeight: 37,
    fontWeight: tokens.weight.black,
    letterSpacing: -1.5
  },
  scroll: { paddingBottom: tokens.space.xl },
  inner: {
    width: '100%',
    maxWidth: tokens.layout.maxContentWidth,
    alignSelf: 'center',
    padding: tokens.layout.screenPadding
  },
  section: { marginTop: tokens.space.xl },
  sectionLabel: {
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.black,
    letterSpacing: 1.2
  },
  description: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body,
    fontWeight: tokens.weight.medium
  },
  safety: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginTop: tokens.space.lg
  },
  safetyIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm
  },
  safetyIconText: { fontSize: 19, fontWeight: tokens.weight.black },
  safetyCopy: { flex: 1, marginLeft: tokens.space.md },
  safetyTitle: { fontSize: 15, fontWeight: tokens.weight.black },
  safetyBody: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  actions: { flexDirection: 'row', gap: tokens.space.sm },
  passButton: { flex: 0.8 },
  joinButton: { flex: 1.2 }
});
