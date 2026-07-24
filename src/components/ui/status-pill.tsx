import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
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
        ? { background: theme.accentMuted, foreground: theme.success }
        : tone === 'warning'
          ? { background: tokens.color.coralSoft, foreground: theme.warning }
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
        <View style={styles.icon}>
          <AppIcon color={palette.foreground} name={icon} size={13} />
        </View>
      ) : null}
      <Text style={[styles.label, { color: palette.foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  icon: {
    marginRight: 6
  },
  label: {
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.medium
  }
});
