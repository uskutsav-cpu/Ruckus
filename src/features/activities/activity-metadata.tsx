import { StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';

import { AppIcon } from '@/components/ui/app-icon';
import type { Activity } from '@/features/activities/activity-types';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type ActivityMetadataProps = {
  activity: Activity;
  contrast?: 'default' | 'light';
  compact?: boolean;
};

export function ActivityMetadata({
  activity,
  contrast = 'default',
  compact = false
}: ActivityMetadataProps) {
  const { theme } = useTheme();
  const foreground = contrast === 'light' ? tokens.color.white : theme.text;

  return (
    <View style={[styles.metadata, compact && styles.compact]}>
      <MetadataItem
        icon="clock"
        label={format(new Date(activity.startsAt), 'EEE, h:mm a')}
        color={foreground}
      />
      <MetadataItem
        icon="location"
        label={activity.campusArea ?? 'Campus area'}
        color={foreground}
      />
      <MetadataItem icon="people" label="Groups of 4–8" color={foreground} />
    </View>
  );
}

function MetadataItem({
  icon,
  label,
  color
}: {
  icon: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.item}>
      <View style={styles.itemIcon}>
        <AppIcon color={color} name={icon} size={14} />
      </View>
      <Text numberOfLines={1} style={[styles.itemLabel, { color }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: tokens.space.md,
    rowGap: tokens.space.sm
  },
  compact: { columnGap: tokens.space.sm, rowGap: 6 },
  item: { flexDirection: 'row', alignItems: 'center' },
  itemIcon: {
    marginRight: 6
  },
  itemLabel: {
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.medium
  }
});
