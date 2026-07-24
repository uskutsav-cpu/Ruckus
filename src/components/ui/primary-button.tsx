import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  leadingIcon?: string;
  haptic?: boolean;
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  accessibilityHint,
  accessibilityLabel,
  leadingIcon,
  haptic = true,
  style
}: PrimaryButtonProps) {
  const { theme } = useTheme();
  const isPrimary = variant === 'primary';
  const background =
    variant === 'danger'
      ? theme.danger
      : variant === 'secondary'
        ? theme.surfaceElevated
        : 'transparent';
  const textColor =
    variant === 'danger'
      ? tokens.color.white
      : isPrimary
        ? theme.onPrimary
        : variant === 'ghost'
          ? theme.text
          : theme.text;
  const borderColor =
    variant === 'secondary'
      ? theme.border
      : variant === 'ghost'
        ? 'transparent'
        : background;

  const handlePress = () => {
    if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {leadingIcon ? (
            <Text aria-hidden style={[styles.icon, { color: textColor }]}>
              {leadingIcon}
            </Text>
          ) : null}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </>
      )}
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.pressable,
        {
          borderColor,
          opacity: disabled ? 0.42 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }]
        },
        style
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[tokens.color.ruckus, tokens.color.ruckusPressed]}
          end={{ x: 1, y: 0.8 }}
          style={styles.fill}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.fill, { backgroundColor: background }]}>{content}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: tokens.layout.actionHeight,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: tokens.radius.pill
  },
  fill: {
    minHeight: tokens.layout.actionHeight - 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space.lg,
    paddingVertical: 14
  },
  icon: {
    marginRight: tokens.space.sm,
    fontSize: 18,
    fontWeight: tokens.weight.black
  },
  label: {
    fontSize: 16,
    fontWeight: tokens.weight.black,
    letterSpacing: -0.15
  }
});
