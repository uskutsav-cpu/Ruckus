import { memo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNowStrict } from 'date-fns';

import { AppIcon } from '@/components/ui/app-icon';
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
        <View style={styles.countdown}>
          <Text style={styles.countdownText}>
            Closes in {formatDistanceToNowStrict(closesAt)}
          </Text>
        </View>
      </View>
      <View style={[styles.copy, compact && styles.copyCompact]}>
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          style={[styles.title, compact && styles.titleCompact]}
        >
          {activity.title}
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
          <Text style={styles.detailsText}>View details</Text>
          <View style={styles.detailsArrow}>
            <AppIcon color={tokens.color.white} name="forward" size={15} />
          </View>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.inkSoft
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: tokens.space.md
  },
  countdown: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radius.xs,
    backgroundColor: 'rgba(13,15,14,0.68)',
    paddingHorizontal: 10
  },
  countdownText: {
    color: tokens.color.white,
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.medium
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
    fontSize: 32,
    lineHeight: 36,
    fontWeight: tokens.weight.bold,
    letterSpacing: -0.8
  },
  titleCompact: { fontSize: 27, lineHeight: 31, letterSpacing: -0.6 },
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
    fontWeight: tokens.weight.bold
  },
  detailsArrow: {
    marginLeft: 7,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
