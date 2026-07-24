import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type MatchCelebrationProps = {
  visible: boolean;
  onClose: () => void;
};

export function MatchCelebration({ visible, onClose }: MatchCelebrationProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 180 });
      scale.value = withDelay(80, withSpring(1, { damping: 10, stiffness: 150 }));
    } else {
      opacity.value = 0;
      scale.value = 0.5;
    }
  }, [opacity, scale, visible]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  if (!visible) return null;

  return (
    <View style={styles.backdrop} accessibilityViewIsModal>
      <Animated.View style={[styles.modal, { backgroundColor: theme.surface }, style]}>
        <Text style={styles.icon}>🎉</Text>
        <Text style={[styles.title, { color: theme.text }]}>Crew assembled!</Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>
          A group hit the minimum. Confirm before the countdown ends to unlock your public
          meeting spot.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.button, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.buttonText}>View my crew</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space.lg,
    backgroundColor: 'rgba(9,14,26,0.82)'
  },
  modal: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderRadius: 28,
    padding: tokens.space.xl
  },
  icon: { fontSize: 64 },
  title: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.title,
    fontWeight: '900',
    textAlign: 'center'
  },
  copy: {
    marginTop: tokens.space.sm,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  },
  button: {
    minHeight: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
    marginTop: tokens.space.lg
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }
});
