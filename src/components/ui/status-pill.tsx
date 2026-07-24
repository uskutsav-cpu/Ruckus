import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type StatusPillProps = {
  label: string;
  icon?: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'dark';
  style?: ViewStyle;
};

export function StatusPill({ label, icon, tone = 'neutral', style }: StatusPillProps) {
  const { theme } = useTheme();
  const palette =
    tone === 'accent'
      ? { background: theme.accentMuted, foreground: theme.accent }
      : tone === 'success'
        ? { background: tokens.color.ruckusSoft, foreground: '#335400' }
        : tone === 'warning'
          ? { background: tokens.color.coralSoft, foreground: '#8B2522' }
          : tone === 'dark'
            ? {
                background: 'rgba(9,10,13,0.72)',
                foreground: tokens.color.white
              }
            : { background: theme.surfaceMuted, foreground: theme.text };

  return (
    <View
      style={[styles.pill, { backgroundColor: palette.background }, style]}
      accessibilityLabel={label}
    >
      {icon ? (
        <Text aria-hidden style={[styles.icon, { color: palette.foreground }]}>
          {icon}
        </Text>
      ) : null}
      <Text style={[styles.label, { color: palette.foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  icon: {
    marginRight: 6,
    fontSize: 12,
    fontWeight: tokens.weight.black
  },
  label: {
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.black,
    letterSpacing: 0.1
  }
});
