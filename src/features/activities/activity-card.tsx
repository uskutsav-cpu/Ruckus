import { memo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNowStrict } from 'date-fns';

import { ActivityMetadata } from '@/features/activities/activity-metadata';
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
  const { height } = useWindowDimensions();
  const compact = height < tokens.layout.compactPhoneHeight;
  const closesAt = new Date(activity.swipeClosesAt);

  return (
    <View style={[styles.card, tokens.shadow.card]}>
      <Image
        source={activity.imageSource}
        accessibilityLabel={`${activity.title} activity`}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={tokens.motion.quick}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[
          'rgba(9,10,13,0.08)',
          'rgba(9,10,13,0.03)',
          'rgba(9,10,13,0.76)',
          '#090A0D'
        ]}
        locations={[0, 0.34, 0.63, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topRow}>
        <View style={styles.category}>
          <Text style={styles.categoryText}>{activity.category}</Text>
        </View>
        <View style={styles.countdown}>
          <View style={styles.countdownDot} />
          <Text style={styles.countdownText}>
            {formatDistanceToNowStrict(closesAt)} left
          </Text>
        </View>
      </View>
      <View style={[styles.copy, compact && styles.copyCompact]}>
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          style={[styles.title, compact && styles.titleCompact]}
        >
          {activity.title.toUpperCase()}
        </Text>
        <View style={[styles.metadata, compact && styles.metadataCompact]}>
          <ActivityMetadata activity={activity} contrast="light" compact={compact} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View details for ${activity.title}`}
          onPress={onDetails}
          hitSlop={8}
          style={({ pressed }) => [
            styles.details,
            compact && styles.detailsCompact,
            { opacity: pressed ? 0.62 : 1 }
          ]}
        >
          <Text style={styles.detailsText}>See the full plan</Text>
          <Text aria-hidden style={styles.detailsArrow}>
            ↗
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.color.inkSoft
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: tokens.space.sm,
    padding: tokens.space.md
  },
  category: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.ruckus,
    paddingHorizontal: 12
  },
  categoryText: {
    color: tokens.color.ink,
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.black,
    letterSpacing: 0.9,
    textTransform: 'uppercase'
  },
  countdown: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(9,10,13,0.72)',
    paddingHorizontal: 12
  },
  countdownDot: {
    width: 7,
    height: 7,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.coral,
    marginRight: 7
  },
  countdownText: {
    color: tokens.color.white,
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.black
  },
  copy: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    padding: tokens.layout.cardPadding
  },
  copyCompact: { padding: 14 },
  title: {
    maxWidth: 360,
    color: tokens.color.white,
    fontSize: 34,
    lineHeight: 35,
    fontWeight: tokens.weight.black,
    letterSpacing: -1.35
  },
  titleCompact: { fontSize: 28, lineHeight: 29, letterSpacing: -1 },
  metadata: { marginTop: tokens.space.md },
  metadataCompact: { marginTop: tokens.space.sm },
  details: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: tokens.space.sm
  },
  detailsCompact: { minHeight: 34, marginTop: tokens.space.xxs },
  detailsText: {
    color: tokens.color.white,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.black
  },
  detailsArrow: {
    marginLeft: 7,
    color: tokens.color.ruckus,
    fontSize: 17,
    fontWeight: tokens.weight.black
  }
});
