import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export function DemoModeBanner() {
  const { theme } = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: theme.accentMuted }]}
    >
      <Text style={[styles.label, { color: theme.accent }]}>DEMO PREVIEW</Text>
      <Text numberOfLines={2} style={[styles.copy, { color: theme.text }]}>
        No real matches, messages, attendance, XP, or account changes.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.layout.screenPadding,
    paddingVertical: 7
  },
  label: {
    marginRight: tokens.space.sm,
    fontSize: 9,
    fontWeight: tokens.weight.black,
    letterSpacing: 1
  },
  copy: {
    flexShrink: 1,
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.heavy
  }
});
