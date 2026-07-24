import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { ScreenHeader } from '@/components/ui/screen-header';
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
        <View style={[styles.mark, { backgroundColor: theme.primary }]}>
          <Text style={[styles.markText, { color: theme.onPrimary }]}>R</Text>
        </View>
        <Text style={[styles.wordmark, { color: theme.text }]}>RUCKUS</Text>
      </View>
      {progress ? (
        <View style={styles.progress}>
          <ProgressIndicator {...progress} />
        </View>
      ) : null}
      <ScreenHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <View
        style={[
          styles.form,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border
          },
          tokens.shadow.floating
        ]}
      >
        {children}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.space.xl
  },
  mark: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm,
    transform: [{ rotate: '-5deg' }]
  },
  markText: {
    fontSize: 21,
    fontWeight: tokens.weight.black,
    letterSpacing: -1
  },
  wordmark: {
    marginLeft: 11,
    fontSize: 17,
    fontWeight: tokens.weight.black,
    letterSpacing: 2.2
  },
  progress: { marginBottom: tokens.space.lg },
  form: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg
  }
});
