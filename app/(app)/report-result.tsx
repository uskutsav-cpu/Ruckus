import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function ReportResultScreen() {
  const { blocked } = useLocalSearchParams<{ blocked?: string }>();
  const { theme } = useTheme();
  return (
    <AppScreen scroll={false}>
      <View style={styles.content}>
        <Text style={styles.icon}>🛡️</Text>
        <Text style={[styles.title, { color: theme.text }]}>Report received</Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>
          The authorized campus team can now review it. Your report is private and cannot
          be edited from the app.
        </Text>
        {blocked === 'true' ? (
          <Text style={[styles.blocked, { color: theme.success }]}>
            ✓ This person is also blocked
          </Text>
        ) : null}
        <PrimaryButton
          label="Return to groups"
          onPress={() => router.replace('/groups')}
          style={styles.button}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 72 },
  title: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.title,
    fontWeight: '900'
  },
  copy: {
    maxWidth: 340,
    marginTop: tokens.space.sm,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  },
  blocked: { marginTop: tokens.space.lg, fontSize: 14, fontWeight: '900' },
  button: { minWidth: 220, marginTop: tokens.space.xl }
});
