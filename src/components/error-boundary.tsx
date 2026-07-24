import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { logger } from '@/lib/logger';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  public override state: State = { error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('ui.error_boundary', {
      message: error.message,
      componentStack: info.componentStack
    });
  }

  public override render() {
    if (!this.state.error) return this.props.children;

    return <ErrorFallback onRetry={() => this.setState({ error: null })} />;
  }
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { theme } = useTheme();

  return (
    <AppScreen scroll={false}>
      <View accessibilityRole="alert" style={styles.container}>
        <StatusPill label="APP RECOVERY" tone="warning" />
        <View style={[styles.mark, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.markText, { color: theme.text }]}>↻</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          Ruckus hit a rough patch.
        </Text>
        <Text style={[styles.message, { color: theme.textMuted }]}>
          Your account data remains protected. Retry this screen; if the problem
          continues, restart the app.
        </Text>
        <PrimaryButton label="Try again" onPress={onRetry} style={styles.button} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mark: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.lg,
    marginTop: tokens.space.lg
  },
  markText: { fontSize: 40, fontWeight: tokens.weight.black },
  title: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.black,
    textAlign: 'center'
  },
  message: {
    maxWidth: 350,
    marginTop: tokens.space.sm,
    fontSize: tokens.type.label,
    lineHeight: 22,
    fontWeight: tokens.weight.medium,
    textAlign: 'center'
  },
  button: { minWidth: 220, marginTop: tokens.space.xl }
});
