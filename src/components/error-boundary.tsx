import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { logger } from '@/lib/logger';
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

    return (
      <View style={styles.container} accessibilityRole="alert">
        <Text style={styles.emoji}>🛟</Text>
        <Text style={styles.title}>We hit a rough patch</Text>
        <Text style={styles.message}>
          Your account is safe. Try reloading this screen.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => this.setState({ error: null })}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space.xl,
    backgroundColor: '#111827'
  },
  emoji: { fontSize: 52, marginBottom: tokens.space.md },
  title: {
    color: '#FFFFFF',
    fontSize: tokens.type.title,
    fontWeight: '800',
    textAlign: 'center'
  },
  message: {
    color: '#CBD5E1',
    fontSize: tokens.type.body,
    textAlign: 'center',
    marginVertical: tokens.space.md
  },
  button: {
    minHeight: tokens.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.violet
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' }
});
