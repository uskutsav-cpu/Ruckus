import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { format, formatDistanceToNowStrict } from 'date-fns';

import type { Activity } from '@/features/activities/activity-types';
import { tokens } from '@/theme/tokens';

type ActivityCardProps = {
  activity: Activity;
  onDetails: () => void;
};

export const ActivityCard = memo(function ActivityCard({
  activity,
  onDetails
}: ActivityCardProps) {
  const startsAt = new Date(activity.startsAt);
  const closesAt = new Date(activity.swipeClosesAt);

  return (
    <View style={styles.card}>
      <Image
        source={activity.imageSource}
        accessibilityLabel={`${activity.title} activity`}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={180}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', 'rgba(9,14,26,0.12)', 'rgba(9,14,26,0.97)']}
        locations={[0.3, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topRow}>
        <View style={styles.category}>
          <Text style={styles.categoryText}>{activity.category}</Text>
        </View>
        <View style={styles.countdown}>
          <Text style={styles.countdownText}>
            Closes {formatDistanceToNowStrict(closesAt, { addSuffix: true })}
          </Text>
        </View>
      </View>
      <View style={styles.copy}>
        <Text style={styles.date}>
          {format(startsAt, 'EEE, MMM d · h:mm a')} · {activity.durationMinutes} min
        </Text>
        <Text numberOfLines={2} style={styles.title}>
          {activity.title}
        </Text>
        <Text numberOfLines={2} style={styles.description}>
          {activity.description}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View details for ${activity.title}`}
          onPress={onDetails}
          hitSlop={8}
          style={styles.details}
        >
          <Text style={styles.detailsText}>Details and safety info →</Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#1E293B',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.26,
    shadowRadius: 20,
    elevation: 12
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: tokens.space.md
  },
  category: {
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(9,14,26,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  countdown: {
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(124,58,237,0.88)',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  countdownText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  copy: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    padding: tokens.space.lg
  },
  date: {
    marginBottom: 7,
    color: '#67E8F9',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 35,
    fontWeight: '900',
    letterSpacing: -1.1
  },
  description: {
    marginTop: 8,
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600'
  },
  details: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  detailsText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }
});
