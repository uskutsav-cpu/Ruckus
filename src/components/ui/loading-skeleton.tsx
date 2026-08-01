import { useEffect } from 'react';
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

  useEffect(() => {
    opacity.value = reduceMotion
      ? 0.68
      : withRepeat(withTiming(0.88, { duration: tokens.motion.slow * 2 }), -1, true);
  }, [opacity, reduceMotion]);

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

export function ListCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <LoadingSkeleton key={index} style={styles.listCard} />
      ))}
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
  action: {
    width: 118,
    height: tokens.layout.actionHeight,
    borderRadius: tokens.radius.md
  },
  actionWide: {
    width: 154,
    height: tokens.layout.actionHeight,
    borderRadius: tokens.radius.md
  },
  list: { gap: tokens.space.md },
  listCard: { width: '100%', height: 146, borderRadius: tokens.radius.md }
});
