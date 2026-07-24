import { useCallback } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ActivityCard } from '@/features/activities/activity-card';
import type { Activity, SwipeDirection } from '@/features/activities/activity-types';
import { swipeThresholds } from '@/domain/swipe';
import { tokens } from '@/theme/tokens';

type SwipeCardProps = {
  activity: Activity;
  disabled: boolean;
  onDetails: () => void;
  onSwipe: (direction: SwipeDirection) => void;
};

export function SwipeCard({ activity, disabled, onDetails, onSwipe }: SwipeCardProps) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const thresholdCrossed = useSharedValue(false);
  const triggerThresholdHaptic = useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(8)
    .onUpdate((event) => {
      translationX.value = event.translationX;
      translationY.value = event.translationY * (reduceMotion ? 0.08 : 0.18);
      const crossed = Math.abs(event.translationX) >= swipeThresholds.distance * 0.82;
      if (crossed && !thresholdCrossed.value) {
        thresholdCrossed.value = true;
        scheduleOnRN(triggerThresholdHaptic);
      } else if (!crossed && thresholdCrossed.value) {
        thresholdCrossed.value = false;
      }
    })
    .onEnd((event) => {
      const clearsDistance = Math.abs(event.translationX) >= swipeThresholds.distance;
      const clearsVelocity = Math.abs(event.velocityX) >= swipeThresholds.velocity;
      if (!clearsDistance && !clearsVelocity) {
        thresholdCrossed.value = false;
        translationX.value = withSpring(0, { damping: 18, stiffness: 190 });
        translationY.value = withSpring(0, { damping: 18, stiffness: 190 });
        return;
      }

      const directionSource = clearsVelocity ? event.velocityX : event.translationX;
      const direction: SwipeDirection = directionSource > 0 ? 'right' : 'left';
      translationX.value = withTiming(
        direction === 'right' ? width * 1.35 : -width * 1.35,
        { duration: reduceMotion ? tokens.motion.instant : 220 },
        (finished) => {
          if (finished) scheduleOnRN(onSwipe, direction);
        }
      );
      translationY.value = withTiming(event.translationY * 0.4, {
        duration: reduceMotion ? tokens.motion.instant : 220
      });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.value },
      { translateY: translationY.value },
      {
        rotate: `${interpolate(
          translationX.value,
          [-width, 0, width],
          reduceMotion ? [0, 0, 0] : [-12, 0, 12],
          Extrapolation.CLAMP
        )}deg`
      },
      {
        scale: interpolate(
          Math.abs(translationX.value),
          [0, width],
          [1, reduceMotion ? 1 : 0.97],
          Extrapolation.CLAMP
        )
      }
    ]
  }));

  const interestedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translationX.value,
      [0, width * 0.28],
      [0, 1],
      Extrapolation.CLAMP
    ),
    transform: [{ rotate: '-8deg' }]
  }));
  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translationX.value,
      [-width * 0.28, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
    transform: [{ rotate: '8deg' }]
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        <ActivityCard activity={activity} onDetails={onDetails} />
        <Animated.View
          pointerEvents="none"
          style={[styles.stamp, styles.interested, interestedStyle]}
        >
          <Text style={styles.interestedText}>Join</Text>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.stamp, styles.pass, passStyle]}
        >
          <Text style={styles.passText}>Pass</Text>
        </Animated.View>
        {disabled ? <View style={StyleSheet.absoluteFill} /> : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  stamp: {
    position: 'absolute',
    top: 84,
    borderWidth: 2,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: 'rgba(9,10,13,0.58)'
  },
  interested: { left: 22, borderColor: '#8DD7C5' },
  pass: { right: 22, borderColor: tokens.color.coral },
  interestedText: {
    color: '#C8EEE5',
    fontSize: 23,
    fontWeight: tokens.weight.bold
  },
  passText: {
    color: '#FFAAA7',
    fontSize: 23,
    fontWeight: tokens.weight.bold
  }
});
