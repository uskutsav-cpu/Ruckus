import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export function LoadingScreen({ label = 'Loading Campus Clash…' }: { label?: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: tokens.space.md, fontSize: 15, fontWeight: '700' }
});
