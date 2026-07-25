import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { ScreenHeader } from '@/components/ui/screen-header';
import { env } from '@/lib/env';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type AuthScaffoldProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
  footer?: ReactNode;
  progress?: { current: number; total: number; label?: string };
}>;

export function AuthScaffold({
  eyebrow,
  title,
  subtitle,
  footer,
  progress,
  children
}: AuthScaffoldProps) {
  const { theme } = useTheme();

  return (
    <AppScreen footer={footer}>
      <View style={styles.brand}>
        <View style={[styles.mark, { backgroundColor: tokens.color.ruckus }]}>
          <Text style={styles.markText}>R</Text>
        </View>
        <Text style={[styles.wordmark, { color: theme.text }]}>RUCKUS</Text>
        {env.appEnvironment === 'staging' ? (
          <View style={[styles.stagingBadge, { borderColor: theme.border }]}>
            <Text style={[styles.stagingBadgeText, { color: theme.textMuted }]}>
              STAGING
            </Text>
          </View>
        ) : null}
      </View>
      {progress ? (
        <View style={styles.progress}>
          <ProgressIndicator {...progress} />
        </View>
      ) : null}
      <ScreenHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <View style={styles.form}>{children}</View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.space.xxl
  },
  mark: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm
  },
  markText: {
    fontSize: 21,
    color: tokens.color.ink,
    fontWeight: tokens.weight.bold,
    letterSpacing: -1
  },
  wordmark: {
    marginLeft: 11,
    fontSize: 17,
    fontWeight: tokens.weight.bold,
    letterSpacing: 1.5
  },
  stagingBadge: {
    marginLeft: tokens.space.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.pill
  },
  stagingBadgeText: {
    fontSize: 9,
    fontWeight: tokens.weight.bold,
    letterSpacing: 1
  },
  progress: { marginBottom: tokens.space.lg },
  form: { paddingBottom: tokens.space.lg }
});
