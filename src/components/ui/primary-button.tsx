import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { AppIcon } from '@/components/ui/app-icon';
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
  style?: StyleProp<ViewStyle>;
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
          backgroundColor: isPrimary ? theme.primary : background,
          borderColor,
          opacity: disabled ? 0.42 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }]
        },
        style
      ]}
    >
      <View style={styles.fill}>
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <>
            {leadingIcon ? (
              <View style={styles.icon}>
                <AppIcon color={textColor} name={leadingIcon} size={18} />
              </View>
            ) : null}
            <Text style={[styles.label, { color: textColor }]}>{label}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: tokens.layout.actionHeight,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: tokens.radius.sm
  },
  fill: {
    minHeight: tokens.layout.actionHeight - 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space.lg,
    paddingVertical: 12
  },
  icon: {
    marginRight: tokens.space.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.bold
  }
});
