import { StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';

import type { Activity } from '@/features/activities/activity-types';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type ActivityMetadataProps = {
  activity: Activity;
  contrast?: 'default' | 'light';
  showMomentum?: boolean;
  compact?: boolean;
};

export function ActivityMetadata({
  activity,
  contrast = 'default',
  showMomentum = true,
  compact = false
}: ActivityMetadataProps) {
  const { theme } = useTheme();
  const foreground = contrast === 'light' ? tokens.color.white : theme.text;
  const muted = contrast === 'light' ? '#D7DAE0' : theme.textMuted;
  const hasMomentum = typeof activity.interestedCount === 'number';
  const interestedCount = Math.min(Math.max(activity.interestedCount ?? 0, 0), 3);
  const remaining = Math.max(4 - interestedCount, 1);

  return (
    <View>
      <View style={styles.metadata}>
        <MetadataItem
          icon="◷"
          label={format(new Date(activity.startsAt), 'EEE · h:mm a')}
          color={foreground}
        />
        <MetadataItem
          icon="⌖"
          label={activity.campusArea ?? 'Campus area'}
          color={foreground}
        />
        <MetadataItem icon="●" label="4–8 people" color={foreground} />
      </View>
      {showMomentum ? (
        <View
          style={[
            styles.momentum,
            compact && styles.momentumCompact,
            {
              backgroundColor:
                contrast === 'light' ? 'rgba(9,10,13,0.64)' : theme.surfaceMuted
            }
          ]}
        >
          <View style={styles.momentumCopy}>
            <Text style={[styles.momentumLabel, { color: muted }]}>CREW MOMENTUM</Text>
            <Text style={[styles.momentumValue, { color: foreground }]}>
              {hasMomentum
                ? `${remaining} more ${remaining === 1 ? 'person' : 'people'} to unlock`
                : 'Unlocks when 4 people join'}
            </Text>
          </View>
          <View
            accessibilityLabel={
              hasMomentum
                ? `${interestedCount} of 4 people ready`
                : 'Four people are needed to unlock'
            }
            style={styles.segments}
          >
            {Array.from({ length: 4 }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.segment,
                  {
                    backgroundColor:
                      hasMomentum && index < interestedCount
                        ? tokens.color.ruckus
                        : contrast === 'light'
                          ? 'rgba(255,255,255,0.28)'
                          : theme.surfaceStrong
                  }
                ]}
              />
            ))}
          </View>
        </View>
      ) : null}
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
      <Text aria-hidden style={[styles.itemIcon, { color }]}>
        {icon}
      </Text>
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
    rowGap: 7
  },
  item: { flexDirection: 'row', alignItems: 'center' },
  itemIcon: {
    marginRight: 6,
    fontSize: 12,
    fontWeight: tokens.weight.black
  },
  itemLabel: {
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.heavy
  },
  momentum: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: tokens.radius.sm,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginTop: tokens.space.md
  },
  momentumCompact: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginTop: tokens.space.sm
  },
  momentumCopy: { flex: 1, marginRight: tokens.space.md },
  momentumLabel: {
    fontSize: 9,
    fontWeight: tokens.weight.black,
    letterSpacing: 1
  },
  momentumValue: {
    marginTop: 2,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.black
  },
  segments: { flexDirection: 'row', gap: 4 },
  segment: {
    width: 14,
    height: 7,
    borderRadius: tokens.radius.pill
  }
});
