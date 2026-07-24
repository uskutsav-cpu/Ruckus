import { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { formatDistanceToNowStrict } from 'date-fns';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type MatchCelebrationProps = {
  visible: boolean;
  onClose: () => void;
  activityTitle?: string | undefined;
  memberCount?: number | undefined;
  confirmationDeadline?: string | undefined;
};

export function MatchCelebration({
  visible,
  onClose,
  activityTitle,
  memberCount,
  confirmationDeadline
}: MatchCelebrationProps) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.72);
  const opacity = useSharedValue(0);
  const rise = useSharedValue(reduceMotion ? 0 : 28);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {
        duration: reduceMotion ? tokens.motion.instant : tokens.motion.quick
      });
      scale.value = reduceMotion
        ? 1
        : withDelay(70, withSpring(1, { damping: 11, stiffness: 145 }));
      rise.value = withTiming(0, {
        duration: reduceMotion ? tokens.motion.instant : tokens.motion.slow
      });
    } else {
      opacity.value = 0;
      scale.value = reduceMotion ? 1 : 0.72;
      rise.value = reduceMotion ? 0 : 28;
    }
  }, [opacity, reduceMotion, rise, scale, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: rise.value }, { scale: scale.value }]
  }));
  const deadlineDate = confirmationDeadline ? new Date(confirmationDeadline) : undefined;
  const deadline =
    deadlineDate && !Number.isNaN(deadlineDate.getTime())
      ? `Confirmation deadline ${formatDistanceToNowStrict(deadlineDate, {
          addSuffix: true
        })}`
      : 'Confirm while your spot is held';

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View
        accessibilityViewIsModal
        accessibilityLabel="Group unlocked"
        style={[styles.backdrop, { backgroundColor: theme.overlay }]}
      >
        <View pointerEvents="none" style={styles.confetti}>
          <View
            style={[
              styles.confettiPiece,
              styles.confettiOne,
              { backgroundColor: tokens.color.ruckus }
            ]}
          />
          <View
            style={[
              styles.confettiPiece,
              styles.confettiTwo,
              { backgroundColor: tokens.color.coral }
            ]}
          />
          <View
            style={[
              styles.confettiPiece,
              styles.confettiThree,
              { backgroundColor: tokens.color.violetLight }
            ]}
          />
          <View
            style={[
              styles.confettiPiece,
              styles.confettiFour,
              { backgroundColor: tokens.color.cyan }
            ]}
          />
        </View>
        <Animated.View
          style={[
            styles.modal,
            {
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.border
            },
            tokens.shadow.card,
            animatedStyle
          ]}
        >
          <StatusPill label="GROUP UNLOCKED" icon="⚡" tone="success" />
          <View style={styles.crew}>
            {[0, 1, 2, 3].map((member, index) => (
              <View
                key={member}
                style={[
                  styles.avatar,
                  {
                    backgroundColor:
                      index % 2 === 0 ? theme.accentMuted : theme.surfaceMuted,
                    borderColor: theme.surfaceElevated,
                    marginLeft: index === 0 ? 0 : -10
                  }
                ]}
              >
                <Text style={[styles.avatarText, { color: theme.text }]}>●</Text>
              </View>
            ))}
            {(memberCount ?? 4) > 4 ? (
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: theme.primary,
                    borderColor: theme.surfaceElevated,
                    marginLeft: -10
                  }
                ]}
              >
                <Text style={[styles.avatarText, { color: theme.onPrimary }]}>
                  +{(memberCount ?? 4) - 4}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Your crew is in.</Text>
          <Text style={[styles.activity, { color: theme.accent }]}>
            {activityTitle ?? 'Tonight’s activity'}
          </Text>
          <Text style={[styles.copy, { color: theme.textMuted }]}>
            Enough students joined. Confirm attendance to hold your spot and unlock the
            approved public meeting venue.
          </Text>
          <View style={[styles.deadline, { backgroundColor: theme.surfaceMuted }]}>
            <Text style={[styles.deadlineIcon, { color: theme.text }]}>◷</Text>
            <Text style={[styles.deadlineText, { color: theme.text }]}>{deadline}</Text>
          </View>
          <PrimaryButton
            label="Open my crew"
            leadingIcon="↗"
            onPress={onClose}
            style={styles.button}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.layout.screenPadding
  },
  confetti: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  confettiPiece: {
    position: 'absolute',
    width: 9,
    height: 26,
    borderRadius: tokens.radius.pill
  },
  confettiOne: { top: '18%', left: '13%', transform: [{ rotate: '24deg' }] },
  confettiTwo: { top: '14%', right: '18%', transform: [{ rotate: '-38deg' }] },
  confettiThree: { bottom: '20%', left: '20%', transform: [{ rotate: '54deg' }] },
  confettiFour: { right: '12%', bottom: '24%', transform: [{ rotate: '-18deg' }] },
  modal: {
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.xl
  },
  crew: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: tokens.space.xl
  },
  avatar: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderRadius: tokens.radius.pill
  },
  avatarText: { fontSize: 17, fontWeight: tokens.weight.black },
  title: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.black,
    letterSpacing: -1.1,
    textAlign: 'center'
  },
  activity: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.black,
    textAlign: 'center'
  },
  copy: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.label,
    lineHeight: 21,
    fontWeight: tokens.weight.medium,
    textAlign: 'center'
  },
  deadline: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm,
    marginTop: tokens.space.lg
  },
  deadlineIcon: {
    marginRight: tokens.space.sm,
    fontSize: 16,
    fontWeight: tokens.weight.black
  },
  deadlineText: { fontSize: tokens.type.caption, fontWeight: tokens.weight.black },
  button: { width: '100%', marginTop: tokens.space.md }
});
