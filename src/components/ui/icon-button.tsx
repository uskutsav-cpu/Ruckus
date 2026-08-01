import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

import { AppIcon } from '@/components/ui/app-icon';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type IconButtonProps = {
  icon: string;
  accessibilityLabel: string;
  onPress: () => void;
  tone?: 'default' | 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
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
        style
      ]}
    >
      <AppIcon
        color={isDarkTone ? tokens.color.white : theme.text}
        name={icon}
        size={20}
      />
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
  }
});
