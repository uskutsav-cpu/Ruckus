import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatePanel } from '@/components/ui/state-panel';
import { demoActivities } from '@/features/activities/demo-activities';
import { useActivities, useSwipeActivity } from '@/features/activities/use-activities';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const activities = useActivities();
  const swipe = useSwipeActivity();
  const activity =
    activities.data?.find((item) => item.id === id) ??
    demoActivities.find((item) => item.id === id);

  if (!activity) {
    return (
      <AppScreen>
        <StatePanel
          icon="🗓️"
          title="Activity unavailable"
          message="It may have closed or been cancelled."
          actionLabel="Back to deck"
          onAction={() => router.back()}
        />
      </AppScreen>
    );
  }

  const choose = (direction: 'left' | 'right') => {
    swipe.mutate(
      { activity, direction },
      {
        onSuccess: () => router.back()
      }
    );
  };

  return (
    <AppScreen scroll={false}>
      <View style={styles.imageWrap}>
        <Image
          source={activity.imageSource}
          contentFit="cover"
          accessibilityLabel={activity.title}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['transparent', 'rgba(9,14,26,0.92)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.imageCopy}>
          <Text style={styles.category}>{activity.category}</Text>
          <Text style={styles.title}>{activity.title}</Text>
        </View>
      </View>
      <View style={styles.details}>
        <Text style={[styles.when, { color: theme.primary }]}>
          {format(new Date(activity.startsAt), 'EEEE, MMMM d · h:mm a')}
        </Text>
        <Text style={[styles.description, { color: theme.text }]}>
          {activity.description}
        </Text>
        <View style={[styles.safety, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={styles.safetyIcon}>🛡️</Text>
          <Text style={[styles.safetyCopy, { color: theme.textMuted }]}>
            Groups have 4–8 students. The approved public venue stays hidden until enough
            members confirm. No live location is shared.
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <PrimaryButton
          label="Pass"
          variant="secondary"
          onPress={() => choose('left')}
          disabled={swipe.isPending}
          style={styles.action}
        />
        <PrimaryButton
          label="I’m in ⚡"
          onPress={() => choose('right')}
          loading={swipe.isPending}
          style={styles.action}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    height: '53%',
    overflow: 'hidden',
    borderRadius: tokens.radius.lg,
    backgroundColor: '#1E293B'
  },
  imageCopy: { position: 'absolute', right: 0, bottom: 0, left: 0, padding: 22 },
  category: {
    color: '#67E8F9',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  title: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 37,
    fontWeight: '900'
  },
  details: { flex: 1, paddingTop: tokens.space.lg },
  when: { fontSize: 15, fontWeight: '900' },
  description: { marginTop: 8, fontSize: 15, lineHeight: 22 },
  safety: {
    flexDirection: 'row',
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginTop: tokens.space.md
  },
  safetyIcon: { marginRight: 10, fontSize: 22 },
  safetyCopy: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: tokens.space.sm },
  action: { flex: 1 }
});
