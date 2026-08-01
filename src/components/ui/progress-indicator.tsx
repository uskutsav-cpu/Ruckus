import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type ProgressIndicatorProps = {
  current: number;
  total: number;
  label?: string;
};

export function ProgressIndicator({ current, total, label }: ProgressIndicatorProps) {
  const { theme } = useTheme();
  const safeCurrent = Math.min(Math.max(current, 1), total);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Setup progress'}
      accessibilityValue={{ min: 1, max: total, now: safeCurrent }}
    >
      <View style={styles.copy}>
        <Text style={[styles.label, { color: theme.textMuted }]}>
          {label ?? 'Your setup'}
        </Text>
        <Text style={[styles.value, { color: theme.text }]}>
          {safeCurrent} of {total}
        </Text>
      </View>
      <View style={styles.track}>
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              {
                backgroundColor: index < safeCurrent ? theme.primary : theme.surfaceStrong
              }
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.space.sm
  },
  label: {
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.heavy,
    letterSpacing: 0.7,
    textTransform: 'uppercase'
  },
  value: { fontSize: tokens.type.caption, fontWeight: tokens.weight.black },
  track: { flexDirection: 'row', gap: 6 },
  segment: { height: 5, flex: 1, borderRadius: tokens.radius.pill }
});
