import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type CapacityMeterProps = {
  confirmed: number;
  capacity: number;
  waitlistEnabled: boolean;
  compact?: boolean;
};

export function CapacityMeter({
  confirmed,
  capacity,
  waitlistEnabled,
  compact = false
}: CapacityMeterProps) {
  const { theme } = useTheme();
  const ratio = Math.min(Math.max(confirmed / Math.max(capacity, 1), 0), 1);
  const remaining = Math.max(capacity - confirmed, 0);
  const label =
    remaining > 0
      ? `${remaining} ${remaining === 1 ? 'spot' : 'spots'} left`
      : waitlistEnabled
        ? 'Waitlist open'
        : 'Full';
  return (
    <View
      accessible
      accessibilityLabel={`${confirmed} of ${capacity} spots confirmed. ${label}.`}
      style={styles.root}
    >
      <View style={[styles.track, { backgroundColor: theme.surfaceStrong }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: remaining > 0 ? theme.primary : theme.warning,
              width: `${Math.max(ratio * 100, ratio > 0 ? 4 : 0)}%`
            }
          ]}
        />
      </View>
      <Text
        style={[
          compact ? styles.compactLabel : styles.label,
          { color: remaining > 0 ? theme.textMuted : theme.warning }
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: tokens.space.xs },
  track: { height: 5, overflow: 'hidden', borderRadius: tokens.radius.pill },
  fill: { height: '100%', borderRadius: tokens.radius.pill },
  label: { fontSize: tokens.type.caption, fontWeight: tokens.weight.bold },
  compactLabel: { fontSize: tokens.type.micro, fontWeight: tokens.weight.bold }
});
