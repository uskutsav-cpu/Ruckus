import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function AccountDeletionConfirmedScreen() {
  const { theme } = useTheme();

  return (
    <AppScreen scroll={false}>
      <View style={styles.content}>
        <StatusPill label="Deletion scheduled" tone="warning" />
        <View
          style={[
            styles.mark,
            { backgroundColor: tokens.color.coralSoft, borderColor: tokens.color.coral }
          ]}
        >
          <Text style={styles.markLabel}>Purge window</Text>
          <Text style={styles.markText}>7 days</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          Your request is verified
        </Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>
          You were signed out immediately. Social participation and push tokens are
          disabled, and the trusted purge is scheduled after the seven-day window.
        </Text>
        <InlineNotice message="If this was a mistake, use the verified campus support channel before the window ends. No support contact is configured in this build." />
        <PrimaryButton
          label="Done"
          onPress={() => router.replace('/welcome')}
          style={styles.button}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: {
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginTop: tokens.space.lg
  },
  markText: {
    color: '#7C2421',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: tokens.weight.bold
  },
  markLabel: {
    color: '#7C2421',
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.medium
  },
  title: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.bold,
    textAlign: 'center'
  },
  copy: {
    maxWidth: 370,
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.lg,
    fontSize: tokens.type.label,
    lineHeight: 22,
    fontWeight: tokens.weight.medium,
    textAlign: 'center'
  },
  button: { minWidth: 240, marginTop: tokens.space.md }
});
