import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function ReportResultScreen() {
  const params = useLocalSearchParams<{
    blocked?: string;
    blockFailed?: string;
    demo?: string;
  }>();
  const isDemo = params.demo === 'true';
  const blocked = params.blocked === 'true';
  const blockFailed = params.blockFailed === 'true';
  const { theme } = useTheme();

  return (
    <AppScreen scroll={false}>
      <View style={styles.content}>
        <StatusPill
          label={isDemo ? 'DEMO RESULT · NOT SENT' : 'PRIVATE REPORT'}
          tone={isDemo ? 'accent' : 'success'}
        />
        <View
          style={[
            styles.mark,
            {
              backgroundColor: isDemo ? theme.accentMuted : tokens.color.ruckusSoft
            }
          ]}
        >
          <Text
            style={[styles.markText, { color: isDemo ? theme.accent : theme.success }]}
          >
            {isDemo ? 'i' : '✓'}
          </Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          {isDemo ? 'Report preview complete' : 'Report received'}
        </Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>
          {isDemo
            ? 'No report was sent and no student was blocked. Connected mode sends reports only to authorized campus reviewers.'
            : 'Authorized campus reviewers can now assess the private report. It cannot be edited from the app.'}
        </Text>
        {blocked ? (
          <InlineNotice message="This student is blocked. Shared active crews and future matching access were removed." />
        ) : null}
        {blockFailed ? (
          <InlineNotice
            tone="error"
            message="The report was received, but blocking did not finish. Return to the student’s crew and retry the block action."
          />
        ) : null}
        <PrimaryButton
          label="Return to crews"
          onPress={() => router.replace('/groups')}
          style={styles.button}
        />
        <PrimaryButton
          label="Open safety center"
          variant="secondary"
          onPress={() => router.replace('/safety')}
          style={styles.secondary}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 43,
    marginTop: tokens.space.lg
  },
  markText: { fontSize: 48, fontWeight: tokens.weight.black },
  title: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.black,
    textAlign: 'center'
  },
  copy: {
    maxWidth: 350,
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.lg,
    fontSize: tokens.type.label,
    lineHeight: 22,
    fontWeight: tokens.weight.medium,
    textAlign: 'center'
  },
  button: { minWidth: 240, marginTop: tokens.space.md },
  secondary: { minWidth: 240, marginTop: tokens.space.sm }
});
