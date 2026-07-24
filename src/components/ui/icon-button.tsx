import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type IconButtonProps = {
  icon: string;
  accessibilityLabel: string;
  onPress: () => void;
  tone?: 'default' | 'light' | 'dark';
  style?: ViewStyle;
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  tone = 'default',
  style
}: IconButtonProps) {
  const { theme } = useTheme();
  const isDarkTone = tone === 'dark';
  const isLightTone = tone === 'light';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDarkTone
            ? 'rgba(9,10,13,0.72)'
            : isLightTone
              ? 'rgba(255,255,255,0.88)'
              : theme.surfaceElevated,
          borderColor: isDarkTone ? 'rgba(255,255,255,0.18)' : theme.border,
          opacity: pressed ? 0.72 : 1
        },
        tokens.shadow.floating,
        style
      ]}
    >
      <Text
        style={[
          styles.icon,
          { color: isDarkTone ? tokens.color.white : tokens.color.ink }
        ]}
      >
        {icon}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.pill
  },
  icon: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: tokens.weight.black
  }
});
