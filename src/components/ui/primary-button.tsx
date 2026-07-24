import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  accessibilityHint?: string;
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  accessibilityHint,
  style
}: PrimaryButtonProps) {
  const { theme } = useTheme();
  const isPrimary = variant === 'primary';
  const background =
    variant === 'danger'
      ? theme.danger
      : variant === 'secondary'
        ? theme.surfaceMuted
        : variant === 'ghost'
          ? 'transparent'
          : theme.primary;
  const textColor =
    isPrimary || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'ghost'
        ? theme.primary
        : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        { opacity: disabled ? 0.45 : pressed ? 0.82 : 1 },
        style
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[tokens.color.violet, '#5B21B6', tokens.color.coral]}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.label, { color: textColor }]}>{label}</Text>
          )}
        </LinearGradient>
      ) : (
        <Text
          style={[
            styles.fill,
            styles.label,
            { backgroundColor: background, color: textColor }
          ]}
        >
          {loading ? 'Working…' : label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: 54,
    overflow: 'hidden',
    borderRadius: tokens.radius.md
  },
  fill: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md
  },
  label: { fontSize: 16, fontWeight: '800', overflow: 'hidden' }
});
