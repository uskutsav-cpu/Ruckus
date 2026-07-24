import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type LoadingSkeletonProps = {
  style?: ViewStyle;
};

export function LoadingSkeleton({ style }: LoadingSkeletonProps) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 0.68 : 0.45);

  if (!reduceMotion) {
    opacity.value = withRepeat(
      withTiming(0.88, { duration: tokens.motion.slow * 2 }),
      -1,
      true
    );
  }

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityLabel="Loading"
      style={[styles.skeleton, { backgroundColor: theme.skeleton }, animatedStyle, style]}
    />
  );
}

export function ActivityCardSkeleton() {
  return (
    <View style={styles.cardGroup}>
      <LoadingSkeleton style={styles.card} />
      <View style={styles.actions}>
        <LoadingSkeleton style={styles.action} />
        <LoadingSkeleton style={styles.actionWide} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { overflow: 'hidden', borderRadius: tokens.radius.md },
  cardGroup: { flex: 1 },
  card: { flex: 1, minHeight: 420, borderRadius: tokens.radius.xl },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.space.md,
    marginTop: tokens.space.lg
  },
  action: { width: 118, height: tokens.layout.actionHeight, borderRadius: 999 },
  actionWide: { width: 154, height: tokens.layout.actionHeight, borderRadius: 999 }
});
