import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ActivityCard } from '@/features/activities/activity-card';
import type { Activity, SwipeDirection } from '@/features/activities/activity-types';
import { swipeThresholds } from '@/domain/swipe';

type SwipeCardProps = {
  activity: Activity;
  disabled: boolean;
  onDetails: () => void;
  onSwipe: (direction: SwipeDirection) => void;
};

export function SwipeCard({ activity, disabled, onDetails, onSwipe }: SwipeCardProps) {
  const { width } = useWindowDimensions();
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(8)
    .onUpdate((event) => {
      translationX.value = event.translationX;
      translationY.value = event.translationY * 0.18;
    })
    .onEnd((event) => {
      const clearsDistance = Math.abs(event.translationX) >= swipeThresholds.distance;
      const clearsVelocity = Math.abs(event.velocityX) >= swipeThresholds.velocity;
      if (!clearsDistance && !clearsVelocity) {
        translationX.value = withSpring(0, { damping: 18, stiffness: 190 });
        translationY.value = withSpring(0, { damping: 18, stiffness: 190 });
        return;
      }

      const directionSource = clearsVelocity ? event.velocityX : event.translationX;
      const direction: SwipeDirection = directionSource > 0 ? 'right' : 'left';
      translationX.value = withTiming(
        direction === 'right' ? width * 1.35 : -width * 1.35,
        { duration: 220 },
        (finished) => {
          if (finished) scheduleOnRN(onSwipe, direction);
        }
      );
      translationY.value = withTiming(event.translationY * 0.4, { duration: 220 });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.value },
      { translateY: translationY.value },
      {
        rotate: `${interpolate(
          translationX.value,
          [-width, 0, width],
          [-13, 0, 13],
          Extrapolation.CLAMP
        )}deg`
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
          <Text style={styles.interestedText}>I’M IN</Text>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.stamp, styles.pass, passStyle]}
        >
          <Text style={styles.passText}>PASS</Text>
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
    top: 82,
    borderWidth: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(9,14,26,0.4)'
  },
  interested: { left: 22, borderColor: '#22D3EE' },
  pass: { right: 22, borderColor: '#FF5A6F' },
  interestedText: { color: '#67E8F9', fontSize: 27, fontWeight: '900' },
  passText: { color: '#FDA4AF', fontSize: 27, fontWeight: '900' }
});
