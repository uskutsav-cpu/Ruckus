import { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { formatDistanceToNowStrict } from 'date-fns';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

import { AppIcon } from '@/components/ui/app-icon';
import { PrimaryButton } from '@/components/ui/primary-button';
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
  const opacity = useSharedValue(0);
  const rise = useSharedValue(reduceMotion ? 0 : 12);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: reduceMotion ? tokens.motion.instant : tokens.motion.quick
    });
    rise.value = withTiming(visible ? 0 : 12, {
      duration: reduceMotion ? tokens.motion.instant : tokens.motion.standard
    });
  }, [opacity, reduceMotion, rise, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: rise.value }]
  }));
  const deadlineDate = confirmationDeadline ? new Date(confirmationDeadline) : undefined;
  const deadline =
    deadlineDate && !Number.isNaN(deadlineDate.getTime())
      ? `Confirm ${formatDistanceToNowStrict(deadlineDate, { addSuffix: true })}`
      : 'Confirm to hold your place';

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
        accessibilityLabel="Group ready"
        style={[styles.backdrop, { backgroundColor: theme.overlay }]}
      >
        <Animated.View
          style={[
            styles.modal,
            {
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.border
            },
            animatedStyle
          ]}
        >
          <View style={[styles.icon, { backgroundColor: theme.accentMuted }]}>
            <AppIcon color={theme.primary} name="check" size={26} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Your group is ready.</Text>
          <Text style={[styles.activity, { color: theme.text }]}>
            {activityTitle ?? 'Your activity'}
          </Text>
          <Text style={[styles.copy, { color: theme.textMuted }]}>
            Confirm attendance to hold your place and see the approved meeting venue.
          </Text>
          {typeof memberCount === 'number' ? (
            <Text style={[styles.memberCount, { color: theme.textMuted }]}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'} joined
            </Text>
          ) : null}
          <View style={[styles.deadline, { borderColor: theme.border }]}>
            <AppIcon color={theme.textMuted} name="clock" size={17} />
            <Text style={[styles.deadlineText, { color: theme.text }]}>{deadline}</Text>
          </View>
          <PrimaryButton
            label="View group"
            leadingIcon="forward"
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
  modal: {
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.xl
  },
  icon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md
  },
  title: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.bold,
    letterSpacing: -0.7,
    textAlign: 'center'
  },
  activity: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.bold,
    textAlign: 'center'
  },
  copy: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.label,
    lineHeight: 22,
    textAlign: 'center'
  },
  memberCount: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.caption
  },
  deadline: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: tokens.space.lg
  },
  deadlineText: { fontSize: tokens.type.caption, fontWeight: tokens.weight.medium },
  button: { width: '100%', marginTop: tokens.space.md }
});
