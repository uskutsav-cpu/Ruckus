import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusPill } from '@/components/ui/status-pill';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type BackendConfigurationScreenProps = {
  message: string;
};

export function BackendConfigurationScreen({ message }: BackendConfigurationScreenProps) {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View
        accessibilityRole="alert"
        style={[
          styles.panel,
          { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
          tokens.shadow.card
        ]}
      >
        <StatusPill label="DEVELOPMENT SETUP" tone="warning" />
        <Text style={[styles.title, { color: theme.text }]}>
          Ruckus needs valid backend settings.
        </Text>
        <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
        <View style={[styles.help, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.helpTitle, { color: theme.text }]}>
            Fix the local environment
          </Text>
          <Text selectable style={[styles.variable, { color: theme.accent }]}>
            EXPO_PUBLIC_SUPABASE_URL
          </Text>
          <Text selectable style={[styles.variable, { color: theme.accent }]}>
            EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          </Text>
          <Text style={[styles.helpBody, { color: theme.textMuted }]}>
            Configure both values, or remove both to use intentional local demo mode.
            Restart Expo after changing environment variables.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.layout.screenPadding
  },
  panel: {
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.xl
  },
  title: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.black,
    letterSpacing: -1
  },
  message: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body,
    fontWeight: tokens.weight.medium
  },
  help: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginTop: tokens.space.lg
  },
  helpTitle: {
    marginBottom: tokens.space.sm,
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.black
  },
  variable: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.black
  },
  helpBody: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  }
});
